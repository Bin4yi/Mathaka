import type { uiEn } from './ui.en';

// Dashboard strings. Sinhala. Please have a native speaker check.
export const uiSi: Record<keyof typeof uiEn, string> = {
  'greet.morning': 'සුබ උදෑසනක්',
  'greet.noon': 'සුබ දහවලක්',
  'greet.evening': 'සුබ සන්ධ්‍යාවක්',
  'greet.night': 'සුබ රාත්‍රියක්',
  'dash.dosesToday': 'අද මාත්‍රා {total}න් {n}ක්',
  'dash.next': 'ඊළඟට: {slot}, {time}ට විතර',
  'dash.allDone': 'අද සියලු බෙහෙත් ඉවරයි.',
  'dash.quick': 'ඉක්මන් ක්‍රියා',
  'dash.stockDays': 'දින {n}ක් පමණ ඉතිරියි',
  'dash.unread': 'අලුත් {n}',
};
