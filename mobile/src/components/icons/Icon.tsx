/**
 * FRIENDs egna ikoner.
 *
 * Ett eget set i stället för ett bibliotek, av ett enda skäl: ett generiskt
 * ikonpaket läser som *default*, och default är den tydligaste signalen att
 * ingen har ritat gränssnittet.
 *
 * Banorna ligger i design/icons/icons.json och genereras till paths.ts.
 * Konstruktionsreglerna står i design/icons/SPEC.md, 24×24-rutnät, 1,6 i
 * streck, runda ändar, ingen fyllning, och inget detaljerat mindre än tre
 * enheter eftersom ikonerna renderas så små som 14 px.
 */

import Svg, { Circle, Path } from "react-native-svg";

import { useTheme } from "@/hooks/useTheme";
import { ICON_PATHS, type IconName } from "./paths";

export type { IconName } from "./paths";
export { ICON_NAMES } from "./paths";

/**
 * Streckvikten skalar inte linjärt med storleken.
 *
 * En ikon på 14 px med 1,6 i streck blir grå gröt; samma ikon på 40 px med
 * samma streck blir spretig. Vikten justeras därför något mot mitten, det är
 * samma optiska korrigering en typsnittsformgivare gör mellan brödtext och
 * rubrik.
 */
function strokeFor(size: number): number {
  if (size <= 16) return 1.75;
  if (size <= 28) return 1.6;
  if (size <= 40) return 1.5;
  return 1.4;
}

export function Icon({
  name,
  size = 24,
  color,
  strokeWidth,
}: {
  name: IconName;
  size?: number;
  /** Utelämnas: ärver temats textfärg. */
  color?: string;
  /** Överstyr den optiska korrigeringen. Behövs sällan. */
  strokeWidth?: number;
}) {
  const theme = useTheme();
  const stroke = color ?? theme.color.text;
  const width = strokeWidth ?? strokeFor(size);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON_PATHS[name].map((shape, i) =>
        shape.d !== undefined ? (
          <Path key={i} d={shape.d} />
        ) : (
          <Circle key={i} cx={shape.c![0]} cy={shape.c![1]} r={shape.c![2]} />
        ),
      )}
    </Svg>
  );
}
