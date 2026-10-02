import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { checkMissed } from './doseService';
import { deliverPending, pushLogToFamily } from './linkService';

// When the app is closed, Android still wakes us up now and then (at least 15 min apart,
// often later, decided by the system). We check for missed doses and send pending alerts.
// Honest limit: this is not exact. The reminders themselves are exact local notifications.

export const CHECK_TASK = 'mathaka-elder-check';

TaskManager.defineTask(CHECK_TASK, async () => {
  try {
    await checkMissed();
    await deliverPending();
    await pushLogToFamily();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerElderBackgroundCheck(): Promise<boolean> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
    if (!(await TaskManager.isTaskRegisteredAsync(CHECK_TASK))) {
      await BackgroundTask.registerTaskAsync(CHECK_TASK, { minimumInterval: 15 });
    }
    return true;
  } catch {
    return false;
  }
}
