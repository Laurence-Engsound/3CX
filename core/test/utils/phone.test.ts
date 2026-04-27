import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizePhone, isValidE164 } from '../../src/utils/phone.js'

test('Taiwan mobile with leading 0 normalizes correctly', () => {
  assert.equal(normalizePhone('0912345678'), '+886912345678')
})

test('handles dashes and spaces', () => {
  assert.equal(normalizePhone('0912-345-678'), '+886912345678')
  assert.equal(normalizePhone('+886 912 345 678'), '+886912345678')
})

test('preserves explicit country code', () => {
  assert.equal(normalizePhone('+14155551234'), '+14155551234')
  assert.equal(normalizePhone('+1 (415) 555-1234'), '+14155551234')
})

test('overrides default country code via option', () => {
  assert.equal(
    normalizePhone('5551234567', { defaultCountryCode: '1' }),
    '+15551234567',
  )
})

test('throws on empty input', () => {
  assert.throws(() => normalizePhone(''))
  assert.throws(() => normalizePhone('   '))
})

test('throws on too-short result', () => {
  assert.throws(() => normalizePhone('123'))  // 3 digits + '886' = 6 < 8
})

test('isValidE164 accepts valid forms', () => {
  assert.equal(isValidE164('+886912345678'), true)
  assert.equal(isValidE164('+14155551234'), true)
  assert.equal(isValidE164('+1234567890123456'), false)  // 16 digits = too long
  assert.equal(isValidE164('886912345678'), false)       // missing +
  assert.equal(isValidE164('+886-912-345-678'), false)   // contains dashes
})
