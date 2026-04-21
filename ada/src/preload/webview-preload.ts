import { ipcRenderer } from 'electron'

/**
 * Webview preload — runs INSIDE the embedded 3CX Web Client.
 *
 * Detection strategy for 3CX V20 Web Client:
 *   1. Title-based — captures navigation only; title DOES NOT change during
 *      calls in V20, so this is navigation-only signal.
 *   2. DOM-based — polls for the call dialog's unique fingerprint
 *      (presence of Hold/Mute/Transfer/Keypad/Rec buttons together).
 *
 * Rationale: 3CX V20 uses Angular Material with `ng-tns-X-Y` hashed class
 * names that change on every build. Text-based detection is more stable
 * across minor 3CX updates.
 */

type WebClientEvent =
  | { type: 'ready' }
  | { type: 'title'; title: string }
  | { type: 'url'; url: string }
  | { type: 'console'; level: 'log' | 'warn' | 'error'; args: unknown[] }
  | {
      type: 'call'
      subtype: 'started' | 'ended' | 'incoming' | 'outgoing'
      data: { remoteNumber?: string; remoteName?: string; raw?: string }
    }

function send(event: WebClientEvent): void {
  try {
    ipcRenderer.sendToHost('webclient-event', event)
  } catch (err) {
    console.warn('[webview-preload] failed to send event:', err)
  }
}

/** -------- URL + Title observers (navigation signal) -------- */

function watchTitle(): void {
  let last = document.title
  send({ type: 'title', title: last })

  const titleEl = document.querySelector('title')
  if (!titleEl) return

  const obs = new MutationObserver(() => {
    const now = document.title
    if (now !== last) {
      last = now
      send({ type: 'title', title: now })
    }
  })
  obs.observe(titleEl, { childList: true, subtree: true, characterData: true })
}

function watchUrl(): void {
  let last = location.href
  send({ type: 'url', url: last })

  window.addEventListener('hashchange', () => {
    if (location.href !== last) {
      last = location.href
      send({ type: 'url', url: last })
    }
  })
  window.addEventListener('popstate', () => {
    if (location.href !== last) {
      last = location.href
      send({ type: 'url', url: last })
    }
  })
  setInterval(() => {
    if (location.href !== last) {
      last = location.href
      send({ type: 'url', url: last })
    }
  }, 500)
}

/** -------- DOM-based call detector -------- */

/**
 * Unique fingerprint of the in-call UI: these button labels only appear
 * together when the Web Client shows its active call panel. Incoming and
 * idle states do NOT show this combination.
 *
 * We consider the call UI present if at least 3 of these buttons are
 * visible in the DOM (tolerates minor 3CX layout shuffles).
 */
const CALL_UI_LABELS = [
  'Hold',
  'Resume',
  'Mute',
  'Unmute',
  'Transfer',
  'Att Transfer',
  'Conference',
  'Keypad',
  'Rec',
  'New call'
]

/**
 * Incoming-call fingerprint: Answer button visible + phone ringing.
 * Distinct from active-call UI above because before pickup there's no
 * Hold/Mute/Transfer — just Answer + Decline.
 */
const INCOMING_UI_LABELS = ['Answer', 'Accept', 'Decline', 'Reject']

/**
 * Proper visibility check. offsetParent returns null for position:fixed
 * elements (where 3CX's call panel often lives), so we use bounding rect +
 * computed style instead.
 */
function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return false
  const style = getComputedStyle(el)
  if (style.display === 'none') return false
  if (style.visibility === 'hidden' || style.visibility === 'collapse') return false
  if (parseFloat(style.opacity || '1') === 0) return false
  return true
}

function visibleText(el: HTMLElement): string {
  if (!isVisible(el)) return ''
  return (el.textContent ?? '').trim()
}

/**
 * Count how many unique labels appear as (roughly) exact matches in
 * visible button-like elements. Also checks aria-label for accessibility-
 * wrapped widgets.
 */
function countLabelMatches(labels: string[]): { hits: number; matched: string[] } {
  const nodes = Array.from(
    document.querySelectorAll(
      'button, [role="button"], a, span, div, mat-icon'
    )
  ) as HTMLElement[]

  const found = new Set<string>()
  for (const el of nodes) {
    const txt = visibleText(el)
    const aria = el.getAttribute('aria-label')?.trim() ?? ''
    if (!txt && !aria) continue
    for (const label of labels) {
      if (found.has(label)) continue
      const lowLabel = label.toLowerCase()
      if (
        txt.toLowerCase() === lowLabel ||
        aria.toLowerCase() === lowLabel ||
        (txt.length <= label.length + 4 && txt.toLowerCase().includes(lowLabel)) ||
        (aria.length <= label.length + 4 && aria.toLowerCase().includes(lowLabel))
      ) {
        found.add(label)
      }
    }
  }
  return { hits: found.size, matched: Array.from(found) }
}

function domContainsLabels(labels: string[], minHits = 3): boolean {
  return countLabelMatches(labels).hits >= minHits
}

/**
 * Extract the remote phone number shown in the call UI.
 *
 * Heuristic: when the call dialog is up, there is usually a prominently
 * displayed phone number near the top. We search for elements whose text
 * matches /^[+\d][\d\s\-()]{2,}$/ (phone-like) and prefer the largest
 * font-size or earliest in document order.
 */
