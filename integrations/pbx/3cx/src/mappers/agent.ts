import {
  type Agent,
  type AgentStatus,
  type DeviceRef,
  type TenantId,
} from '@voxen/core/models'
import { newAgentId } from '@voxen/core/utils'
import type { ThreeCXUser } from '../vendor/types.js'

export function mapPresenceToStatus(
  presence: ThreeCXUser['presence'],
  loggedIn: boolean,
): AgentStatus {
  if (!loggedIn) return 'offline'
  switch (presence) {
    case 'Available':     return 'available'
    case 'Busy':          return 'busy'
    case 'Away':          return 'away'
    case 'Lunch':         return 'away'
    case 'BusinessTrip':  return 'away'
    case 'CustomAway':    return 'away'
    case 'DND':           return 'dnd'
  }
}

export function mapDeviceType(
  vendorType: NonNullable<ThreeCXUser['device']>['type'],
): DeviceRef['type'] {
  switch (vendorType) {
    case '3CXSoftphone': return 'softphone'
    case 'WebClient':    return 'web_browser'
    case 'IPPhone':      return 'desk_phone'
    case 'MobileApp':    return 'mobile'
  }
}

export interface MapAgentContext {
  adapterId: string
  tenantId: TenantId
}

export function mapVendorUserToAgent(
  vendor: ThreeCXUser,
  ctx: MapAgentContext,
): Agent {
  const id = newAgentId()
  const now = new Date().toISOString()

  const agent: Agent = {
    id,
    tenantId: ctx.tenantId,
    externalIds: { [ctx.adapterId]: vendor.extension },
    displayName: `${vendor.firstName} ${vendor.lastName}`.trim(),
    groupIds: [],   // 3CX group IDs are not VOXEN GroupIds; map separately if needed
    status: mapPresenceToStatus(vendor.presence, vendor.loggedIn),
    ...(vendor.presenceMessage ? { statusReason: vendor.presenceMessage } : {}),
    statusUpdatedAt: now,
    skills: (vendor.skills ?? []).map((code) => ({
      code,
      proficiency: 3,  // 3CX has no proficiency level → default to mid
    })),
    createdAt: now,
    updatedAt: now,
    metadata: {
      threeCxExtension: vendor.extension,
      threeCxLoginId: vendor.loginId,
      threeCxGroupIds: vendor.groupIds,
    },
  }

  if (vendor.device) {
    agent.currentDevice = {
      type: mapDeviceType(vendor.device.type),
      identifier: vendor.device.macOrId,
      ...(vendor.device.ipAddress ? { ipAddress: vendor.device.ipAddress } : {}),
    }
  }

  return agent
}
