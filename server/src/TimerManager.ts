export class TimerManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();

  start(
    roomId: string,
    durationMs: number,
    onExpire: () => void
  ): void {
    // Clear any existing timer for this room
    this.clear(roomId);

    const timeout = setTimeout(() => {
      this.timers.delete(roomId);
      onExpire();
    }, durationMs);

    this.timers.set(roomId, timeout);
  }

  clear(roomId: string): void {
    const timeout = this.timers.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.timers.delete(roomId);
    }
  }
}
