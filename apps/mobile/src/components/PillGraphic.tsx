import { PILL_COLORS, type PillShape, type PillSpec } from '@mathaka/core';
import { useId } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

// Live pill picture. Same geometry, palette, outline, shine and score line as
// tools/generate-assets.mjs (pillSVG), so PNGs and this component look the same.

const INK = '#22283A';

function Outline({ shape, ...p }: { shape: PillShape } & Record<string, unknown>) {
  switch (shape) {
    case 'round':
      return <Circle cx={256} cy={256} r={170} {...p} />;
    case 'oval':
      return <Ellipse cx={256} cy={256} rx={215} ry={140} {...p} />;
    case 'oblong':
      return <Rect x={46} y={166} width={420} height={180} rx={70} {...p} />;
    case 'capsule':
      return <Rect x={36} y={171} width={440} height={170} rx={85} {...p} />;
    case 'diamond':
      return <Polygon points="256,70 450,256 256,442 62,256" {...p} />;
    case 'triangle':
      return <Path d="M256 78 L452 412 Q456 424 442 424 L70 424 Q56 424 60 412 Z" {...p} />;
  }
}

/** Wide shapes leave empty space in the 512 box; crop it (drawing unchanged, shadow kept). */
const VIEW: Record<PillShape, [number, number]> = {
  round: [0, 512],
  diamond: [0, 512],
  triangle: [0, 512],
  oval: [100, 320],
  oblong: [150, 220],
  capsule: [150, 220],
};

const resolve = (c: string | undefined) => (c ? (PILL_COLORS as Record<string, string>)[c] ?? c : undefined);

type Props = {
  spec: PillSpec;
  size?: number;
  /** Full spoken label, e.g. "Sugar medicine. Pink round tablet with number 5. 2 tablets." */
  accessibilityLabel?: string;
  /** Crop empty space around wide pills (default). Off = same square box as the PNGs. */
  crop?: boolean;
};

export function PillGraphic({ spec, size = 220, accessibilityLabel, crop = true }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clip = `clip${uid}`;
  const shine = `shine${uid}`;
  const { shape, split = 'none', score = false, imprint = '' } = spec;
  const A = resolve(spec.colorA) ?? PILL_COLORS.white;
  const B = resolve(spec.colorB) ?? A;
  const tall = shape === 'round' || shape === 'diamond' || shape === 'triangle';
  const [vy, vh] = crop ? VIEW[shape] : [0, 512];

  return (
    <Svg
      width={size}
      height={(size * vh) / 512}
      viewBox={`0 ${vy} 512 ${vh}`}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
    >
      <Defs>
        <ClipPath id={clip}>
          <Outline shape={shape} />
        </ClipPath>
        <LinearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fff" stopOpacity={0.55} />
          <Stop offset="0.45" stopColor="#fff" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.1} />
        </LinearGradient>
      </Defs>

      {/* flat offset shadow (same as the asset script's fast mode) */}
      <G transform="translate(0 12)" opacity={0.14}>
        <Outline shape={shape} fill="#000" stroke="#000" strokeWidth={12} strokeLinejoin="round" />
      </G>

      <G clipPath={`url(#${clip})`}>
        <Rect x={0} y={0} width={512} height={512} fill={A} />
        {split === 'vertical' && <Rect x={256} y={0} width={256} height={512} fill={B} />}
        {split === 'horizontal' && <Rect x={0} y={256} width={512} height={256} fill={B} />}
        <Rect x={0} y={0} width={512} height={512} fill={`url(#${shine})`} />
      </G>

      {split !== 'none' && (
        <G clipPath={`url(#${clip})`} stroke={INK} strokeWidth={6} opacity={0.55}>
          {split === 'vertical' ? <Line x1={256} y1={0} x2={256} y2={512} /> : <Line x1={0} y1={256} x2={512} y2={256} />}
        </G>
      )}
      {score && (
        <G clipPath={`url(#${clip})`} stroke={INK} strokeWidth={9} strokeLinecap="round" opacity={0.45}>
          {tall ? <Line x1={256} y1={40} x2={256} y2={472} /> : <Line x1={256} y1={100} x2={256} y2={412} />}
        </G>
      )}
      {!!imprint && (
        <SvgText
          x={score ? 340 : 256}
          y={shape === 'triangle' ? 330 : 274}
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize={54}
          fontWeight="700"
          textAnchor="middle"
          fill={INK}
          opacity={0.55}
        >
          {imprint}
        </SvgText>
      )}

      {/* thick dark outline so a white pill shows on a white screen */}
      <Outline shape={shape} fill="none" stroke={INK} strokeWidth={12} strokeLinejoin="round" />
    </Svg>
  );
}
