/**
 * Clock with an optional offset so the family can "jump" to 8:00, 13:00, 20:00, 22:00
 * while recording the demo. The offset is only honoured when demo mode is on.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

export class DemoClock implements Clock {
  constructor(
    private offsetMs = 0,
    private readonly base: Clock = systemClock,
  ) {}

  now(): Date {
    return new Date(this.base.now().getTime() + this.offsetMs);
  }

  getOffsetMs(): number {
    return this.offsetMs;
  }

  setOffsetMs(ms: number): void {
    this.offsetMs = ms;
  }

  /** Jump so that "now" is today at hh:mm (real seconds keep ticking). */
  jumpTo(hours: number, minutes = 0): void {
    const real = this.base.now();
    const target = new Date(real);
    target.setHours(hours, minutes, 0, 0);
    this.offsetMs = target.getTime() - real.getTime();
  }

  reset(): void {
    this.offsetMs = 0;
  }
}

/** Fixed clock for tests. */
export function fixedClock(iso: string | Date): Clock {
  const t = new Date(iso).getTime();
  return { now: () => new Date(t) };
}
