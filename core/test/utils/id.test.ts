import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newCallId, newUlid, ulidTimestamp } from '../../src/utils/id.js'

test('newUlid produces 26-char Crockford base32 string', () => {
  const ulid = newUlid()
  assert.equal(ulid.length, 26)
  assert.match(ulid, /^[0-9A-HJKMNP-TV-Z]{26}$/)
})

test('newCallId has cal_ prefix + 26 char ULID', () => {
  const id = newCallId()
  assert.match(id, /^cal_[0-9A-HJKMNP-TV-Z]{26}$/)
})

test('ULIDs are time-sortable (lexicographic order matches generation order)', async () => {
  const ids: string[] = []
  for (let i = 0; i < 5; i++) {
    ids.push(newUlid())
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  const sorted = [...ids].sort()
  assert.deepEqual(ids, sorted)
})

test('ulidTimestamp extracts the embedded creation time', () => {
  const before = Date.now()
  const id = newUlid()
  const after = Date.now()
  const ts = ulidTimestamp(id).getTime()
  assert.ok(ts >= before, `ts (${ts}) should be >= before (${before})`)
  assert.ok(ts <= after, `ts (${ts}) should be <= after (${after})`)
})

test('two consecutive ULIDs are different', () => {
  const a = newUlid()
  const b = newUlid()
  assert.notEqual(a, b)
})
