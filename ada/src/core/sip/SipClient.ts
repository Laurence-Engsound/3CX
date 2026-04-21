import {
  Invitation,
  Inviter,
  Registerer,
  RegistererState,
  SessionState,
  UserAgent,
  UserAgentOptions
} from 'sip.js'
import type { CallDirection } from '../../shared/types'
import type { SipConfig, SipClientEvent } from './types'
import { CallSession } from './CallSession'

/**
 * SIP.js based User Agent wrapper for 3CX V20.
 *
 * Responsibilities:
 *  - Open WSS transport to the 3CX WebRTC gateway
 *  - Register the extension (digest auth)
 *  - Place outbound INVITEs
 *  - Accept incoming INVITEs as CallSession objects
 *
 * Caller uses this through `useSipClient()` in the renderer.
 */
export class SipClient {
  private ua: UserAgent | null = null
  private registerer: Registerer | null = null
  private listeners = new Set<(ev: SipClientEvent) => void>()
  private sessions = new Map<string, CallSession>()

  constructor(private readonly config: SipConfig) {}

  /** WSS URL used to reach the 3CX WebRTC gateway. */
  private wsServer(): string {
    if (this.config.wsUri && this.config.wsUri.trim()) {
      return this.config.wsUri.trim()
    }
    const port = this.config.wssPort ?? 443
    // Fallback for plain-SIP deployments. 3CX V20 almost always needs the
    // full wsUri with sessionId/pass; see SipConfig.wsUri for details.
    return `wss://${this.config.pbxFqdn}:${port}/ws`
  }

  /** SIP AOR (Address of Record). */
  private aor(): string {
    return `sip:${this.config.extension}@${this.config.pbxFqdn}`
  }

  /**
   * Start transport and REGISTER.
   * Resolves once SIP.js has opened the WS — registration result arrives
   * asynchronously via `registration-failed` / `registered` events.
   */
  async connect(): Promise<void> {
    if (this.ua) {
      throw new Error('SipClient already connected — call disconnect first')
    }

    const uri = UserAgent.makeURI(this.aor())
    if (!uri) throw new Error(`Invalid SIP URI: ${this.aor()}`)

    const options: UserAgentOptions = {
      uri,
      authorizationUsername: this.config.authId,
      authorizationPassword: this.config.password,
      displayName: this.config.displayName,
      transportOptions: {
        server: this.wsServer(),
        traceSip: import.meta.env?.DEV === true
      },
      // Let SIP.js build its own PeerConnection; we'll tap into it later
      // for remote media via CallSession.
      sessionDescriptionHandlerFactoryOptions: {
        peerConnectionConfiguration: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        }
      },
      delegate: {
        onInvite: (invitation: Invitation) => this.handleIncoming(invitation),
        onDisconnect: (err?: Error) => {
          if (err) {
            this.emit({
              type: 'registration-failed',
              reason: `Transport disconnected: ${err.message}`
            })
          } else {
            this.emit({ type: 'unregistered' })
          }
        }
      }
    }

    this.ua = new UserAgent(options)

    try {
      await this.ua.start()
    } catch (err) {
      this.ua = null
      throw new Error(
        `WSS transport failed: ${err instanceof Error ? err.message : String(err)}`
      )
    }

    this.registerer = new Registerer(this.ua)
    this.registerer.stateChange.addListener((state) => {
      switch (state) {
        case RegistererState.Registered:
          this.emit({ type: 'registered' })
          break
        case RegistererState.Unregistered:
          this.emit({ type: 'unregistered' })
          break
        case RegistererState.Terminated:
          this.emit({ type: 'unregistered' })
          break
      }
    })

    try {
      await this.registerer.register({
        requestDelegate: {
          onReject: (response) => {
            this.emit({
              type: 'registration-failed',
              reason: `${response.message.statusCode} ${response.message.reasonPhrase}`
            })
          }
        }
      })
    } catch (err) {
      this.emit({
        type: 'registration-failed',
        reason: err instanceof Error ? err.message : String(err)
      })
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.registerer?.unregister()
    } catch {
      // Ignore: network may already be gone.
    }
    try {
      await this.ua?.stop()
    } catch {
      // Ignore.
    }
    this.registerer = null
    this.ua = null
    this.sessions.clear()
  }

  /** Outbound call. Returns the new CallSession. */
  async call(target: string): Promise<CallSession> {
    if (!this.ua) throw new Error('SipClient not connected')

    const targetURI = UserAgent.makeURI(`sip:${target}@${this.config.pbxFqdn}`)
    if (!targetURI) throw new Error(`Invalid target: ${target}`)

    const inviter = new Inviter(this.ua, targetURI, {
      earlyMedia: true,
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false }
      }
    })

    const session = new CallSession(inviter, {
      direction: 'outbound',
      remoteNumber: target
    })

    this.sessions.set(session.info.id, session)
    session.onTerminated(() => {
      this.sessions.delete(session.info.id)
      this.emit({ type: 'call-ended', callId: session.info.id })
    })

    await inviter.invite({
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false }
      }
    })

    return session
  }

  getSession(callId: string): CallSession | undefined {
    return this.sessions.get(callId)
  }

  listSessions(): CallSession[] {
    return Array.from(this.sessions.values())
  }

  on(cb: (ev: SipClientEvent) => void): () => void {
    this.listeners.add(cb)
    return () => {
      this.listeners.delete(cb)
    }
  }

  private emit(ev: SipClientEvent): void {
    for (const l of this.listeners) {
      try {
        l(ev)
      } catch (err) {
        console.error('[SipClient] listener threw', err)
      }
    }
  }

  private handleIncoming(invitation: Invitation): void {
    const remoteId = invitation.remoteIdentity
    const remoteNumber =
      remoteId.uri.user ?? remoteId.displayName ?? 'unknown'
    const remoteDisplayName = remoteId.displayName

    const session = new CallSession(invitation, {
      direction: 'inbound' as CallDirection,
      remoteNumber,
      remoteDisplayName
    })

    this.sessions.set(session.info.id, session)

    session.onTerminated(() => {
      this.sessions.delete(session.info.id)
      this.emit({ type: 'call-ended', callId: session.info.id })
    })

    // If the user rejects before answer, make sure we clean up.
    invitation.stateChange.addListener((state) => {
      if (state === SessionState.Terminated) {
        this.sessions.delete(session.info.id)
      }
    })

    this.emit({
      type: 'incoming-call',
      payload: {
        callId: session.info.id,
        remoteNumber,
        remoteDisplayName,
        direction: 'inbound'
      }
    })
  }
}
