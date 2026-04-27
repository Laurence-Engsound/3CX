import type { CustomerRef } from '@voxen/core'

/**
 * 玉山 demo 假客戶資料 — 10 筆
 *
 * 用於 lab demo + e2e smoke test。所有 phone number 已 normalize 到 E.164。
 * Customer IDs 故意使用可預測 pattern，方便 hardcode 測試斷言。
 *
 * 對應 ESUN-MASTER-CHECKLIST P1-D02 acceptance：
 *   "CRM mock 可查 0912-XXX-001 王先生"
 */

const TENANT_ID = 'tnt_01HQR0WMRP4Y3M0000000000ES' as const  // 玉山 demo tenant (ES = E.SUN, suffix mnemonic)

// Fixed-pattern ULIDs for deterministic mock data (26-char Crockford base32)
// Real production data uses crypto-random ULIDs from @voxen/core utils.
const CUSTOMER_ID_PREFIX = '01HQR0WMRP4Y3M0000000'  // 21 chars

function makeCustomerId(suffix: string): string {
  if (suffix.length !== 5) throw new Error(`suffix must be exactly 5 chars, got "${suffix}"`)
  return `cust_${CUSTOMER_ID_PREFIX}${suffix}`
}

export const ESUN_DEMO_CUSTOMERS: readonly CustomerRef[] = [
  {
    id: makeCustomerId('00001'),
    tenantId: TENANT_ID,
    displayName: '王先生',
    primaryPhone: '+886912345001',
    segment: 'Standard',
    language: 'zh-TW',
    lastContactAt: '2026-04-22T10:14:33Z',
  },
  {
    id: makeCustomerId('00002'),
    tenantId: TENANT_ID,
    displayName: '林小姐',
    primaryPhone: '+886912345002',
    segment: 'Standard',
    language: 'zh-TW',
    lastContactAt: '2026-04-20T15:42:11Z',
  },
  {
    id: makeCustomerId('00003'),
    tenantId: TENANT_ID,
    displayName: '陳先生',
    primaryPhone: '+886912345003',
    segment: 'Standard',
    language: 'zh-TW',
    lastContactAt: '2026-04-25T09:08:55Z',
  },
  {
    id: makeCustomerId('00004'),
    tenantId: TENANT_ID,
    displayName: '黃太太',
    primaryPhone: '+886912345004',
    segment: 'Risk',  // 高關注客戶
    language: 'zh-TW',
    lastContactAt: '2026-04-26T11:30:00Z',
  },
  {
    id: makeCustomerId('00005'),
    tenantId: TENANT_ID,
    displayName: '張先生',
    primaryPhone: '+886912345005',
    segment: 'Standard',
    language: 'zh-TW',
    lastContactAt: '2026-04-18T14:22:18Z',
  },
  {
    id: makeCustomerId('00006'),
    tenantId: TENANT_ID,
    displayName: '李小姐',
    primaryPhone: '+886912345006',
    segment: 'Standard',
    language: 'zh-TW',
    lastContactAt: '2026-04-24T16:45:02Z',
  },
  {
    id: makeCustomerId('00007'),
    tenantId: TENANT_ID,
    displayName: '周先生',
    primaryPhone: '+886912345007',
    segment: 'Standard',
    language: 'zh-TW',
    lastContactAt: '2026-04-23T08:55:44Z',
  },
  {
    id: makeCustomerId('00008'),
    tenantId: TENANT_ID,
    displayName: '吳太太',
    primaryPhone: '+886912345008',
    segment: 'Standard',
    language: 'zh-TW',
    lastContactAt: '2026-04-19T13:11:27Z',
  },
  {
    id: makeCustomerId('00009'),
    tenantId: TENANT_ID,
    displayName: '鄭先生',
    primaryPhone: '+886912345009',
    segment: 'Standard',
    language: 'zh-TW',
    lastContactAt: '2026-04-26T10:20:15Z',
  },
  {
    id: makeCustomerId('0000A'),
    tenantId: TENANT_ID,
    displayName: '何小姐',
    primaryPhone: '+886912345010',
    segment: 'VIP',  // VIP 客戶（demo highlight）
    language: 'zh-TW',
    lastContactAt: '2026-04-27T08:00:00Z',
  },
] as const
