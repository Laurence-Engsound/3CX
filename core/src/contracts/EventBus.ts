import type { Event } from '../models/Event.js'

export type EventHandler = (event: Event) => void | Promise<void>

export interface Subscription {
  unsubscribe(): void
}

export interface IEventBus {
  /** Publish an event to all matching subscribers. */
  publish(event: Event): Promise<void>

  /**
   * Subscribe to events matching the type pattern.
   * Pattern syntax: exact match, or wildcard at end ('call.*' matches 'call.ringing', 'call.ended', etc.)
   */
  subscribe(pattern: string, handler: EventHandler): Subscription

  /** Number of active subscriptions (debug/observability). */
  subscriberCount(): number
}
