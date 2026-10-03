import type { uiEn } from './ui.en';

// Dashboard strings. Tamil. Please have a native speaker check.
export const uiTa: Record<keyof typeof uiEn, string> = {
  'greet.morning': 'காலை வணக்கம்',
  'greet.noon': 'மதிய வணக்கம்',
  'greet.evening': 'மாலை வணக்கம்',
  'greet.night': 'இரவு வணக்கம்',
  'dash.dosesToday': 'இன்று {total} இல் {n} அளவுகள்',
  'dash.next': 'அடுத்து: {slot}, சுமார் {time}',
  'dash.allDone': 'இன்றைய எல்லா மருந்துகளும் முடிந்தன.',
  'dash.quick': 'விரைவுச் செயல்கள்',
  'dash.stockDays': 'சுமார் {n} நாட்கள் மீதம்',
  'dash.unread': '{n} புதியவை',
};
