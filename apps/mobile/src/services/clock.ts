import { DemoClock, systemClock, type Clock } from '@mathaka/core';
import { DEMO_MODE } from '../config';

/** The one clock the app uses. Demo time (offset) only exists in DEMO_MODE. */
export const demoClock = new DemoClock();
export const clock: Clock = DEMO_MODE ? demoClock : systemClock;
