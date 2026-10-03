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
  'box.section': "පෙති පෙට්ටිය (Bluetooth)",
  'box.hint': "බොන්න ඕන කොටුව එළිය කරන අමතර පෙට්ටියක්. එළිය ඇති කොටුව එබීම \"මම බිව්වා\" ලෙස ගැනේ.",
  'box.find': "පෙති පෙට්ටිය සොයන්න",
  'box.searching': "පෙති පෙට්ටිය සොයමින්…",
  'box.connected': "පෙති පෙට්ටිය සම්බන්ධයි.",
  'box.notConnected': "පෙති පෙට්ටියක් සම්බන්ධ නැත. තිරයේ පෙට්ටිය භාවිත වේ.",
  'box.notFound': "පෙති පෙට්ටිය හමු නොවුණා. එය ක්‍රියාත්මකද, දුරකථනය ළඟද?",
  'box.noPermission': "කරුණාකර Mathaka ට Bluetooth අවසර දෙන්න.",
  'box.unsupported': "පෙති පෙට්ටියට Mathaka යෙදුම් build එක අවශ්‍යයි (Expo Go හෝ වෙබ් පෙරදසුන නොවේ).",
  'box.forget': "මෙම පෙට්ටිය අමතක කරන්න",
  'family.alert.unsure_check': "{name}: {slot} කොටුව වෙනත් වේලාවක විවෘත කළා. කරුණාකර පෙති බලන්න.",
  'family.alert.new_pill': "{name} අලුත් වගේ පෙත්තක් පෙන්නුවා. කරුණාකර බලා නැවත සකසන්න.",
};
