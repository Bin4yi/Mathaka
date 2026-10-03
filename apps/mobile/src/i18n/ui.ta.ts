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
  'box.section': "மாத்திரைப் பெட்டி (Bluetooth)",
  'box.hint': "எடுக்க வேண்டிய கட்டத்தை ஒளிரச் செய்யும் விருப்பப் பெட்டி. ஒளிரும் கட்டத்தை அழுத்துவது \"நான் எடுத்துவிட்டேன்\" ஆகும்.",
  'box.find': "மாத்திரைப் பெட்டியைத் தேடு",
  'box.searching': "மாத்திரைப் பெட்டியைத் தேடுகிறது…",
  'box.connected': "மாத்திரைப் பெட்டி இணைக்கப்பட்டது.",
  'box.notConnected': "பெட்டி இணைக்கப்படவில்லை. திரையில் உள்ள பெட்டி பயன்படுத்தப்படுகிறது.",
  'box.notFound': "பெட்டி கிடைக்கவில்லை. அது இயக்கத்தில், தொலைபேசிக்கு அருகில் உள்ளதா?",
  'box.noPermission': "Mathaka க்கு Bluetooth அனுமதி தரவும்.",
  'box.unsupported': "பெட்டிக்கு Mathaka செயலி build தேவை (Expo Go அல்லது வலை முன்னோட்டம் அல்ல).",
  'box.forget': "இந்தப் பெட்டியை மறந்துவிடு",
  'family.alert.unsure_check': "{name}: {slot} கட்டம் வேறு நேரத்தில் திறக்கப்பட்டது. மாத்திரைகளைச் சரிபார்க்கவும்.",
  'family.alert.new_pill': "{name} புதிதாகத் தெரியும் மாத்திரையைக் காட்டினார். சரிபார்த்து மீண்டும் அமைக்கவும்.",
};
