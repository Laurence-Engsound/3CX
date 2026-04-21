import { onUnmounted } from 'vue'
import type { MainToRendererChannel } from '../../../shared/ipc-api'

/**
 * Subscribe to a Main → Renderer event for the lifetime of the current
 * component. The underlying listener is automatically removed in
 * onUnmounted so there are no leaks when the view switches.
 */
export function useMainEvent(
  channel: MainToRendererChannel,
  handler: (...args: unknown[]) => void
): void {
  const dispose = window.ada.on(channel, handler)
  onUnmounted(dispose)
}
