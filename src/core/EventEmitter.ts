// 《星野栖所》简单事件发射器

type EventListener = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, EventListener[]>;

  constructor() {
    this.events = new Map();
  }

  public on(event: string, listener: EventListener): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  public off(event: string, listener: EventListener): void {
    if (!this.events.has(event)) return;
    
    const listeners = this.events.get(event)!;
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  public emit(event: string, ...args: any[]): void {
    if (!this.events.has(event)) return;
    
    const listeners = this.events.get(event)!;
    for (const listener of listeners) {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    }
  }

  public once(event: string, listener: EventListener): void {
    const onceListener = (...args: any[]) => {
      listener(...args);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }

  public removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  public listenerCount(event: string): number {
    return this.events.has(event) ? this.events.get(event)!.length : 0;
  }
}
