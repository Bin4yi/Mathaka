import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../a11y/useTheme';

/**
 * Big, plain clock face. Many elders read a clock face more easily than digits.
 * Decorative for screen readers: the time is also given in words and digits.
 */
export function AnalogClock({ date, size = 180 }: { date: Date; size?: number }) {
  const theme = useTheme();
  const h = date.getHours() % 12;
  const m = date.getMinutes();
  const hourAngle = (h + m / 60) * 30;
  const minuteAngle = m * 6;
  const hand = (angle: number, len: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x2: 100 + len * Math.cos(rad), y2: 100 + len * Math.sin(rad) };
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx={100} cy={100} r={94} fill={theme.surface} stroke={theme.border} strokeWidth={6} />
      <G stroke={theme.text}>
        {Array.from({ length: 12 }, (_, i) => {
          const rad = (i * 30 * Math.PI) / 180;
          const r1 = i % 3 === 0 ? 72 : 80;
          return (
            <Line
              key={i}
              x1={100 + r1 * Math.sin(rad)}
              y1={100 - r1 * Math.cos(rad)}
              x2={100 + 88 * Math.sin(rad)}
              y2={100 - 88 * Math.cos(rad)}
              strokeWidth={i % 3 === 0 ? 6 : 3}
              strokeLinecap="round"
            />
          );
        })}
      </G>
      {[12, 3, 6, 9].map((n) => {
        const rad = ((n % 12) * 30 * Math.PI) / 180;
        return (
          <SvgText
            key={n}
            x={100 + 56 * Math.sin(rad)}
            y={100 - 56 * Math.cos(rad) + 9}
            fontSize={26}
            fontWeight="700"
            textAnchor="middle"
            fill={theme.text}
          >
            {n}
          </SvgText>
        );
      })}
      <Line x1={100} y1={100} {...hand(hourAngle, 46)} stroke={theme.text} strokeWidth={10} strokeLinecap="round" />
      <Line x1={100} y1={100} {...hand(minuteAngle, 70)} stroke={theme.text} strokeWidth={6} strokeLinecap="round" />
      <Circle cx={100} cy={100} r={8} fill={theme.text} />
    </Svg>
  );
}
