import type { Lang, PillColorName, PillShape, PillSpec } from './types';
import { PILL_COLORS } from './types';

// Words for the text line under every pill picture ("never colour alone").

const COLOR_WORD: Record<Lang, Record<PillColorName, string>> = {
  en: {
    white: 'white', cream: 'cream', yellow: 'yellow', orange: 'orange', pink: 'pink', red: 'red',
    blue: 'blue', lightblue: 'light blue', green: 'green', brown: 'brown', purple: 'purple', grey: 'grey',
  },
  si: {
    white: 'සුදු', cream: 'ක්‍රීම්', yellow: 'කහ', orange: 'තැඹිලි', pink: 'රෝස', red: 'රතු',
    blue: 'නිල්', lightblue: 'ලා නිල්', green: 'කොළ', brown: 'දුඹුරු', purple: 'දම්', grey: 'අළු',
  },
  ta: {
    white: 'வெள்ளை', cream: 'கிரீம்', yellow: 'மஞ்சள்', orange: 'ஆரஞ்சு', pink: 'இளஞ்சிவப்பு', red: 'சிவப்பு',
    blue: 'நீலம்', lightblue: 'வெளிர் நீலம்', green: 'பச்சை', brown: 'பழுப்பு', purple: 'ஊதா', grey: 'சாம்பல்',
  },
};

const SHAPE_WORD: Record<Lang, Record<PillShape, string>> = {
  en: { round: 'round', oval: 'oval', oblong: 'long', capsule: 'capsule', diamond: 'diamond', triangle: 'triangle' },
  si: { round: 'රවුම්', oval: 'ඕවලාකාර', oblong: 'දිගටි', capsule: 'කැප්සියුලය', diamond: 'දියමන්ති හැඩය', triangle: 'ත්‍රිකෝණ' },
  ta: { round: 'வட்டம்', oval: 'நீள்வட்டம்', oblong: 'நீளமான', capsule: 'காப்ஸ்யூல்', diamond: 'வைர வடிவம்', triangle: 'முக்கோணம்' },
};

const NUMBER: Record<Lang, string> = { en: 'number {x}', si: 'අංක {x}', ta: 'எண் {x}' };
const LINE: Record<Lang, string> = { en: 'line across', si: 'මැදින් ඉරක්', ta: 'நடுவில் கோடு' };
const AND: Record<Lang, string> = { en: 'and', si: 'සහ', ta: 'மற்றும்' };

export function colorWord(lang: Lang, color: string): string {
  return color in PILL_COLORS ? COLOR_WORD[lang][color as PillColorName] : color;
}

/** "pink · round · number 5" */
export function pillWords(lang: Lang, spec: PillSpec): string {
  const parts: string[] = [];
  const a = colorWord(lang, spec.colorA);
  const b = spec.colorB && spec.colorB !== spec.colorA ? colorWord(lang, spec.colorB) : null;
  parts.push(b ? `${a} ${AND[lang]} ${b}` : a);
  parts.push(SHAPE_WORD[lang][spec.shape]);
  if (spec.score) parts.push(LINE[lang]);
  if (spec.imprint) parts.push(NUMBER[lang].replace('{x}', spec.imprint));
  return parts.join(' · ');
}
