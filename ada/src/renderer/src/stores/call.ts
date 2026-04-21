import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import type { CallInfo } from '../../../shared/types'
import type { SipClient } from '../../../core/sip/SipClient'
import type { CallSession } from '../../../core/sip/CallSession'
import { triggerScreenPop } from '../../../core/crm/ScreenPop'
import { useSettingsStore } from './settings'

/**
 * Call store — single active call (Phase 2). Phase 3 will allow a parked call
 * + an active call concurrently for consult-transfer.
 */
export const useCallStore = defineStore('call', () => {
  const activeCall = ref<CallInfo | null>(null)
  const activeSession = shallowRef<CallSession | null>(null)
  const isMuted = ref(false)
  const isHeld = ref(false)
  const remoteAudio = shallowRef<HTMLAudioElement | null>(null)
  const sipClient = shallowRef<SipClient | null>(null)

  const isInCall = computed(() => activeCall.value !== null)
  const isRinging = computed(() => activeCall.value?.state === 'ringing')

  /**
   * Wire this store to the active SipClient. Called from agent store after
   * connect succeeds.
   */
  function bindSipClient(client: SipClient): void {
    sipClient.value = client

    client.on((ev) => {
      if (ev.type === 'incoming-call') {
        const session = client.getSession(ev.payload.callId)
        if (session) {
          attachSession(session)
          // Fire Screen Pop based on settings.
          const settings = useSettingsStore()
          void triggerScreenPop(settings.state.screenPop, {
            caller: ev.payload.remoteNumber,
            callId: ev.payload.callId,
            direction: 'inbound'
          })
        }
      }
      if (ev.type === 'call-ended') {
        if (activeCall.value?.id === ev.callId) {
          clearActive()
        }
      }
    })
  }

  function attachSession(session: CallSession): void {
    activeSession.value = session
    activeCall.value = { ...session.info }
    isMuted.value = false
    isHeld.value = false

    if (remoteAudio.value) {
      session.setRemoteAudioElement(remoteAudio.value)
    }

    // Re-emit info on each state change so the UI re-renders.
    const dispose = session.onTerminated(() => {
      if (activeCall.value?.id === session.info.id) {
        clearActive()
      }
      dispose()
    })

    // Poll session info into the store (cheap; updates duration label).
    const interval = window.setInterval(() => {
      if (!activeSession.value || activeSession.value !== session) {
        window.clearInterval(interval)
        return
      }
      activeCall.value = { ...session.info }
    }, 1000)
  }

  function clearActive(): void {
    activeSession.value = null
    activeCall.value = null
    isMuted.value = false
    isHeld.value = false
  }

  function setRemoteAudioElement(el: HTMLAudioElement | null): void {
    remoteAudio.value = el
    if (activeSession.value) {
      activeSession.value.setRemoteAudioElement(el)
    }
  }

  async function dial(number: string): Promise<void> {
    if (!sipClient.value) {
      throw new Error('尚未連線到 3CX')
    }
    if (activeSession.value) {
      throw new Error('已有通話中的電話')
    }

    const settings = useSettingsStore()
    const session = await sipClient.value.call(number)
    attachSession(session)

    void triggerScreenPop(settings.state.screenPop, {
      caller: number,
      callId: session.info.id,
      direction: 'outbound'
    })
  }

  async function answer(): Promise<void> {
    if (!activeSession.value) return
    await activeSession.value.answer()
  }

  async function reject(): Promise<void> {
    if (!activeSession.value) return
    await activeSession.value.reject()
  }

  async function hangup(): Promise<void> {
    if (!activeSession.value) {
      clearActive()
      return
    }
    try {
      await activeSession.value.hangup()
    } finally {
      clearActive()
    }
  }

  function toggleMute(): void {
    if (!activeSession.value) return
    const next = !isMuted.value
    activeSession.value.setMuted(next)
    isMuted.value = next
  }

  async function toggleHold(): Promise<void> {
    if (!activeSession.value) return
    const next = !isHeld.value
    await activeSession.value.setHold(next)
    isHeld.value = next
  }

  async function sendDtmf(tone: string): Promise<void> {
    if (!activeSession.value) return
    await activeSession.value.sendDtmf(tone)
  }

  return {
    activeCall,
    activeSession,
    isMuted,
    isHeld,
    isInCall,
    isRinging,
    bindSipClient,
    setRemoteAudioElement,
    dial,
    answer,
    reject,
    hangup,
    toggleMute,
    toggleHold,
    sendDtmf
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCallStore, import.meta.hot))
}
