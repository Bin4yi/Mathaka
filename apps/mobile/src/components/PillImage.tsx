import { Image } from 'react-native';
import { Assets } from '../../assets/generated';

type PillKey = keyof typeof Assets.pills;

/**
 * M1 placeholder: shows the pre-rendered PNG for demo pills.
 * M2 replaces this with the live <PillGraphic /> (react-native-svg), same geometry.
 */
export function PillImage({ assetKey, size = 96 }: { assetKey?: string; size?: number }) {
  if (!assetKey || !(assetKey in Assets.pills)) return null;
  return (
    <Image
      source={Assets.pills[assetKey as PillKey]}
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
