import type { CallDirection } from '../../shared/types'

export interface SipConfig {
  /** e.g. engsound.3cx.com.tw */
  pbxFqdn: string
  /** The user-facing extension number — used as the user part of the SIP URI */
  extension: string
  /**
   * SIP Authentication Username (Auth ID). In 3CX V20 this is a random string
   * like `ljMwt7jz4s`, NOT the extension number. Found in:
   * Admin Console → Users → edit user → IP Phone tab → Auth ID
   */
  authId: string
  /** SIP Authentication password — caller fetches from OS keychain */
  password: string
  /** Optional override for WSS port; default 443 */
  wssPort?: number
  /** Optional display name */
  displayName?: string
  /**
   * Full WSS URI override. When set, SipClient uses this URL verbatim
   * (including query string) and ignores pbxFqdn/wssPort for WS transport.
   *
   * Required for 3CX V20 which uses session-based auth via query params
   * (sessionId, pass). Phase 2.2 will generate this automatically via
   * the 3CX login API; Phase 2.1 requires the user to paste it from
   * their browser DevTools.
   */
  wsUri?: string
}

export interface IncomingInvitePayload {
  callId: string
  remoteNumber: string
  remoteDisplayName?: string
  direction: CallDirection
}

export type SipClientEvent =
  | { type: 'registered' }
  | { type: 'registration-failed'; reason: string }
  | { type: 'unregistered' }
  | { type: 'incoming-call'; payload: IncomingInvitePayload }
  | { type: 'call-ended'; callId: string; reason?: string }
