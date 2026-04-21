export interface XapiConfig {
  pbxFqdn: string
  clientId: string
  clientSecret: string
  /** Optional: override the token endpoint (defaults to /connect/token). */
  tokenEndpoint?: string
  /** Optional: override the Call Control WebSocket URL. */
  callControlWsUrl?: string
}

export interface XapiToken {
  accessToken: string
  tokenType: string
  expiresAt: number // epoch ms
}

export type XapiEvent =
  | { type: 'call-started'; callId: string; caller: string; callee: string }
  | { type: 'call-ended'; callId: string; duration: number }
  | { type: 'status-changed'; extension: string; status: string }
