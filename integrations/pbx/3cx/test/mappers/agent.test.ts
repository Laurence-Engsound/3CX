import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AgentSchema } from '@voxen/core/models'
import { newTenantId } from '@voxen/core/utils'
import {
  mapPresenceToStatus,
  mapDeviceType,
  mapVendorUserToAgent,
} from '../../src/mappers/agent.js'
import type { ThreeCXUser } from '../../src/vendor/types.js'

const CTX = { adapterId: 'pbx_3cx_test', tenantId: newTenantId() }

test('mapPresenceToStatus returns offline when not logged in', () => {
  assert.equal(mapPresenceToStatus('Available', false), 'offline')
})

test('mapPresenceToStatus translates each presence', () => {
  assert.equal(mapPresenceToStatus('Available', true), 'available')
  assert.equal(mapPresenceToStatus('Busy', true), 'busy')
  assert.equal(mapPresenceToStatus('Away', true), 'away')
  assert.equal(mapPresenceToStatus('Lunch', true), 'away')
  assert.equal(mapPresenceToStatus('BusinessTrip', true), 'away')
  assert.equal(mapPresenceToStatus('CustomAway', true), 'away')
  assert.equal(mapPresenceToStatus('DND', true), 'dnd')
})

test('mapDeviceType translates all 3CX device types', () => {
  assert.equal(mapDeviceType('3CXSoftphone'), 'softphone')
  assert.equal(mapDeviceType('WebClient'), 'web_browser')
  assert.equal(mapDeviceType('IPPhone'), 'desk_phone')
  assert.equal(mapDeviceType('MobileApp'), 'mobile')
})

test('mapVendorUserToAgent produces valid canonical Agent', () => {
  const vendor: ThreeCXUser = {
    extension: '101',
    loginId: 'agent01@eSun.local',
    firstName: '小明',
    lastName: '陳',
    groupIds: ['group-credit', 'group-vip'],
    presence: 'Available',
    loggedIn: true,
    skills: ['cn-tw', 'credit_card'],
    device: { type: '3CXSoftphone', macOrId: 'AA:BB:CC:DD:EE:FF', ipAddress: '10.0.5.10' },
  }

  const agent = mapVendorUserToAgent(vendor, CTX)

  assert.match(agent.id, /^agt_[0-9A-HJKMNP-TV-Z]{26}$/)
  assert.equal(agent.externalIds[CTX.adapterId], '101')
  assert.equal(agent.displayName, '小明 陳')
  assert.equal(agent.status, 'available')
  assert.equal(agent.skills.length, 2)
  assert.equal(agent.skills[0]?.code, 'cn-tw')
  assert.equal(agent.skills[0]?.proficiency, 3)
  assert.equal(agent.currentDevice?.type, 'softphone')
  assert.equal(agent.currentDevice?.identifier, 'AA:BB:CC:DD:EE:FF')

  // Schema validation
  const result = AgentSchema.safeParse(agent)
  assert.equal(result.success, true,
    result.success ? '' : `Validation: ${JSON.stringify(result.error.issues, null, 2)}`)
})

test('mapVendorUserToAgent handles missing optional fields', () => {
  const vendor: ThreeCXUser = {
    extension: '102',
    firstName: 'Test',
    lastName: 'User',
    groupIds: [],
    presence: 'DND',
    loggedIn: true,
  }
  const agent = mapVendorUserToAgent(vendor, CTX)
  assert.equal(agent.status, 'dnd')
  assert.equal(agent.skills.length, 0)
  assert.equal(agent.currentDevice, undefined)

  const result = AgentSchema.safeParse(agent)
  assert.equal(result.success, true)
})
