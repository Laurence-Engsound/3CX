import type { Event } from '../models/Event.js'
import type { IEventBus, EventHandler, Subscription } from '../contracts/EventBus.js'

interface SubRecord {
  pattern: string
  handler: EventHandler
}

/**
 * Default in-process event bus.
 * Single-process pub/sub. For multi-process / multi-region deployments
 * swap to NATS / Kafka / Redis Streams (decision pending — see CANONICAL-MODEL.md §11).
 */
export class InProcessEventBus implements IEventBus {
  private subs: Set<SubRecord> = new Set()

  async publish(event: Event): Promise<void> {
    const matching: SubRecord[] = []
    for (const sub of this.subs) {
      if (this.matchesPattern(sub.pattern, event.type)) {
        matching.push(sub)
      }
    }
    // Run handlers concurrently; collect errors but don't fail publish().
    // Wrap in async so synchronous throws also become rejections.
    const results = await Promise.allSettled(
      matching.map(async (s) => s.handler(event)),
    )
    for (const r of results) {
      if (r.status === 'rejected') {
        // eslint-disable-next-line no-console
        console.error('[InProcessEventBus] handler error:', r.reason)
      }
    }
  }

  subscribe(pattern: string, handler: EventHandler): Subscription {
    const record: SubRecord = { pattern, handler }
    this.subs.add(record)
    return {
      unsubscribe: () => {
        this.subs.delete(record)
      },
    }
  }

  subscriberCount(): number {
    return this.subs.size
  }

  private matchesPattern(pattern: string, eventType: string): boolean {
    if (pattern === eventType) return true
    if (pattern === '*' || pattern === '*.*') return true
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2) // strip '.*'
      return eventType === prefix || eventType.startsWith(`${prefix}.`)
    }
    return false
  }
}
