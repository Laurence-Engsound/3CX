/**
 * 3CX V20 Update 8 vendor-specific types.
 * Subset modeled after the public Call Control API & Configuration API.
 *
 * Refs: integrations/pbx/3cx/reference/*.html
 */

/** 3CX call state enum (from Call Control API). */
export type ThreeCXCallState =
  | 'Routing'           // initial, before ringing
  | 'Ringing'
  | 'Established'       // answered
  | 'OnHold'
  | 'Transferring'
  | 'Conference'
  | 'IVR'
  | 'Disconnected'

export interface ThreeCXCall {
  /** GUID assigned by 3CX */
  callId: string
  /** Inbound or Outbound */
  type: 'Inbound' | 'Outbound' | 'Internal'
  /** Caller Number (could be E.164 or local format depending on Trunk config) */
  callerNumber: string
  /** Optional caller display name (CID name) */
  callerName?: string
  /** Dialed extension/number */
  dialedNumber: string
  /** Currently assigned extension (if any) */
  assignedExtension?: string
  /** Routing queue at this moment (if in queue) */
  queueId?: string
  /** State per 3CX vocabulary */
  state: ThreeCXCallState
  /** Optional account code attached at trunk level */
  accountCode?: string
  /** ISO timestamps (3CX uses UTC) */
  startTime: string
  ringingTime?: string
  answeredTime?: string
  endTime?: string
  /** Recording path on 3CX server filesystem; abstracted to URI later */
  recordingPath?: string
}

/** 3CX user (extension owner). */
export interface ThreeCXUser {
  /** Internal extension number */
  extension: string
  /** UPN-like identifier (e.g., 'agent01@eSun.local') */
  loginId?: string
  firstName: string
  lastName: string
  /** Group membership IDs */
  groupIds: string[]
  /** Active presence */
  presence: 'Available' | 'Away' | 'DND' | 'Lunch' | 'BusinessTrip' | 'CustomAway' | 'Busy'
  presenceMessage?: string
  /** Skill tags managed in 3CX (free-form) */
  skills?: string[]
  /** Whether currently logged in to a phone */
  loggedIn: boolean
  /** Hot-desking device, if applicable */
  device?: {
    type: '3CXSoftphone' | 'WebClient' | 'IPPhone' | 'MobileApp'
    macOrId: string
    ipAddress?: string
  }
}

/** 3CX event envelope from the Call Control API WebSocket stream. */
export interface ThreeCXEventEnvelope {
  /** Event type, dot-separated. e.g. 'call.ringing', 'agent.statusChanged' */
  event: string
  /** ISO datetime when 3CX emitted the event */
  timestamp: string
  /** Free-form payload, type depends on `event` */
  data: Record<string, unknown>
  /** Sequence number for ordering / replay */
  seq: number
}

/** Common 3CX event types we map to canonical CallEventType. */
export const ThreeCXEventTypes = {
  CallStarted: 'call.started',
  CallRinging: 'call.ringing',
  CallAnswered: 'call.answered',
  CallEnded: 'call.ended',
  CallTransferred: 'call.transferred',
  CallHeld: 'call.held',
  CallResumed: 'call.resumed',
  IVREntered: 'ivr.entered',
  IVROptionSelected: 'ivr.optionSelected',
  IVRExited: 'ivr.exited',
  RecordingStarted: 'recording.started',
  RecordingStopped: 'recording.stopped',
  RecordingPaused: 'recording.paused',
  RecordingResumed: 'recording.resumed',
  AgentStatusChanged: 'agent.statusChanged',
  AgentLoggedIn: 'agent.loggedIn',
  AgentLoggedOut: 'agent.loggedOut',
} as const
