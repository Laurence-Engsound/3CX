// W2D6 Bar status state machine — pure-function smoke test.
// Mirrors applyEventToStatus from BarView.vue verbatim so we can verify
// transitions without a Vue/JSDOM environment.

function applyEventToStatus(prev, event) {
  const t = event.type ?? ''
  if (t === 'system.adapter.started') return 'ready'
  if (t === 'system.adapter.stopped' || t === 'system.adapter.error') return 'offline'
  if (t === 'system.adapter.health_changed') {
    const healthy = event.payload?.healthy ?? false
    return healthy ? (prev === 'offline' ? 'ready' : prev) : 'offline'
  }
  if (t === 'call.ringing') {
    return prev === 'busy' || prev === 'ringing' ? prev : 'ringing'
  }
  if (t === 'call.answered') return 'busy'
  if (t === 'call.hold' || t === 'call.unhold' || t === 'call.transferred') {
    return prev === 'busy' ? 'busy' : prev
  }
  if (t === 'call.ended') {
    if (prev === 'ringing') return 'ready'
    if (prev === 'busy') return 'acw'
    return prev
  }
  return prev
}

const cases = [
  // Boot scenario: offline → ready when adapter starts
  ['offline', { type: 'system.adapter.started' }, 'ready', 'boot: offline→ready'],

  // Healthy inbound call lifecycle
  ['ready',   { type: 'call.ringing' },   'ringing', 'inbound: ready→ringing'],
  ['ringing', { type: 'call.answered' },  'busy',    'answer: ringing→busy'],
  ['busy',    { type: 'call.ended' },     'acw',     'hangup after answer: busy→acw'],

  // Abandoned call
  ['ringing', { type: 'call.ended' },     'ready',   'abandoned: ringing→ready (no ACW)'],

  // Hold / unhold / transfer keep us busy
  ['busy',    { type: 'call.hold' },      'busy',    'hold: busy→busy'],
  ['busy',    { type: 'call.unhold' },    'busy',    'unhold: busy→busy'],
  ['busy',    { type: 'call.transferred' }, 'busy',  'transfer: busy→busy'],

  // Adapter dies anywhere → offline
  ['ready',   { type: 'system.adapter.stopped' }, 'offline', 'adapter stop: ready→offline'],
  ['busy',    { type: 'system.adapter.error' },   'offline', 'adapter error mid-call: busy→offline'],
  ['ringing', { type: 'system.adapter.error' },   'offline', 'adapter error mid-ring: ringing→offline'],

  // Health change events
  ['offline', { type: 'system.adapter.health_changed', payload: { healthy: true } }, 'ready', 'recover: offline→ready'],
  ['ready',   { type: 'system.adapter.health_changed', payload: { healthy: false } }, 'offline', 'unhealthy: ready→offline'],
  ['busy',    { type: 'system.adapter.health_changed', payload: { healthy: true } }, 'busy', 'still healthy mid-call: busy stays'],

  // Duplicate call.ringing (e.g., consultation call) shouldn't bounce us
  ['busy',    { type: 'call.ringing' },   'busy',    'ringing while busy: stays busy'],
  ['ringing', { type: 'call.ringing' },   'ringing', 'duplicate ring: stays ringing'],

  // Unknown events — don't bork
  ['ready',   { type: 'agent.skills_updated' }, 'ready', 'unknown event keeps state'],

  // Edge: call.ended in ready state (shouldn't happen but safe)
  ['ready',   { type: 'call.ended' },     'ready',   'stray call.ended in ready: stays'],
]

let pass = 0, fail = 0
for (const [prev, event, expected, label] of cases) {
  const got = applyEventToStatus(prev, event)
  const ok = got === expected
  console.log(`${ok ? '✓' : '✗'} ${label.padEnd(45)} (${prev} + ${event.type}) → ${got}${ok ? '' : `  EXPECTED ${expected}`}`)
  if (ok) pass++; else fail++
}
console.log(`\n${pass}/${pass + fail} pass`)
process.exit(fail === 0 ? 0 : 1)
