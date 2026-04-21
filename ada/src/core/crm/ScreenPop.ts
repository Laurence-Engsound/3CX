import type { ScreenPopConfig, CallDirection } from '../../shared/types'

export interface ScreenPopContext {
  caller: string
  callId: string
  direction: CallDirection
}

/**
 * Substitute known placeholders in the URL template with the actual call
 * context, URL-encoding each value. Unknown placeholders are left alone so
 * the user can spot the typo at runtime.
 *
 * Supported placeholders:
 *   {caller}    — the remote number
 *   {callId}    — SIP Call-ID
 *   {direction} — "inbound" | "outbound"
 */
export function renderScreenPopUrl(
  template: string,
  ctx: ScreenPopContext
): string {
  return template
    .replaceAll('{caller}', encodeURIComponent(ctx.caller))
    .replaceAll('{callId}', encodeURIComponent(ctx.callId))
    .replaceAll('{direction}', encodeURIComponent(ctx.direction))
}

/**
 * Returns true if Screen Pop should fire for this call, according to config.
 */
export function shouldScreenPop(
  config: ScreenPopConfig,
  direction: CallDirection
): boolean {
  if (!config.enabled) return false
  if (!config.urlTemplate.trim()) return false
  return config.triggerOn.includes(direction)
}

/**
 * Perform the pop by delegating to the main process.
 *
 * Expects to run inside the Renderer (uses window.ada).
 */
export async function triggerScreenPop(
  config: ScreenPopConfig,
  ctx: ScreenPopContext
): Promise<void> {
  if (!shouldScreenPop(config, ctx.direction)) return
  const url = renderScreenPopUrl(config.urlTemplate, ctx)
  await window.ada.screenPop.openUrl(url)
}
