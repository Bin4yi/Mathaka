import type { StringKey } from './en';

// Sinhala. Please have a native speaker check every line before release.
export const si: Record<StringKey, string> = {
  'app.name': 'මතකය',
  'common.loading': 'පූරණය වෙමින්…',
  'common.language': 'භාෂාව',

  'role.title': 'මෙම දුරකථනය භාවිත කරන්නේ කවුද?',
  'role.family': 'පවුලේ / මතක සහායක දුරකථනය',
  'role.familyHint': 'බෙහෙත් සකස් කරන්න, දැනුම්දීම් බලන්න.',
  'role.elder': 'වැඩිහිටි දුරකථනය',
  'role.elderHint': 'දිනපතා බෙහෙත් සඳහා විශාල, සරල තිරයක්.',
  'role.later': 'පසුව පවුලේ සැකසුම් තුළින් මෙය වෙනස් කළ හැක.',

  'slot.morning': 'උදේ',
  'slot.noon': 'දවල්',
  'slot.evening': 'හවස',
  'slot.night': 'රෑ',

  'elder.hello': 'ආයුබෝවන්, {name}',
  'elder.today': 'අද බෙහෙත්',
  'elder.taken': 'බිව්වා',
  'elder.notYet': 'තවම නැහැ',
  'elder.tablets': 'පෙති {n}ක්',
  'elder.tablet': 'පෙත්තක්',
  'elder.logoHint': 'පවුලට: තත්පර 3ක් තද කරගෙන සිටින්න',

  'family.title': 'පවුල',
  'family.medicines': 'බෙහෙත්',
  'family.history': 'පසුගිය දින 7',
  'family.taken': 'බිව්වා',
  'family.missed': 'මඟ හැරුණා',
  'family.prevented': 'දෙවරක් බීම නැවැත්තුවා',
  'family.alerts': 'දැනුම්දීම්',
  'family.noAlerts': 'දැනුම්දීම් නැත.',
  'family.alert.missed': '{name} {date} දින {slot} බෙහෙත ගත් බව තහවුරු කළේ නැත.',
  'family.alert.low_stock': '{medicine}: ඉතිරි {remaining}ක් පමණි. ඉක්මනින් නැවත ගන්න.',
  'family.alert.other': 'දැනුම්දීම: {kind}',
  'family.switchRole': 'දුරකථනයේ භූමිකාව වෙනස් කරන්න',
  'family.resetDemo': 'ආදර්ශ දත්ත යළි සකසන්න',
  'family.demo': 'ආදර්ශ ප්‍රකාරය',
  'family.ai': 'AI: {kind}',
  'family.storage': 'ගබඩාව: {kind}',
  'family.left': 'ඉතිරි {n}',
};
