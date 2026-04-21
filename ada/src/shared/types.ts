/**
 * Shared domain types used across Main, Preload, Renderer and core/.
 */

/** SIP registration state. */
export type RegistrationState =
  | 'unregistered'
  | 'registering'
  | 'registered'
  | 'failed'

/** High-level call state (derived from SIP.js Session states). */
export type CallState =
  | 'idle'
  | 'calling' // outbound, before answer
  | 'ringing' // inbound, before we answer
  | 'connecting' // media negotiating
  | 'connected'
  | 'held'
  | 'ended'

/** Call direction. */
export type CallDirection = 'inbound' | 'outbound'

export interface CallInfo {
  id: string
  direction: CallDirection
  remoteNumber: string
  remoteDisplayName?: string
  startedAt: number
  answeredAt?: number
  endedAt?: number
  state: CallState
}

/** 3CX agent status (mirrors 3CX presence values). */
export type AgentStatus =
  | 'Available'
  | 'Away'
  | 'DoNotDisturb'
  | 'Lunch'
  | 'BusinessTrip'
  | 'Custom1'
  | 'Custom2'

/** 3CX account / connection profile, stored in settings. */
export interface ThreeCxProfile {
  pbxFqdn: string // e.g. engsound.3cx.com.tw
  extension: string
  /**
   * SIP Authentication ID. In 3CX V20 this is a random string (found in
   * Admin Console → Users → IP Phone tab → Auth ID), not the extension number.
   */
  authId: string
  displayName?: string
  /**
   * Optional full WSS URL override. Needed only if the default
   * wss://{pbxFqdn}/ws path is blocked or the PBX uses a non-standard path.
   */
  wsUri?: string
  // Password is kept in OS keychain, not here.
}

/** Screen Pop URL template (e.g. "https://crm/?phone={caller}"). */
export interface ScreenPopConfig {
  enabled: boolean
  urlTemplate: string
  // Which call direction(s) trigger the pop.
  triggerOn: ('inbound' | 'outbound')[]
}

/** Top-level settings schema (serialised to electron-store). */
export interface AppSettings {
  profile: ThreeCxProfile | null
  screenPop: ScreenPopConfig
  audio: {
    inputDeviceId?: string
    outputDeviceId?: string
    ringerDeviceId?: string
  }
  ui: {
    theme: 'light' | 'dark' | 'system'
    alwaysOnTop: boolean
  }
}

export const defaultSettings: AppSettings = {
  profile: null,
  screenPop: {
    enabled: false,
    urlTemplate: '',
    triggerOn: ['inbound', 'outbound']
  },
  audio: {},
  ui: {
    theme: 'system',
    alwaysOnTop: false
  }
}
