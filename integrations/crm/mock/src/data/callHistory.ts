import type { CallSummary, CustomerId, AgentId } from '@voxen/core'
import { ESUN_DEMO_CUSTOMERS } from './customers.js'

/**
 * 玉山 demo 假 CDR + last-agent map
 *
 * 30 筆 CDR 分散在 10 個假客戶上。Last-agent 映射對應 Demo 4 acceptance：
 *   - 0912-XXX-002 林小姐 → agent04 (last-agent routing demo)
 *   - 0912-XXX-001 王先生 → agent01
 *
 * Each customer has 1-5 historical calls, ordered newest first.
 */

// 4 agents — fixed IDs for deterministic last-agent routing demo
const AGENT_PREFIX = '01HQR0WMRP4Y3M000000000'  // 23 chars
const AGENT_01 = `agt_${AGENT_PREFIX}001` as AgentId
const AGENT_02 = `agt_${AGENT_PREFIX}002` as AgentId
const AGENT_03 = `agt_${AGENT_PREFIX}003` as AgentId
const AGENT_04 = `agt_${AGENT_PREFIX}004` as AgentId

export const ESUN_DEMO_AGENTS = {
  agent01: AGENT_01,
  agent02: AGENT_02,
  agent03: AGENT_03,
  agent04: AGENT_04,
} as const

// Helper for generating CallIds
const CALL_PREFIX = '01HQR0WMRP4Y3M000000000'  // 23 chars, suffix gets 3 chars
let _callSeq = 1
function nextCallId(): string {
  const seq = String(_callSeq++).padStart(3, '0')
  return `cal_${CALL_PREFIX}${seq}`
}

function call(
  customerIdx: number,
  agentId: AgentId | undefined,
  daysAgo: number,
  durationSec: number,
  direction: 'inbound' | 'outbound' = 'inbound',
): CallSummary {
  const customer = ESUN_DEMO_CUSTOMERS[customerIdx]
  if (!customer) throw new Error(`unknown customer index ${customerIdx}`)
  const startedMs = Date.parse('2026-04-27T08:00:00Z') - daysAgo * 86_400_000
  const startedAt = new Date(startedMs).toISOString()
  const endedAt = new Date(startedMs + durationSec * 1000).toISOString()
  return {
    callId: nextCallId(),
    customerId: customer.id as CustomerId,
    agentId,
    direction,
    startedAt,
    endedAt,
    durationSec,
    endReason: 'caller_hangup',
    hasRecording: true,
  }
}

/**
 * Build the demo call history map. Customers are referenced by 0-based index
 * matching ESUN_DEMO_CUSTOMERS order:
 *   0: 王先生   1: 林小姐   2: 陳先生   3: 黃太太   4: 張先生
 *   5: 李小姐   6: 周先生   7: 吳太太   8: 鄭先生   9: 何小姐 (VIP)
 */
export function buildEsunCallHistory(): {
  history: Map<CustomerId, CallSummary[]>
  lastAgents: Map<CustomerId, AgentId>
} {
  // Reset sequence so repeated calls produce identical data
  _callSeq = 1

  const history = new Map<CustomerId, CallSummary[]>()
  const lastAgents = new Map<CustomerId, AgentId>()

  // 王先生 (0): 4 calls, last → agent01
  history.set(ESUN_DEMO_CUSTOMERS[0]!.id as CustomerId, [
    call(0, AGENT_01, 5, 240),
    call(0, AGENT_02, 12, 180),
    call(0, AGENT_01, 28, 320),
    call(0, AGENT_03, 45, 90),
  ])
  lastAgents.set(ESUN_DEMO_CUSTOMERS[0]!.id as CustomerId, AGENT_01)

  // 林小姐 (1): 3 calls, last → agent04 (per Demo 4 acceptance)
  history.set(ESUN_DEMO_CUSTOMERS[1]!.id as CustomerId, [
    call(1, AGENT_04, 7, 410),
    call(1, AGENT_02, 21, 200),
    call(1, AGENT_04, 35, 150),
  ])
  lastAgents.set(ESUN_DEMO_CUSTOMERS[1]!.id as CustomerId, AGENT_04)

  // 陳先生 (2): 3 calls, last → agent03
  history.set(ESUN_DEMO_CUSTOMERS[2]!.id as CustomerId, [
    call(2, AGENT_03, 2, 520),
    call(2, AGENT_03, 18, 280),
    call(2, AGENT_01, 50, 90),
  ])
  lastAgents.set(ESUN_DEMO_CUSTOMERS[2]!.id as CustomerId, AGENT_03)

  // 黃太太 (3) Risk segment: 5 calls, last → agent04
  history.set(ESUN_DEMO_CUSTOMERS[3]!.id as CustomerId, [
    call(3, AGENT_04, 1, 600),
    call(3, AGENT_04, 4, 480),
    call(3, AGENT_02, 10, 240),
    call(3, AGENT_04, 22, 360),
    call(3, AGENT_01, 55, 120),
  ])
  lastAgents.set(ESUN_DEMO_CUSTOMERS[3]!.id as CustomerId, AGENT_04)

  // 張先生 (4): 2 calls, last → agent01
  history.set(ESUN_DEMO_CUSTOMERS[4]!.id as CustomerId, [
    call(4, AGENT_01, 9, 200),
    call(4, AGENT_02, 40, 150),
  ])
  lastAgents.set(ESUN_DEMO_CUSTOMERS[4]!.id as CustomerId, AGENT_01)

  // 李小姐 (5): 3 calls, last → agent02
  history.set(ESUN_DEMO_CUSTOMERS[5]!.id as CustomerId, [
    call(5, AGENT_02, 3, 330),
    call(5, AGENT_02, 19, 220),
    call(5, AGENT_03, 38, 180),
  ])
  lastAgents.set(ESUN_DEMO_CUSTOMERS[5]!.id as CustomerId, AGENT_02)

  // 周先生 (6): 2 calls, last → agent03
  history.set(ESUN_DEMO_CUSTOMERS[6]!.id as CustomerId, [
    call(6, AGENT_03, 4, 280),
    call(6, AGENT_01, 30, 100),
  ])
  lastAgents.set(ESUN_DEMO_CUSTOMERS[6]!.id as CustomerId, AGENT_03)

  // 吳太太 (7): 2 calls, last → agent04
  history.set(ESUN_DEMO_CUSTOMERS[7]!.id as CustomerId, [
    call(7, AGENT_04, 8, 220),
    call(7, AGENT_03, 25, 170),
  ])
  lastAgents.set(ESUN_DEMO_CUSTOMERS[7]!.id as CustomerId, AGENT_04)

  // 鄭先生 (8): 3 calls, last → agent01
  history.set(ESUN_DEMO_CUSTOMERS[8]!.id as CustomerId, [
    call(8, AGENT_01, 1, 410),
    call(8, AGENT_01, 14, 200),
    call(8, AGENT_02, 33, 130),
  ])
  lastAgents.set(ESUN_DEMO_CUSTOMERS[8]!.id as CustomerId, AGENT_01)

  // 何小姐 VIP (9): 3 calls, last → agent01 (VIP 通常綁定資深 agent)
  history.set(ESUN_DEMO_CUSTOMERS[9]!.id as CustomerId, [
    call(9, AGENT_01, 0, 580, 'outbound'),  // 主動關懷外撥
    call(9, AGENT_01, 6, 450),
    call(9, AGENT_01, 20, 380),
  ])
  lastAgents.set(ESUN_DEMO_CUSTOMERS[9]!.id as CustomerId, AGENT_01)

  return { history, lastAgents }
}
