import {
  type PBXAdapter,
  type HealthStatus,
  type IEventBus,
  type MakeCallOptions,
  type IVRDecision,
  type IVRState,
  type Call,
  type CallId,
  type TenantId,
  newCallId,
} from '@voxen/core'
import { ThreeCXClient, type ThreeCXClientConfig } from './client/ThreeCXClient.js'
import {
  mapVendorCallToCanonical,
  mapVendorEventToCanonical,
  type MapCallContext,
  type MapEventContext,
} from './mappers/index.js'

export interface ThreeCXAdapterConfig {
  adapterId: string
  tenantId: TenantId
  recordingStorageBackend: string
  client: ThreeCXClientConfig
}

export class ThreeCXAdapter implements PBXAdapter {
  readonly adapterId: string
  readonly tenantId: TenantId

  private client: ThreeCXClient
  private bus: IEventBus
  private mapCallCtx: MapCallContext
  private mapEventCtx: MapEventContext

  /** vendor call GUID → canonical CallId, kept in-memory for the lifetime of a call. */
  private vendorToCanonical = new Map<string, CallId>()
  /** canonical CallId → vendor call GUID (reverse lookup for outbound commands). */
  private canonicalToVendor = new Map<CallId, string>()
  /** Latest known canonical Call (for getCall queries). */
  private callCache = new Map<CallId, Call>()

  private started = false

  constructor(config: ThreeCXAdapterConfig, bus: IEventBus) {
    this.adapterId = config.adapterId
    this.tenantId = config.tenantId
    this.client = new ThreeCXClient(config.client)
    this.bus = bus
    this.mapCallCtx = {
      adapterId: this.adapterId,
      tenantId: this.tenantId,
      recordingStorageBackend: config.recordingStorageBackend,
    }
    this.mapEventCtx = {
      adapterId: this.adapterId,
      tenantId: this.tenantId,
      vendorToCanonicalCallId: (vid) => this.vendorToCanonical.get(vid),
    }
  }

  async start(): Promise<void> {
    if (this.started) return
    await this.client.connect()

    // Hook the WS event stream
    this.client.on('event', (envelope) => {
      // Self-bootstrapping: if event references a vendor call ID we don't know yet,
      // pre-allocate a canonical CallId so refs.callId can be set.
      const vendorCallId = envelope.data['callId'] as string | undefined
      if (vendorCallId && !this.vendorToCanonical.has(vendorCallId)) {
        const cid = newCallId()
        this.vendorToCanonical.set(vendorCallId, cid)
        this.canonicalToVendor.set(cid, vendorCallId)
      }
      const event = mapVendorEventToCanonical(envelope, this.mapEventCtx)
      if (event) {
        // Fire-and-forget; eventbus collects handler errors internally.
        void this.bus.publish(event)
      }
    })

    this.started = true
    await this.bus.publish({
      id: `evt_${'0'.repeat(26)}` as `evt_${string}`,  // synthetic ID OK for system event
      type: 'system.adapter.started',
      tenantId: this.tenantId,
      occurredAt: new Date().toISOString(),
      ingestedAt: new Date().toISOString(),
      sourceAdapterId: this.adapterId,
      refs: {},
      payload: { adapterId: this.adapterId },
      payloadSchemaVersion: 'v1',
    })
  }

  async stop(): Promise<void> {
    if (!this.started) return
    await this.client.disconnect()
    this.started = false
  }

  async healthCheck(): Promise<HealthStatus> {
    const checkedAt = new Date().toISOString()
    try {
      const ok = await this.client.ping()
      return {
        healthy: ok && this.client.isConnected(),
        ...(ok ? {} : { message: 'ping failed' }),
        details: {
          httpReachable: ok,
          wsConnected: this.client.isConnected(),
          knownCalls: this.callCache.size,
        },
        supportedSchemas: { Call: ['v1'], Agent: ['v1'], Event: ['v1'] },
        checkedAt,
      }
    } catch (e) {
      return {
        healthy: false,
        message: (e as Error).message,
        supportedSchemas: { Call: ['v1'], Agent: ['v1'], Event: ['v1'] },
        checkedAt,
      }
    }
  }

  async makeCall(from: string, to: string, _options?: MakeCallOptions): Promise<CallId> {
    const result = await this.client.makeCall({ from, to })
    const cid = newCallId()
    this.vendorToCanonical.set(result.callId, cid)
    this.canonicalToVendor.set(cid, result.callId)
    return cid
  }

  async transferCall(callId: CallId, target: string): Promise<void> {
    const vendorId = this.canonicalToVendor.get(callId)
    if (!vendorId) throw new Error(`Unknown CallId: ${callId}`)
    await this.client.transferCall(vendorId, target)
  }

  async hangupCall(callId: CallId): Promise<void> {
    const vendorId = this.canonicalToVendor.get(callId)
    if (!vendorId) throw new Error(`Unknown CallId: ${callId}`)
    await this.client.hangupCall(vendorId)
  }

  async injectIVRDecision(_callId: CallId, _decision: IVRDecision): Promise<void> {
    // 3CX IVR HTTP Action returns the decision in the HTTP response.
    // For mock/scaffold we no-op; the real impl wires this to a held HTTP response.
    return Promise.resolve()
  }

  async queryIVRState(callId: CallId): Promise<IVRState | undefined> {
    const call = this.callCache.get(callId)
    if (!call?.ivr) return undefined
    return {
      enteredAt: call.ivr.enteredAt,
      selections: call.ivr.selections.map((s) => ({ nodeId: s.nodeId, option: s.option })),
    }
  }

  async getCall(callId: CallId): Promise<Call | undefined> {
    if (this.callCache.has(callId)) return this.callCache.get(callId)
    const vendorId = this.canonicalToVendor.get(callId)
    if (!vendorId) return undefined
    const vendorCall = await this.client.getCall(vendorId)
    if (!vendorCall) return undefined
    const canonical = mapVendorCallToCanonical(vendorCall, this.mapCallCtx)
    // Override with our cached canonical id (we already allocated one)
    canonical.id = callId
    canonical.externalIds = { ...canonical.externalIds, [this.adapterId]: vendorId }
    this.callCache.set(callId, canonical)
    return canonical
  }
}
