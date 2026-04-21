import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { triggerScreenPop } from '../../../core/crm/ScreenPop'
import { useSettingsStore } from './settings'

export type WebClientEvent =
  | { type: 'ready' }
  | { type: 'title'; title: string }
  | { type: 'url'; url: string }
  | { type: 'console'; level: 'log' | 'warn' | 'error'; args: unknown[] }
  | {
      type: 'call'
      subtype: 'started' | 'ended' | 'incoming' | 'outgoing'
      data: { remoteNumber?: string; remoteName?: string; raw?: string }
    }

export interface LoggedEvent {
  at: number
  event: WebClientEvent
}

const MAX_EVENTS = 200

/**
 * Collects events emitted by the webview-preload script running inside the
 * embedded 3CX Web Client. Keeps a rolling log (latest {MAX_EVENTS}) for
 * the debug panel and dispatches call events to Screen Pop.
 */
export const useWebclientStore = defineStore('webclient', () => {
  const events = ref<LoggedEvent[]>([])
  const currentTitle = ref<string>('')
  const currentUrl = ref<string>('')
  const callState = ref<'idle' | 'incoming' | 'active'>('idle')
  const lastCaller = ref<string>('')
  const debugPanelOpen = ref(false)

  const ringing = computed(() => callState.value === 'incoming')
  const onCall = computed(() => callState.value === 'active')

  function ingest(event: WebClientEvent): void {
    events.value.unshift({ at: Date.now(), event })
    if (events.value.length > MAX_EVENTS) {
      events.value.length = MAX_EVENTS
    }

    switch (event.type) {
      case 'title':
        currentTitle.value = event.title
        break
      case 'url':
        currentUrl.value = event.url
        break
      case 'call':
        handleCallEvent(event)
        break
    }
  }

  function handleCallEvent(
    event: Extract<WebClientEvent, { type: 'call' }>
  ): void {
    const number = event.data.remoteNumber ?? ''
    const prev = callState.value

    switch (event.subtype) {
      case 'incoming':
        callState.value = 'incoming'
        lastCaller.value = number
        firePop(number, 'inbound')
        break

      case 'outgoing':
        // Preload currently doesn't emit this, but support it for future use.
        callState.value = 'active'
        lastCaller.value = number
        firePop(number, 'outbound')
        break

      case 'started':
        // 'started' fires whenever the call UI fingerprint appears.
        // Two scenarios:
        //  1) prev = 'idle'     → outbound call just went active → Screen Pop
        //  2) prev = 'incoming' → inbound was answered → Screen Pop already
        //                         fired at the 'incoming' event, do NOT re-pop
        callState.value = 'active'
        if (number) lastCaller.value = number
        if (prev === 'idle' && number) {
          firePop(number, 'outbound')
        }
        break

      case 'ended':
        callState.value = 'idle'
        break
    }
  }

  function firePop(
    caller: string,
    direction: 'inbound' | 'outbound'
  ): void {
    console.log('[webclient] firePop called', { caller, direction })
    if (!caller) {
      console.warn('[webclient] firePop: no caller, skipping')
      return
    }
    const settings = useSettingsStore()
    console.log(
      '[webclient] firePop: screenPop config =',
      JSON.stringify(settings.state.screenPop)
    )
    void triggerScreenPop(settings.state.screenPop, {
      caller,
      callId: `${Date.now()}`,
      direction
    }).catch((err) => {
      console.error('[webclient] triggerScreenPop failed', err)
    })
  }

  function clear(): void {
    events.value = []
  }

  function toggleDebugPanel(): void {
    debugPanelOpen.value = !debugPanelOpen.value
  }

  return {
    events,
    currentTitle,
    currentUrl,
    callState,
    lastCaller,
    debugPanelOpen,
    ringing,
    onCall,
    ingest,
    clear,
    toggleDebugPanel
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWebclientStore, import.meta.hot))
}
