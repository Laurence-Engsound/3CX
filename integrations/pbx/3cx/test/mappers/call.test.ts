import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CallSchema } from '@voxen/core/models'
import { newTenantId } from '@voxen/core/utils'
import {
  mapCallState,
  mapDirection,
  mapVendorCallToCanonical,
  toRecordingUri,
} from '../../src/mappers/call.js'
import type { ThreeCXCall } from '../../src/vendor/types.js'

const TEST_TENANT = newTenantId()
const TEST_CTX = {
  adapterId: 'pbx_3cx_test',
  tenantId: TEST_TENANT,
  recordingStorageBackend: 'test-nas',
}

test('mapCallState covers all 3CX states', () => {
  assert.equal(mapCallState('Routing'), 'initiating')
  assert.equal(mapCallState('Ringing'), 'ringing')
  assert.equal(mapCallState('IVR'), 'ivr')
  assert.equal(mapCallState('Established'), 'active')
  assert.equal(mapCallState('OnHold'), 'on_hold')
  assert.equal(mapCallState('Transferring'), 'transferring')
  assert.equal(mapCallState('Conference'), 'conference')
  assert.equal(mapCallState('Disconnected'), 'ended')
})

test('mapDirection translates correctly', () => {
  assert.equal(mapDirection('Inbound'), 'inbound')
  assert.equal(mapDirection('Outbound'), 'outbound')
  assert.equal(mapDirection('Internal'), 'internal')
})

test('toRecordingUri converts vendor path to voxen:// URI', () => {
  const uri = toRecordingUri('C:\\3CX\\rec\\2026-04\\xyz.wav', TEST_TENANT)
  assert.match(uri, /^voxen:\/\/recording\//)
  assert.match(uri, /xyz\.wav$/)

  const linuxUri = toRecordingUri('/var/lib/3cxpbx/Data/recordings/abc.wav', TEST_TENANT)
  assert.match(linuxUri, /abc\.wav$/)
})

test('mapVendorCallToCanonical produces a valid canonical Call', () => {
  const vendor: ThreeCXCall = {
    callId: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890',
    type: 'Inbound',
    callerNumber: '0912345678',
    callerName: '王先生',
    dialedNumber: '5001',
    state: 'Established',
    startTime: '2026-04-26T14:35:00Z',
    ringingTime: '2026-04-26T14:35:18Z',
    answeredTime: '2026-04-26T14:35:21Z',
  }

  const call = mapVendorCallToCanonical(vendor, TEST_CTX)

  // Canonical id is freshly generated, NOT vendor's GUID
  assert.match(call.id, /^cal_[0-9A-HJKMNP-TV-Z]{26}$/)
  assert.notEqual(call.id, vendor.callId)

  // Vendor id preserved in externalIds
  assert.equal(call.externalIds[TEST_CTX.adapterId], vendor.callId)

  // Canonical fields
  assert.equal(call.direction, 'inbound')
  assert.equal(call.caller.phoneNumber, '+886912345678')
  assert.equal(call.caller.displayName, '王先生')
  assert.equal(call.callee.phoneNumber, '5001')
  assert.equal(call.state, 'active')
  assert.equal(call.tenantId, TEST_TENANT)
  assert.equal(call.sourceAdapterId, TEST_CTX.adapterId)

  // Computed durations (3 second ring, 0 duration since not ended)
  assert.equal(call.ringDurationSec, 3)

  // Schema must validate
  const result = CallSchema.safeParse(call)
  assert.equal(result.success, true,
    result.success ? '' : `Validation failed: ${JSON.stringify(result.error.issues, null, 2)}`)
})

test('mapVendorCallToCanonical computes durationSec when call ended', () => {
  const vendor: ThreeCXCall = {
    callId: 'X-1',
    type: 'Outbound',
    callerNumber: '5001',
    dialedNumber: '0987654321',
    state: 'Disconnected',
    startTime: '2026-04-26T14:30:00Z',
    ringingTime: '2026-04-26T14:30:02Z',
    answeredTime: '2026-04-26T14:30:10Z',
    endTime: '2026-04-26T14:35:10Z',
  }
  const call = mapVendorCallToCanonical(vendor, TEST_CTX)
  assert.equal(call.durationSec, 300)        // 5 minutes
  assert.equal(call.ringDurationSec, 8)
  assert.equal(call.state, 'ended')
  assert.equal(call.endReason, 'caller_hangup')
})

test('mapVendorCallToCanonical creates RecordingRef when recordingPath present', () => {
  const vendor: ThreeCXCall = {
    callId: 'X-2',
    type: 'Inbound',
    callerNumber: '0911111111',
    dialedNumber: '5000',
    state: 'Established',
    startTime: '2026-04-26T15:00:00Z',
    ringingTime: '2026-04-26T15:00:02Z',
    answeredTime: '2026-04-26T15:00:05Z',
    recordingPath: '/var/lib/3cxpbx/Data/recordings/2026-04-26/15-00-05_X-2.wav',
  }
  const call = mapVendorCallToCanonical(vendor, TEST_CTX)
  assert.ok(call.recording)
  assert.match(call.recording!.uri, /^voxen:\/\/recording\//)
  assert.equal(call.recording!.storageBackend, 'test-nas')
})

test('mapVendorCallToCanonical infers abandoned_in_queue when never answered', () => {
  const vendor: ThreeCXCall = {
    callId: 'X-3',
    type: 'Inbound',
    callerNumber: '0900000000',
    dialedNumber: '5000',
    state: 'Disconnected',
    startTime: '2026-04-26T16:00:00Z',
    ringingTime: '2026-04-26T16:00:02Z',
    endTime: '2026-04-26T16:00:30Z',  // never answered
  }
  const call = mapVendorCallToCanonical(vendor, TEST_CTX)
  assert.equal(call.endReason, 'abandoned_in_queue')
  assert.equal(call.durationSec, undefined)  // never answered → no talk duration
})
