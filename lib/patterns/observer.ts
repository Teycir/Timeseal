// Observer Pattern - Event System for Seal Lifecycle
export type EventCallback<T = any> = (data: T) => void;

export class EventEmitter<Events extends Record<string, any> = Record<string, any>> {
  private listeners = new Map<keyof Events, Set<EventCallback>>();

  on<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

export interface SealEvents {
  'seal:created': { sealId: string; isDMS: boolean; ip: string };
  'seal:unlocked': { sealId: string; ip: string };
  'seal:deleted': { sealId: string };
  'pulse:received': { sealId: string; ip: string };
}

export const sealEvents = new EventEmitter<SealEvents>();
