// Web preview: no background tasks.
export const CHECK_TASK = 'mathaka-elder-check';
export async function registerElderBackgroundCheck(): Promise<boolean> {
  return false;
}
