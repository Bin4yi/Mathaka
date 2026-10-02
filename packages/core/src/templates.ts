import type { ElderAnswer, NextDose } from './dose';
import { formatHm, minutesOfDay } from './time';
import type { Lang, Slot } from './types';

// EVERY sentence spoken or shown to the elder comes from here.
// Fixed words, filled only with data from the local log. No AI writes text for the elder.
// Rules: calm, short, same words every day. Never "wrong", never "you missed",
// never tell the elder to take a pill, never medical advice.

type TemplateKey =
  | 'answer.taken'
  | 'answer.notYet'
  | 'answer.dueNow'
  | 'answer.askFamily'
  | 'answer.already'
  | 'answer.logged'
  | 'answer.notNow'
  | 'reminder'
  | 'home.dueNow'
  | 'home.allDone'
  | 'home.next'
  | 'dose.title'
  | 'confirm.question';

const T: Record<Lang, Record<TemplateKey, string>> = {
  en: {
    'answer.taken': 'Yes, {name}. You took your {slot} medicine at {time}. The next one is {next}.',
    'answer.notYet': 'Not yet. Your next medicine is {next}, at about {nextTime}.',
    'answer.dueNow': 'It is time now. Your {slot} box is lit up.',
    'answer.askFamily': 'Please wait. I will ask {family}.',
    'answer.already': 'You already took your {slot} medicine at {time}. The next one is {next}.',
    'answer.logged': 'Thank you, {name}. I wrote it down.',
    'answer.notNow': 'There is no medicine now. The next one is {next}.',
    reminder: '{name}, it is time for your {slot} medicine.',
    'home.dueNow': 'It is time for your {slot} medicine.',
    'home.allDone': 'All done for today. Well done, {name}.',
    'home.next': 'Next medicine: {next}.',
    'dose.title': 'Your {slot} medicine',
    'confirm.question': 'Did you swallow the pills now?',
  },
  si: {
    'answer.taken': 'ඔව්, {name}. ඔබ {slot} බෙහෙත {time}ට බිව්වා. ඊළඟ බෙහෙත {next}.',
    'answer.notYet': 'තවම නැහැ. ඊළඟ බෙහෙත {next}, {nextTime}ට විතර.',
    'answer.dueNow': 'දැන් බෙහෙත් වෙලාව. ඔබේ {slot} පෙට්ටිය එළිය වෙලා.',
    'answer.askFamily': 'ටිකක් ඉන්න. මම {family}ගෙන් අහන්නම්.',
    'answer.already': 'ඔබ {slot} බෙහෙත {time}ට බිව්වා. ඊළඟ බෙහෙත {next}.',
    'answer.logged': 'ස්තූතියි, {name}. මම ඒක ලියාගත්තා.',
    'answer.notNow': 'දැන් බෙහෙත් නැහැ. ඊළඟ බෙහෙත {next}.',
    reminder: '{name}, {slot} බෙහෙත් වෙලාව.',
    'home.dueNow': '{slot} බෙහෙත් වෙලාව.',
    'home.allDone': 'අදට බෙහෙත් ඉවරයි. හොඳයි, {name}.',
    'home.next': 'ඊළඟ බෙහෙත: {next}.',
    'dose.title': 'ඔබේ {slot} බෙහෙත',
    'confirm.question': 'ඔබ දැන් පෙති බිව්වාද?',
  },
  ta: {
    'answer.taken': 'ஆம், {name}. நீங்கள் {slot} மருந்தை {time} மணிக்கு எடுத்தீர்கள். அடுத்தது {next}.',
    'answer.notYet': 'இன்னும் இல்லை. உங்கள் அடுத்த மருந்து {next}, சுமார் {nextTime} மணிக்கு.',
    'answer.dueNow': 'இப்போது நேரம் ஆகிவிட்டது. உங்கள் {slot} பெட்டி ஒளிர்கிறது.',
    'answer.askFamily': 'கொஞ்சம் காத்திருங்கள். நான் {family}இடம் கேட்கிறேன்.',
    'answer.already': 'நீங்கள் {slot} மருந்தை {time} மணிக்கு எடுத்துவிட்டீர்கள். அடுத்தது {next}.',
    'answer.logged': 'நன்றி, {name}. நான் அதை எழுதிவிட்டேன்.',
    'answer.notNow': 'இப்போது மருந்து இல்லை. அடுத்தது {next}.',
    reminder: '{name}, {slot} மருந்து நேரம்.',
    'home.dueNow': '{slot} மருந்து நேரம்.',
    'home.allDone': 'இன்றைய மருந்து முடிந்தது. நல்லது, {name}.',
    'home.next': 'அடுத்த மருந்து: {next}.',
    'dose.title': 'உங்கள் {slot} மருந்து',
    'confirm.question': 'நீங்கள் இப்போது மாத்திரைகளை விழுங்கினீர்களா?',
  },
};

