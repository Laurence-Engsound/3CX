/**
 * E.164 phone number normalization.
 * Goal: take messy input ('0912-345-678', '+886 912 345 678') → '+886912345678'
 *
 * NOT a full libphonenumber replacement — handles common Taiwan + simple international cases.
 * For production with global support, swap to libphonenumber-js.
 */

export interface NormalizePhoneOptions {
  /** Default country dialing code if input has no '+'. e.g., '886' for Taiwan, '1' for US. */
  defaultCountryCode?: string
}

const DEFAULTS: Required<NormalizePhoneOptions> = {
  defaultCountryCode: '886', // Taiwan
}

/**
 * Strip non-digit chars and normalize to E.164 (+ prefix + digits only).
 * Throws if result is not a plausible E.164 number.
 */
export function normalizePhone(raw: string, options: NormalizePhoneOptions = {}): string {
  const opts = { ...DEFAULTS, ...options }
  if (!raw || typeof raw !== 'string') {
    throw new Error('normalizePhone: input must be a non-empty string')
  }

  const trimmed = raw.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/[^\d]/g, '')

  if (digits.length === 0) {
    throw new Error(`normalizePhone: no digits in input "${raw}"`)
  }

  let result: string
  if (hasPlus) {
    result = `+${digits}`
  } else if (digits.startsWith('0') && opts.defaultCountryCode === '886') {
    // Taiwan trunk prefix '0' → strip and prepend country code
    result = `+${opts.defaultCountryCode}${digits.slice(1)}`
  } else {
    result = `+${opts.defaultCountryCode}${digits}`
  }

  // E.164 max length 15 digits (excluding +); min length 8 (e.g., +X1234567)
  const resultDigits = result.slice(1)
  if (resultDigits.length < 8 || resultDigits.length > 15) {
    throw new Error(`normalizePhone: resulting "${result}" outside E.164 length 8-15`)
  }

  return result
}

/** Cheap validity check (does NOT verify country format). */
export function isValidE164(phone: string): boolean {
  return /^\+\d{8,15}$/.test(phone)
}
