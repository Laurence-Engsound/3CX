import {
  type Event,
  type EventType,
  type CallEventType,
  type AgentEventType,
  type TenantId,
  type CallId,
} from '@voxen/core/models'
import { newEventId } from '@voxen/core/utils'
import type { ThreeCXEventEnvelope } from '../vendor/types.js'

/** Map raw 3CX event name → canonical EventType. Returns undefined if no canonical mapping. */
export function mapEventType(threeCxEventName: string): EventType | undefined {
  const mapping: Record<string, EventType> = {
    'call.started':            'call.initiating',
    'call.ringing':            'call.ringing',
    'call.answered':           'call.answered',
    'call.ended':              'call.ended',
    'call.transferred':        'call.transferred',
    'call.held':               'call.hold',
    'call.resumed':            'call.unhold',
    'ivr.entered':             'call.ivr.entered',
    'ivr.optionSelected':      'call.ivr.option_selected',
    'ivr.exited':              'call.ivr.exited',
    'recording.started':       'call.recording.started',
    'recording.stopped':       'call.recording.stopped',
    'recording.paused':        'call.recording.paused',
    'recording.resumed':       'call.recording.resumed',
    'agent.statusChanged':     'agent.status_changed',
    'agent.loggedIn':          'agent.login',
    'agent.loggedOut':         'agent.logout',
  }
  return mapping[threeCxEventName]
}

export interface MapEventContext {
  adapterId: string
  tenantId: TenantId
  /** Lookup table: 3CX call GUID → canonical CallId (built up in adapter state). */
  vendorToCanonicalCallId?: (vendorCallId: string) => CallId | undefined
}

/**
 * Translate a raw 3CX event envelope → VOXEN canonical Event.
 * Returns undefined if no canonical mapping exists (silently dropped, logged by caller).
 */
export function mapVendorEventToCanonical(
  envelope: ThreeCXEventEnvelope,
  ctx: MapEventContext,
): Event | undefined {
  const canonicalType = mapEventType(envelope.event)
  if (!canonicalType) return undefined

  // Resolve refs from payload.
  const vendorCallId = (envelope.data['callId'] as string | undefined)
  const callId = vendorCallId && ctx.vendorToCanonicalCallId
    ? ctx.vendorToCanonicalCallId(vendorCallId)
    : undefined

  return {
    id: newEventId(),
    type: canonicalType,
    tenantId: ctx.tenantId,
    occurredAt: envelope.timestamp,
    ingestedAt: new Date().toISOString(),
    sourceAdapterId: ctx.adapterId,
    sourceCorrelationId: String(envelope.seq),
    refs: {
      ...(callId ? { callId } : {}),
    },
    payload: envelope.data,
    payloadSchemaVersion: 'v1',
  }
}