function extractCallerNumber(): string | null {
  const candidates: { el: HTMLElement; n: string }[] = []
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        if (!(node instanceof HTMLElement)) return NodeFilter.FILTER_SKIP
        if (node.children.length > 0) return NodeFilter.FILTER_SKIP
        const t = (node.textContent ?? '').trim()
        if (!/^[+\d][\d\s\-()]{2,}$/.test(t)) return NodeFilter.FILTER_SKIP
        return NodeFilter.FILTER_ACCEPT
      }
    }
  )
  let cur = walker.nextNode()
  while (cur) {
    const el = cur as HTMLElement
    if (el.offsetParent !== null) {
      candidates.push({ el, n: (el.textContent ?? '').trim() })
    }
    cur = walker.nextNode()
    if (candidates.length > 8) break
  }

  if (candidates.length === 0) return null

  // Prefer the one with the largest computed font-size (headline style).
  candidates.sort((a, b) => {
    const fa = parseFloat(getComputedStyle(a.el).fontSize) || 0
    const fb = parseFloat(getComputedStyle(b.el).fontSize) || 0
    return fb - fa
  })
  return candidates[0].n.replace(/[\s\-()]/g, '')
}

/**
 * Polling-based state machine. Runs every 750ms once the Web Client is ready.
 * Not free, but 750ms is below human-noticeable latency for Screen Pop and
 * light enough to not affect UI.
 */
function countAllTextMatches(labels: string[]): { hits: number; matched: string[] } {
  // Permissive fallback: scan every element in the document, look at both
  // textContent and aria-label. Useful when 3CX renders via Angular Material
  // with deeply-nested elements or custom tags.
  const found = new Set<string>()
  const all = document.getElementsByTagName('*')
  for (let i = 0; i < all.length; i++) {
    const el = all[i] as HTMLElement
    if (!(el instanceof HTMLElement)) continue
    const txt = (el.innerText ?? el.textContent ?? '').trim()
    const aria = el.getAttribute?.('aria-label')?.trim() ?? ''
    if (!txt && !aria) continue
    for (const label of labels) {
      if (found.has(label)) continue
      const low = label.toLowerCase()
      if (
        txt.toLowerCase() === low ||
        aria.toLowerCase() === low ||
        (txt.length <= label.length + 4 && txt.toLowerCase().includes(low)) ||
        (aria.length <= label.length + 4 && aria.toLowerCase().includes(low))
      ) {
        found.add(label)
      }
    }
  }
  return { hits: found.size, matched: Array.from(found) }
}

function startCallWatcher(): void {
  let state: 'idle' | 'incoming' | 'active' = 'idle'
  let lastNumber = ''
  let tick = 0

  setInterval(() => {
    tick++
    const callMatch = countLabelMatches(CALL_UI_LABELS)
    const incomingMatch = countLabelMatches(INCOMING_UI_LABELS)

    // Fallback: scan entire DOM if primary selector found nothing
    const fallbackCall =
      callMatch.hits === 0 ? countAllTextMatches(CALL_UI_LABELS) : callMatch
    const fallbackIncoming =
      incomingMatch.hits === 0
        ? countAllTextMatches(INCOMING_UI_LABELS)
        : incomingMatch

    const inCall = fallbackCall.hits >= 3
    const ringing = !inCall && fallbackIncoming.hits >= 2

    // Unconditional heartbeat every ~5 seconds.
    if (tick % 7 === 0) {
      console.warn(
        `[webview-preload] tick ${tick} | primary call=${callMatch.hits} [${callMatch.matched.join(',')}] ringing=${incomingMatch.hits} [${incomingMatch.matched.join(',')}] | fallback call=${fallbackCall.hits} [${fallbackCall.matched.join(',')}] ringing=${fallbackIncoming.hits} [${fallbackIncoming.matched.join(',')}]`
      )
    }

    if (ringing && state !== 'incoming') {
      state = 'incoming'
      lastNumber = extractCallerNumber() ?? ''
      send({
        type: 'call',
        subtype: 'incoming',
        data: { remoteNumber: lastNumber || undefined }
      })
      return
    }

    if (inCall && state !== 'active') {
      state = 'active'
      const n = extractCallerNumber()
      if (n) lastNumber = n
      send({
        type: 'call',
        subtype: 'started',
        data: { remoteNumber: lastNumber || undefined }
      })
      return
    }

    if (!inCall && !ringing && state !== 'idle') {
      state = 'idle'
      send({
        type: 'call',
        subtype: 'ended',
        data: { remoteNumber: lastNumber || undefined }
      })
      lastNumber = ''
    }
  }, 750) // 7 ticks × 750ms ≈ 5s → heartbeat cadence
}

/** -------- Console relay (debug aid) -------- */

function relayConsole(): void {
  const levels: Array<'warn' | 'error'> = ['warn', 'error']
  for (const level of levels) {
    const original = console[level].bind(console)
    console[level] = (...args: unknown[]) => {
      original(...args)
      try {
        send({
          type: 'console',
          level,
          args: args.map((a) => {
            try {
              if (a instanceof Error) return `${a.name}: ${a.message}`
              if (typeof a === 'object' && a !== null)
                return JSON.stringify(a).slice(0, 500)
              return String(a)
            } catch {
              return '<unserializable>'
            }
          })
        })
      } catch {
        // ignore
      }
    }
  }
}

function init(): void {
  send({ type: 'ready' })
  watchTitle()
  watchUrl()
  relayConsole()
  startCallWatcher()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
