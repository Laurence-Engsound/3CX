import {
  type Call,
  type CallId,
  type CallState,
  type CallEndReason,
  type TenantId,
} from '@voxen/core/models'
import { newCallId } from '@voxen/core/utils'
import { normalizePhone } from '@voxen/core/utils'
import type { ThreeCXCall, ThreeCXCallState } from '../vendor/types.js'

/** Map 3CX call state → VOXEN canonical CallState. */
export function mapCallState(vendor: ThreeCXCallState): CallState {
  switch (vendor) {
    case 'Routing':       return 'initiating'
    case 'Ringing':       return 'ringing'
    case 'IVR':           return 'ivr'
    case 'Established':   return 'active'
    case 'OnHold':        return 'on_hold'
    case 'Transferring':  return 'transferring'
    case 'Conference':    return 'conference'
    case 'Disconnected':  return 'ended'
    default: {
      // Exhaustive check — TS will error if we miss a case
      const _exhaustive: never = vendor
      throw new Error(`Unmapped 3CX call state: ${String(_exhaustive)}`)
    }
  }
}

/** Map 3CX call type → VOXEN direction. */
export function mapDirection(vendorType: ThreeCXCall['type']): Call['direction'] {
  switch (vendorType) {
    case 'Inbound':  return 'inbound'
    case 'Outbound': return 'outbound'
    case 'Internal': return 'internal'
  }
}

/** Convert a 3CX recording filesystem path → VOXEN abstract URI. */
export function toRecordingUri(vendorPath: string, tenantId: TenantId): string {
  // Vendor path looks like: 'C:\\3CX\\rec\\2026-04\\xxx.wav' or '/var/lib/3cxpbx/Data/recordings/...'
  // Convert to: 'voxen://recording/<tenant>/<basename>'
  const basename = vendorPath.split(/[\\/]/).pop() ?? 'unknown'
  return `voxen://recording/${tenantId}/${basename}`
}

export interface MapCallContext {
  /** Adapter ID emitting the canonical Call. */
  adapterId: string
  /** Tenant the adapter is bound to. */
  tenantId: TenantId
  /** Storage backend identifier for recording references (e.g. 'eSun-nas-primary'). */
  recordingStorageBackend: string
}

/**
 * Translate a 3CX Call → VOXEN canonical Call.
 *
 * NOTE: VOXEN generates a fresh canonical CallId; the vendor's GUID is preserved
 * in `externalIds['<adapterId>']`. See CANONICAL-MODEL.md §5 (Anti-Pattern §9.2).
 */
export function mapVendorCallToCanonical(
  vendor: ThreeCXCall,
  ctx: MapCallContext,
): Call {
  const id: CallId = newCallId()
  const direction = mapDirection(vendor.type)

  // Caller phone — normalize if it looks like a real number; preserve raw otherwise
  // (internal extensions are too short for E.164 and that's expected for direction='internal').
  let callerPhone: string
  try {
    callerPhone = normalizePhone(vendor.callerNumber)
  } catch {
    callerPhone = vendor.callerNumber  // fall back to raw (e.g., extension '5001')
  }

  const call: Call = {
    schemaVersion: 'v1',
    id,
    tenantId: ctx.tenantId,
    externalIds: { [ctx.adapterId]: vendor.callId },
    direction,
    caller: {
      phoneNumber: callerPhone,
      ...(vendor.callerName ? { displayName: vendor.callerName } : {}),
    },
    callee: {
      ...(vendor.dialedNumber ? { phoneNumber: vendor.dialedNumber } : {}),
      ...(vendor.assignedExtension ? { extension: vendor.assignedExtension } : {}),
    },
    state: mapCallState(vendor.state),
    timeline: [],  // populated separately via event stream
    ...(vendor.ringingTime ? { ringingAt: vendor.ringingTime } : {}),
    ...(vendor.answeredTime ? { answeredAt: vendor.answeredTime } : {}),
    ...(vendor.endTime ? { endedAt: vendor.endTime } : {}),
    sourceAdapterId: ctx.adapterId,
    metadata: {
      threeCxQueueId: vendor.queueId,
      threeCxAccountCode: vendor.accountCode,
    },
  }

  // Recording reference if present
  if (vendor.recordingPath) {
    call.recording = {
      id: `rec_${id.slice(4)}` as `rec_${string}`,  // share ULID portion for traceability
      uri: toRecordingUri(vendor.recordingPath, ctx.tenantId),
      storageBackend: ctx.recordingStorageBackend,
      startedAt: vendor.answeredTime ?? vendor.ringingTime ?? vendor.startTime,
      ...(vendor.endTime ? { endedAt: vendor.endTime } : {}),
    }
  }

  // Compute durations
  if (vendor.answeredTime && vendor.endTime) {
    call.durationSec = (Date.parse(vendor.endTime) - Date.parse(vendor.answeredTime)) / 1000
  }
  if (vendor.ringingTime && vendor.answeredTime) {
    call.ringDurationSec = (Date.parse(vendor.answeredTime) - Date.parse(vendor.ringingTime)) / 1000
  }

  // Infer end reason heuristically when the call has ended but vendor didn't tell us why.
  if (call.state === 'ended' && !call.endReason) {
    call.endReason = inferEndReason(vendor)
  }

  return call
}

function inferEndReason(vendor: ThreeCXCall): CallEndReason {
  if (vendor.answeredTime) {
    // The call connected at some point — assume one party hung up
    return 'caller_hangup'
  }
  // Never answered
  return 'abandoned_in_queue'
}