/** Slot names as used inside sentences. */
export const SLOT_WORD: Record<Lang, Record<Slot, string>> = {
  en: { morning: 'morning', noon: 'noon', evening: 'evening', night: 'night' },
  si: { morning: 'උදේ', noon: 'දවල්', evening: 'හවස', night: 'රෑ' },
  ta: { morning: 'காலை', noon: 'மதிய', evening: 'மாலை', night: 'இரவு' },
};

/** Meal words first: many elders think in meals, not clock times. */
const WHEN_WORD: Record<Lang, Record<Slot, string>> = {
  en: { morning: 'at breakfast time', noon: 'at lunch time', evening: 'at dinner time', night: 'at bedtime' },
  si: { morning: 'උදේ කෑම වෙලාවේ', noon: 'දවල් කෑම වෙලාවේ', evening: 'රෑ කෑම වෙලාවේ', night: 'නිදාගන්න කලින්' },
  ta: { morning: 'காலை உணவு நேரத்தில்', noon: 'மதிய உணவு நேரத்தில்', evening: 'இரவு உணவு நேரத்தில்', night: 'தூங்கும் முன்' },
};
const TOMORROW: Record<Lang, string> = { en: 'tomorrow', si: 'හෙට', ta: 'நாளை' };

/** "8:05" style clock (12-hour, no am/pm: the slot word already says the part of day). */
export function clockText(minutes: number): string {
  const [h, m] = formatHm(minutes).split(':').map(Number) as [number, number];
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')}`;
}

export function nextText(lang: Lang, next: NextDose | null): string {
  if (!next) return '';
  const when = WHEN_WORD[lang][next.slot];
  return next.tomorrow ? `${TOMORROW[lang]} ${when}` : when;
}

function fill(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

export type ElderContext = { lang: Lang; name: string; family: string };

export function elderText(ctx: ElderContext, key: TemplateKey, vars: Record<string, string> = {}): string {
  return fill(T[ctx.lang][key], { name: ctx.name, family: ctx.family, ...vars });
}

/** ISO time -> "8:05" in local time. */
export function isoClock(iso: string): string {
  return clockText(minutesOfDay(new Date(iso)));
}

/** The exact sentence for an answer to "Did I take my medicine?". */
export function renderAnswer(ctx: ElderContext, a: ElderAnswer): string {
  const slotWord = (s: Slot) => SLOT_WORD[ctx.lang][s];
  switch (a.kind) {
    case 'taken':
      return elderText(ctx, 'answer.taken', { slot: slotWord(a.slot), time: isoClock(a.takenAt), next: nextText(ctx.lang, a.next) });
    case 'not_yet':
      return elderText(ctx, 'answer.notYet', {
        next: nextText(ctx.lang, a.next),
        nextTime: a.next ? clockText(a.next.dueAt) : '',
      });
    case 'due_now':
      return elderText(ctx, 'answer.dueNow', { slot: slotWord(a.slot) });
    case 'ask_family':
      return elderText(ctx, 'answer.askFamily');
  }
}

/** All raw templates, for tests and the eval "unsafe answer" check. */
export function allTemplates(): string[] {
  return Object.values(T).flatMap((t) => Object.values(t));
}
