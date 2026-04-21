import type { AgentStatus } from '../../shared/types'
import type { XapiClient } from './XapiClient'

/**
 * Maps the app's coarse Ready/NotReady concept onto 3CX's richer presence
 * enum. Phase 4: actual XAPI calls; Phase 1: pure memory.
 */
export class AgentState {
  private _status: AgentStatus = 'Available'

  constructor(private readonly xapi: XapiClient) {}

  get status(): AgentStatus {
    return this._status
  }

  async setStatus(next: AgentStatus): Promise<void> {
    this._status = next
    // Phase 4:
    // await this.xapi.setPresence(next)
    void this.xapi
  }

  async setReady(ready: boolean): Promise<void> {
    await this.setStatus(ready ? 'Available' : 'Away')
  }
}
