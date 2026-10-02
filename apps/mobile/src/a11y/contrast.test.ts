import { contrastRatio } from './contrast';
import { SLOT_COLORS, SLOT_ON, THEMES } from './tokens';

describe('theme contrast', () => {
  for (const theme of Object.values(THEMES)) {
    // Elder text and icons: WCAG AAA (7:1).
    const elderPairs: [string, string, string][] = [
      ['text/bg', theme.text, theme.bg],
      ['text/surface', theme.text, theme.surface],
      ['textMuted/bg', theme.textMuted, theme.bg],
      ['textMuted/surface', theme.textMuted, theme.surface],
      ['onPrimary/primary', theme.onPrimary, theme.primary],
      ['onSecondary/secondary', theme.onSecondary, theme.secondary],
    ];
    // Family-side status colours: AA (4.5:1).
    const familyPairs: [string, string, string][] = [
      ['taken/surface', theme.taken, theme.surface],
      ['missed/surface', theme.missed, theme.surface],
      ['border/bg', theme.border, theme.bg],
    ];

    it.each(elderPairs)(`${theme.name}: %s >= 7`, (_n, a, b) => {
      expect(contrastRatio(a, b)).toBeGreaterThanOrEqual(7);
    });
    it.each(familyPairs)(`${theme.name}: %s >= 4.5`, (_n, a, b) => {
      expect(contrastRatio(a, b)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it.each(Object.keys(SLOT_COLORS) as (keyof typeof SLOT_COLORS)[])('slot %s mark on its colour >= 3 (non-text)', (slot) => {
    expect(contrastRatio(SLOT_ON[slot], SLOT_COLORS[slot])).toBeGreaterThanOrEqual(3);
  });

  it('known values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 1);
  });
});
