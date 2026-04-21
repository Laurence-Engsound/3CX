import {
  Invitation,
  Inviter,
  Session,
  SessionState
} from 'sip.js'
import type { CallDirection, CallInfo, CallState } from '../../shared/types'

interface CreateOpts {
  direction: CallDirection
  remoteNumber: string
  remoteDisplayName?: string
}

/**
 * Wraps a SIP.js Inviter (outbound) or Invitation (inbound) and exposes a
 * minimal, framework-agnostic API the renderer stores call into.
 *
 * State translation:
 *   SessionState.Initial         → 'calling' (outbound) / 'ringing' (inbound)
 *   SessionState.Establishing    → 'connecting'
 *   SessionState.Established     → 'connected'
 *   SessionState.Terminated      → 'ended'
 */
export class CallSession {
  readonly info: CallInfo

  private terminatedHandlers = new Set<() => void>()
  private remoteAudioEl: HTMLAudioElement | null = null
  private isHeld = false
  private isMuted = false

  constructor(
    private readonly session: Session,
    opts: CreateOpts
  ) {
    this.info = {
      id: session.id,
      direction: opts.direction,
      remoteNumber: opts.remoteNumber,
      remoteDisplayName: opts.remoteDisplayName,
      startedAt: Date.now(),
      state: opts.direction === 'inbound' ? 'ringing' : 'calling'
    }

    this.session.stateChange.addListener((state) => {
      this.info.state = this.translateState(state)

      if (state === SessionState.Established) {
        if (!this.info.answeredAt) this.info.answeredAt = Date.now()
        this.attachRemoteMedia()
      }

      if (state === SessionState.Terminated) {
        this.info.endedAt = Date.now()
        this.detachRemoteMedia()
        for (const h of this.terminatedHandlers) h()
      }
    })
  }

  /** Set the <audio> element used for remote playback. Call before answer. */
  setRemoteAudioElement(el: HTMLAudioElement | null): void {
    this.remoteAudioEl = el
    if (this.session.state === SessionState.Established) {
      this.attachRemoteMedia()
    }
  }

  /** Inbound only: accept the call. */
  async answer(): Promise<void> {
    if (!(this.session instanceof Invitation)) {
      throw new Error('Cannot answer an outbound call')
    }
    await this.session.accept({
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false }
      }
    })
  }

  /** Inbound only: reject the call before answering. */
  async reject(): Promise<void> {
    if (this.session instanceof Invitation) {
      await this.session.reject()
    }
  }

  /** Hang up — works regardless of current state. */
  async hangup(): Promise<void> {
    const state = this.session.state
    if (state === SessionState.Initial) {
      // Inbound not yet answered → reject; outbound not yet sent → never happens here
      if (this.session instanceof Invitation) {
        await this.session.reject()
      } else if (this.session instanceof Inviter) {
        await this.session.cancel()
      }
      return
    }
    if (state === SessionState.Establishing) {
      if (this.session instanceof Inviter) {
        await this.session.cancel()
      } else if (this.session instanceof Invitation) {
        await this.session.reject()
      }
      return
    }
    if (state === SessionState.Established) {
      await this.session.bye()
      return
    }
    // Terminating / Terminated → noop
  }

  setMuted(mute: boolean): void {
    const sdh = this.session.sessionDescriptionHandler
    if (!sdh || !('peerConnection' in sdh)) return
    const pc = (sdh as { peerConnection: RTCPeerConnection }).peerConnection
    pc.getSenders().forEach((sender) => {
      if (sender.track && sender.track.kind === 'audio') {
        sender.track.enabled = !mute
      }
    })
    this.isMuted = mute
  }

  get muted(): boolean {
    return this.isMuted
  }

  /** Phase 3 will implement proper SDP-based hold (a=sendonly). */
  async setHold(hold: boolean): Promise<void> {
    // Minimal placeholder: just mute both directions to simulate hold.
    // Replace in Phase 3 with session.invite({ sessionDescriptionHandlerModifiers: [holdModifier] })
    this.setMuted(hold)
    this.isHeld = hold
  }

  get held(): boolean {
    return this.isHeld
  }

  async sendDtmf(tone: string): Promise<void> {
    // SIP.js >= 0.20 uses INFO via sessionDescriptionHandler.sendDtmf
    const sdh = this.session.sessionDescriptionHandler as
      | { sendDtmf?: (tone: string) => boolean }
      | undefined
    if (sdh && typeof sdh.sendDtmf === 'function') {
      sdh.sendDtmf(tone)
    }
  }

  onTerminated(cb: () => void): () => void {
    this.terminatedHandlers.add(cb)
    return () => {
      this.terminatedHandlers.delete(cb)
    }
  }

  private attachRemoteMedia(): void {
    if (!this.remoteAudioEl) return
    const sdh = this.session.sessionDescriptionHandler
    if (!sdh || !('peerConnection' in sdh)) return
    const pc = (sdh as { peerConnection: RTCPeerConnection }).peerConnection

    const remoteStream = new MediaStream()
    pc.getReceivers().forEach((receiver) => {
      if (receiver.track) remoteStream.addTrack(receiver.track)
    })

    this.remoteAudioEl.srcObject = remoteStream
    void this.remoteAudioEl.play().catch((err) => {
      console.warn('[CallSession] remote audio play() rejected', err)
    })
  }

  private detachRemoteMedia(): void {
    if (this.remoteAudioEl) {
      this.remoteAudioEl.srcObject = null
    }
  }

  private translateState(state: SessionState): CallState {
    switch (state) {
      case SessionState.Initial:
        return this.info.direction === 'inbound' ? 'ringing' : 'calling'
      case SessionState.Establishing:
        return 'connecting'
      case SessionState.Established:
        return this.isHeld ? 'held' : 'connected'
      case SessionState.Terminating:
      case SessionState.Terminated:
        return 'ended'
    }
  }
}
