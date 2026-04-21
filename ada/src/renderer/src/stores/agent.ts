import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  AgentStatus,
  RegistrationState,
  ThreeCxProfile
} from '../../../shared/types'
import {
  destroySipClient,
  recreateSipClient
} from '../composables/useSipClient'
import { useCallStore } from './call'

/**
 * Agent store — owns registration lifecycle + presence.
 *
 * Phase 2: registrationState is fed by SipClient events.
 * Phase 4: status/Ready will also push to 3CX XAPI.
 */
export const useAgentStore = defineStore('agent', () => {
  const registrationState = ref<RegistrationState>('unregistered')
  const status = ref<AgentStatus>('Available')
  const profile = ref<ThreeCxProfile | null>(null)
  const lastError = ref<string | null>(null)

  const isReady = computed(() => status.value === 'Available')
  const isRegistered = computed(
    () => registrationState.value === 'registered'
  )

  function toggleReady(): void {
    status.value = isReady.value ? 'Away' : 'Available'
    // Phase 4: push to XAPI
  }

  function setProfile(p: ThreeCxProfile | null): void {
    profile.value = p
  }

  /**
   * Build a fresh SipClient for the given profile + password and start it.
   * Returns true if WSS started OK; registration result follows asynchronously.
   */
  async function connect(password: string): Promise<boolean> {
    if (!profile.value) {
      lastError.value = '尚未設定分機'
      return false
    }
    lastError.value = null
    registrationState.value = 'registering'

    const sip = await recreateSipClient({
      pbxFqdn: profile.value.pbxFqdn,
      extension: profile.value.extension,
      authId: profile.value.authId,
      password,
      displayName: profile.value.displayName,
      wsUri: profile.value.wsUri
    })

    const callStore = useCallStore()
    callStore.bindSipClient(sip)

    sip.on((ev) => {
      switch (ev.type) {
        case 'registered':
          registrationState.value = 'registered'
          break
        case 'unregistered':
          registrationState.value = 'unregistered'
          break
        case 'registration-failed':
          registrationState.value = 'failed'
          lastError.value = ev.reason
          break
        case 'incoming-call':
          // Delegated to call store — see bindSipClient.
          break
        case 'call-ended':
          break
      }
    })

    try {
      await sip.connect()
      return true
    } catch (err) {
      registrationState.value = 'failed'
      lastError.value = err instanceof Error ? err.message : String(err)
      return false
    }
  }

  async function disconnect(): Promise<void> {
    await destroySipClient()
    registrationState.value = 'unregistered'
  }

  return {
    registrationState,
    status,
    profile,
    lastError,
    isReady,
    isRegistered,
    toggleReady,
    setProfile,
    connect,
    disconnect
  }
})
