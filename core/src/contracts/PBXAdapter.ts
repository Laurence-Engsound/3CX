import type { Adapter } from './Adapter.js'
import type { CallId, Call } from '../models/Call.js'

export interface MakeCallOptions {
  callerIdOverride?: string
  recording?: boolean
  metadata?: Record<string, unknown>
}

export interface IVRDecision {
  /** Where 3CX should transfer after the IVR HTTP Action returns. */
  targetExtension?: string
  targetQueueId?: string
  reason?: string
}

export interface IVRState {
  enteredAt: string
  currentNodeId?: string
  selections: Array<{ nodeId: string; option: string }>
}

export interface PBXAdapter extends Adapter {
  /** Outbound: place a call. Returns the canonical CallId (not vendor's). */
  makeCall(from: string, to: string, options?: MakeCallOptions): Promise<CallId>

  /** Transfer a live call to another extension/queue. */
  transferCall(callId: CallId, target: string): Promise<void>

  /** End a call. */
  hangupCall(callId: CallId): Promise<void>

  /** Inject a routing decision into an in-flight IVR HTTP Action callback. */
  injectIVRDecision(callId: CallId, decision: IVRDecision): Promise<void>

  /** Query current IVR session state for a call. */
  queryIVRState(callId: CallId): Promise<IVRState | undefined>

  /** Look up a call by canonical id. Returns undefined if not found. */
  getCall(callId: CallId): Promise<Call | undefined>
}
