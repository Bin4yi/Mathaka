// Jest setup: demo mode on (demo clock), in-memory storage instead of SQLite.
process.env.EXPO_PUBLIC_DEMO_MODE = 'true';

jest.mock('./src/db/createRepository', () => {
  const { MemoryRepository } = jest.requireActual('./src/db/memoryRepository');
  return { createRepository: () => new MemoryRepository() };
});

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(async () => []),
}));

jest.mock('expo-brightness', () => ({
  getBrightnessAsync: jest.fn(async () => 0.5),
  setBrightnessAsync: jest.fn(async () => {}),
}));

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { HIGH: 4 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), remove: jest.fn() })),
  useAudioRecorder: jest.fn(() => ({ prepareToRecordAsync: jest.fn(), record: jest.fn(), stop: jest.fn(), uri: null })),
  useAudioRecorderState: jest.fn(() => ({ isRecording: false, durationMillis: 0 })),
  setAudioModeAsync: jest.fn(),
  AudioModule: { requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true })) },
  RecordingPresets: { HIGH_QUALITY: {} },
}));
