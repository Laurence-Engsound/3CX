/**
 * Phone number normalization helpers for VOXEN/ada (Phase 6 W2D5).
 *
 * RELATIONSHIP TO @voxen/core/utils/phone:
 *   The platform package exports normalizePhone() which throws on invalid
 *   input and assumes the caller already knows it's holding a phone number.
 *   This file's normalizePhoneTW() is the "hot-path / untrusted source"
 *   variant — it accepts null/undefined, returns null instead of throwing,
 *   strips SIP/tel URI scheme, and rejects PBX extensions (≤5 digits)
 *   so we don't accidentally lookup '1004' in the customer DB.
 *
 *   Use core's normalizePhone() when you have user-supplied / settings
 *   data and want loud failure. Use this one when you're parsing
 *   adapter event payloads where the field may not be a phone at all.
 *   When @voxen/core grows a non-throwing variant (W3+), consolidate.
 *
 * 3CX V20 emits caller numbers in many shapes depending on inbound trunk,
 * outbound dial-out, internal extension, or vendor-prefixed format:
 *
 *   '+886912345001'    — already E.164 (international SIP trunk)
 *   '886912345001'     — international without '+'
 *   '0912345001'       — Taiwan local mobile (10 digits, leading 0)
 *   '02-2345-6789'     — Taiwan landline with separators
 *   '0912 345 001'     — separators (space)
 *   '1004' / '8001'    — internal extension (3-5 digits) — NOT a customer
 *   'sip:user@host'    — SIP URI (we extract digits before '@')
 *
 * The CRM lookup adapters (e.g. crm-mock 玉山 dataset) key by E.164, so any
 * caller number must be normalized to '+886...' before the lookup or we get
 * silent misses.
 *
 * The functions here are pure / side-effect free / TZ-default Taiwan (+886)
 * — easy to unit-test and easy to swap for a fully fledged libphonenumber
 * impl in W3+.
 */

/** Default country dialing code (Taiwan). Centralised so we can ship per-tenant later. */
export const DEFAULT_COUNTRY_CODE = '886'

/**
 * Normalize a raw caller string to E.164 ('+886...'), TW-default.
 *
 * Returns null if:
 *   - input is empty / whitespace
 *   - input looks like a PBX extension (≤5 digits)
 *   - input has no recognisable digit content
 *
 * Returns the normalized '+...' string for plausible phone numbers; for
 * unknown international formats (no recognisable TW prefix), returns the
 * digit-only form WITHOUT '+' so downstream callers can decide whether to
 * accept it as-is.
 *
 * Examples:
 *   normalizePhoneTW('+886912345001')   → '+886912345001'
 *   normalizePhoneTW('886912345001')    → '+886912345001'
 *   normalizePhoneTW('0912345001')      → '+886912345001'
 *   normalizePhoneTW('0912-345-001')    → '+886912345001'
 *   normalizePhoneTW('02-2345-6789')    → '+886223456789'
 *   normalizePhoneTW('sip:0912345001@pbx.example.com') → '+886912345001'
 *   normalizePhoneTW('1004')            → null  (extension)
 *   normalizePhoneTW('')                → null
 *   normalizePhoneTW(null)              → null
 *   normalizePhoneTW('+1-415-555-1234') → '+14155551234'
 */
export function normalizePhoneTW(raw: string | null | undefined): string | null {
  if (!raw) return null

  // Strip SIP URI scheme + host: 'sip:0912345001@pbx.example.com' → '0912345001'
  let s = String(raw).trim()
  if (!s) return null
  if (s.toLowerCase().startsWith('sip:') || s.toLowerCase().startsWith('tel:')) {
    s = s.slice(4)
  }
  const atIdx = s.indexOf('@')
  if (atIdx > 0) s = s.slice(0, atIdx)

  // Preserve a leading '+' if present
  const hadPlus = s.startsWith('+')

  // Strip all non-digit chars
  const digits = s.replace(/\D/g, '')
  if (!digits) return null

  // PBX extension — definitely not a customer number
  if (digits.length <= 5) return null

  // Already in E.164 form
  if (hadPlus) {
    // Sanity range check: E.164 max 15 digits, min realistic 8
    if (digits.length < 8 || digits.length > 15) return null
    return '+' + digits
  }

  // Taiwan international without '+': '886912345001' (12 digits incl 886)
  if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length >= 11 && digits.length <= 13) {
    return '+' + digits
  }

  // Taiwan local with leading 0:
  //   mobile: 0912345001 (10 digits)
  //   landline 02-XXXXXXXX (9 digits) / 03-XXXXXXX (9 digits) / etc
  if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 11) {
    return '+' + DEFAULT_COUNTRY_CODE + digits.slice(1)
  }

  // Foreign / unknown format — return digits as-is (no '+'). Downstream
  // callers can either accept or reject; the lookup will simply miss in
  // crm-mock which is fine.
  if (digits.length >= 8 && digits.length <= 15) {
    return digits
  }

  return null
}
