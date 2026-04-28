/**
 * Smoke test for src/main/phone.ts (W2D5).
 *
 * ada doesn't have a vitest setup yet (Phase 1-5 ran without one), so this
 * file is a plain Node ESM script that can be run after a manual TS compile:
 *
 *   $ npx tsc --module nodenext --moduleResolution nodenext --target es2022 \
 *       --outDir test/_compiled src/main/phone.ts
 *   $ node test/phone.smoke.mjs
 *
 * When we wire vitest into ada (W3+), promote these cases into a proper
 * spec under test/ and delete this script.
 */

import { normalizePhoneTW } from './_compiled/main/phone.js'

const cases = [
  // [input, expected, label]
  ['+886912345001', '+886912345001', 'already E.164'],
  ['886912345001', '+886912345001', 'TW intl no plus'],
  ['0912345001', '+886912345001', 'TW local mobile'],
  ['0912-345-001', '+886912345001', 'TW mobile dashed'],
  ['0912 345 001', '+886912345001', 'TW mobile spaced'],
  ['02-2345-6789', '+886223456789', 'TW landline'],
  ['(02)2345-6789', '+886223456789', 'TW landline parens'],
  ['sip:0912345001@pbx.example.com', '+886912345001', 'SIP URI mobile'],
  ['sip:+886912345001@pbx', '+886912345001', 'SIP URI E.164'],
  ['tel:+886912345001', '+886912345001', 'tel: scheme'],
  ['1004', null, 'extension 4-digit'],
  ['100', null, 'extension 3-digit'],
  ['', null, 'empty'],
  [null, null, 'null'],
  [undefined, null, 'undefined'],
  ['   ', null, 'whitespace'],
  ['abc', null, 'no digits'],
  ['+1-415-555-1234', '+14155551234', 'US E.164 dashed'],
  ['+44 20 7946 0000', '+442079460000', 'UK E.164'],
  ['+886912345002', '+886912345002', 'esun customer 2'],
  ['+886-912-345-003', '+886912345003', 'esun w/ dashes'],
]

let pass = 0, fail = 0
for (const [input, expected, label] of cases) {
  const got = normalizePhoneTW(input)
  const ok = got === expected
  const mark = ok ? '✓' : '✗'
  const inDisp = input === undefined ? '<undefined>' : JSON.stringify(input)
  console.log(`${mark} ${label.padEnd(28)} ${inDisp.padEnd(40)} → ${JSON.stringify(got) ?? 'null'}` +
    (ok ? '' : `  EXPECTED ${JSON.stringify(expected) ?? 'null'}`))
  if (ok) pass++; else fail++
}

console.log(`\n${pass}/${pass + fail} pass`)
process.exit(fail === 0 ? 0 : 1)
