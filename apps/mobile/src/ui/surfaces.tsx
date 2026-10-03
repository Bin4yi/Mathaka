import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { Theme } from '../a11y/tokens';
import { useTheme } from '../a11y/useTheme';

// Design language: soft neumorphic surfaces on a calm gradient, glass panels on top.
// Elder-safe: text contrast is tested (contrast.test.ts); high-contrast theme turns every
// soft effect off and uses plain strong edges.

/** Two soft shadows: light from top-left, dark to bottom-right (or pressed in). */
export function neuShadow(theme: Theme, depth = 8, inset = false): string | undefined {
  if (theme.name === 'highContrast') return undefined;
  const d = depth;
  return inset
    ? `inset ${d / 2}px ${d / 2}px ${d}px ${theme.neuLow}, inset ${-d / 2}px ${-d / 2}px ${d}px ${theme.neuHigh}`
    : `${-d}px ${-d}px ${d * 2}px ${theme.neuHigh}, ${d}px ${d}px ${d * 2}px ${theme.neuLow}`;
}

/** Page background: gradient + three soft colour blobs (static SVG: cheap on old phones). */
export function AppBackground() {
  const t = useTheme();
  if (t.name === 'highContrast') return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={t.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          {t.blobs.map((c, i) => (
            <RadialGradient key={i} id={`blob${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={c} stopOpacity={t.name === 'dark' ? 0.55 : 0.45} />
              <Stop offset="1" stopColor={c} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Rect x="-25%" y="-12%" width="85%" height="55%" fill="url(#blob0)" />
        <Rect x="45%" y="18%" width="80%" height="50%" fill="url(#blob1)" />
        <Rect x="-10%" y="60%" width="90%" height="55%" fill="url(#blob2)" />
      </Svg>
    </View>
  );
}

type SurfaceProps = { children?: ReactNode; style?: StyleProp<ViewStyle>; radius?: number; depth?: number };

/** Raised neumorphic card. `outlined` adds the soft outline elder screens need. */
export function NeuCard({ children, style, radius = 24, depth = 8, outlined, inset }: SurfaceProps & { outlined?: boolean; inset?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.surface,
          borderRadius: radius,
          boxShadow: neuShadow(t, depth, inset),
          borderWidth: t.name === 'highContrast' ? 3 : outlined ? 2 : 0,
          borderColor: t.name === 'highContrast' ? t.border : t.outline,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Frosted glass panel. Real blur on the family side (`blur`); elder screens use the cheap
 * translucent version (blur is heavy on old phones and adds nothing to readability).
 */
export function GlassPanel({ children, style, radius = 24, blur = false, outlined }: SurfaceProps & { blur?: boolean; outlined?: boolean }) {
  const t = useTheme();
  const hc = t.name === 'highContrast';
  const border = hc ? { borderWidth: 3, borderColor: t.border } : { borderWidth: outlined ? 2 : 1.5, borderColor: outlined ? t.outline : t.glassBorder };
  return (
    <View
      style={[
        { borderRadius: radius, overflow: 'hidden', backgroundColor: hc ? '#000' : t.glassFill, boxShadow: hc ? undefined : `0px 10px 30px ${t.neuLow}` },
        border,
        style,
      ]}
    >
      {blur && !hc && Platform.OS !== 'android' ? <BlurView intensity={40} tint={t.blurTint} style={StyleSheet.absoluteFill} /> : null}
      {!hc && (
        <LinearGradient
          colors={[t.name === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.6 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}
