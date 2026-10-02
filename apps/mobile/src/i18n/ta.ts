import type { StringKey } from './en';

// Tamil. Please have a native speaker check every line before release.
export const ta: Record<StringKey, string> = {
  'app.name': 'Mathaka',
  'common.loading': 'ஏற்றுகிறது…',
  'common.language': 'மொழி',

  'role.title': 'இந்த தொலைபேசியை யார் பயன்படுத்துவார்?',
  'role.family': 'குடும்பம் / நினைவு உதவியாளர் தொலைபேசி',
  'role.familyHint': 'மருந்துகளை அமைத்து எச்சரிக்கைகளைப் பாருங்கள்.',
  'role.elder': 'முதியவர் தொலைபேசி',
  'role.elderHint': 'தினசரி மருந்துக்கான பெரிய, எளிய திரை.',
  'role.later': 'இதை பின்னர் குடும்ப அமைப்புகளில் மாற்றலாம்.',

  'slot.morning': 'காலை',
  'slot.noon': 'மதியம்',
  'slot.evening': 'மாலை',
  'slot.night': 'இரவு',

  'elder.hello': 'வணக்கம், {name}',
  'elder.today': 'இன்றைய மருந்து',
  'elder.taken': 'எடுத்தாயிற்று',
  'elder.notYet': 'இன்னும் இல்லை',
  'elder.tablets': '{n} மாத்திரைகள்',
  'elder.tablet': '1 மாத்திரை',
  'elder.logoHint': 'குடும்பம்: 3 விநாடிகள் அழுத்திப் பிடிக்கவும்',

  'family.title': 'குடும்பம்',
  'family.medicines': 'மருந்துகள்',
  'family.history': 'கடந்த 7 நாட்கள்',
  'family.taken': 'எடுத்தது',
  'family.missed': 'தவறியது',
  'family.prevented': 'இரட்டை அளவு தடுக்கப்பட்டது',
  'family.alerts': 'எச்சரிக்கைகள்',
  'family.noAlerts': 'எச்சரிக்கைகள் இல்லை.',
  'family.alert.missed': '{name} {date} அன்று {slot} மருந்தை உறுதிப்படுத்தவில்லை.',
  'family.alert.low_stock': '{medicine}: {remaining} மட்டுமே உள்ளது. விரைவில் நிரப்பவும்.',
  'family.alert.other': 'எச்சரிக்கை: {kind}',
  'family.switchRole': 'தொலைபேசி பங்கை மாற்று',
  'family.resetDemo': 'டெமோ தரவை மீட்டமை',
  'family.demo': 'டெமோ முறை',
  'family.ai': 'AI: {kind}',
  'family.storage': 'சேமிப்பு: {kind}',
  'family.left': '{n} மீதம்',
};
