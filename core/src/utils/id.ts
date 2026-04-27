/**
 * ULID generator — Crockford base32, time-sortable.
 * Spec: https://github.com/ulid/spec
 *
 * Format: 26 chars total
 *   - First 10 chars: 48-bit timestamp (ms since epoch)
 *   - Last 16 chars:  80-bit randomness
 *
 * Example: 01HXY8K3JQ5G7Z9V2N4M8P6R3T
 */

import { randomBytes } from 'node:crypto'

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford base32 (no I, L, O, U)
const ENCODING_LEN = ENCODING.length // 32

const TIME_LEN = 10
const RANDOM_LEN = 16

function encodeTime(now: number): string {
  let str = ''
  for (let i = TIME_LEN - 1; i >= 0; i--) {
    const mod = now % ENCODING_LEN
    str = ENCODING[mod] + str
    now = (now - mod) / ENCODING_LEN
  }
  return str
}

function encodeRandom(): string {
  const bytes = randomBytes(10) // 80 bits
  let str = ''
  let buffer = 0
  let bufferBits = 0
  for (const b of bytes) {
    buffer = (buffer << 8) | b
    bufferBits += 8
    while (bufferBits >= 5) {
      bufferBits -= 5
      str += ENCODING[(buffer >>> bufferBits) & 0x1f]
    }
  }
  if (bufferBits > 0) {
    str += ENCODING[(buffer << (5 - bufferBits)) & 0x1f]
  }
  return str.slice(0, RANDOM_LEN)
}

/** Generate a new raw ULID (no prefix). */
export function newUlid(): string {
  return encodeTime(Date.now()) + encodeRandom()
}

// Typed ID generators with prefix
export function newTenantId(): `tnt_${string}` { return `tnt_${newUlid()}` }
export function newAgentId(): `agt_${string}` { return `agt_${newUlid()}` }
export function newQueueId(): `que_${string}` { return `que_${newUlid()}` }
export function newCustomerId(): `cust_${string}` { return `cust_${newUlid()}` }
export function newCallId(): `cal_${string}` { return `cal_${newUlid()}` }
export function newRecordingId(): `rec_${string}` { return `rec_${newUlid()}` }
export function newEventId(): `evt_${string}` { return `evt_${newUlid()}` }
export function newGroupId(): `grp_${string}` { return `grp_${newUlid()}` }
export function newUserId(): `usr_${string}` { return `usr_${newUlid()}` }
export function newInteractionId(): `int_${string}` { return `int_${newUlid()}` }

/** Extract the timestamp embedded in a ULID. */
export function ulidTimestamp(ulid: string): Date {
  const timeStr = ulid.slice(0, TIME_LEN)
  let time = 0
  for (const char of timeStr) {
    const idx = ENCODING.indexOf(char.toUpperCase())
    if (idx === -1) throw new Error(`Invalid ULID character: ${char}`)
    time = time * ENCODING_LEN + idx
  }
  return new Date(time)
}
