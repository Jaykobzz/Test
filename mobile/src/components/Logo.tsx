/**
 * Appmärket.
 *
 * Ringen på Å är i accentfärg medan bokstäverna är i grundfärgen. Det görs
 * genom att sätta ordet två gånger: först "PÅ" i accentfärgen, sedan "PA"
 * ovanpå i grundfärgen. Det övre lagret täcker P och A exakt, för A:s läge
 * bestäms av P:s bredd och är därmed detsamma i båda orden. Kvar syns bara
 * ringen.
 *
 * Poängen med den ordningen är att ringen blir typsnittets egen. Alternativet,
 * att rita en cirkel på uppmätta koordinater, låser märket till en viss vikt
 * av en viss fil och går sönder tyst den dagen någon byter snitt.
 */

import Svg, { Rect, Text as SvgText } from "react-native-svg";

import { useTheme } from "@/hooks/useTheme";
import { fontFamily } from "@/theme";

/**
 * Plattans färger är låsta och följer inte temat. Ett märke som byter kulör
 * med mörkt läge är inte ett märke. Utan platta lånar orden temats textfärg,
 * för då ligger de på appens egen bakgrund.
 */
const PLATE = "#15604B";       // gran
const PLATE_INK = "#F7F5EF";   // krämvit
const PLATE_RING = "#C86A2E";  // rost, den ljusare varianten för mörk botten

/** Ritytan i design/logo/render.py. Måtten nedan är andelar av den. */
const BOX = 180;

interface Props {
  /** Märkets sida i punkter. */
  size?: number;
  /** Utan platta ritas bara orden, för mörka eller bildsatta bakgrunder. */
  plate?: boolean;
}

export function Logo({ size = 84, plate = true }: Props) {
  const theme = useTheme();

  const ink = plate ? PLATE_INK : theme.color.text;
  const ring = plate ? PLATE_RING : theme.color.accent;

  const s = size / BOX;
  const type = 46 * s;
  const cx = size / 2;
  const hakaBase = 78 * s;
  const paBase = hakaBase + 34 * s + 0.52 * type;

  const line = {
    fontFamily: fontFamily.displayBold,
    fontSize: type,
    textAnchor: "middle" as const,
    letterSpacing: -s,
  };

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {plate ? <Rect width={size} height={size} rx={40 * s} fill={PLATE} /> : null}

      <SvgText x={cx} y={hakaBase} fill={ink} {...line}>HAKA</SvgText>

      {/* Underst hela ordet i ringens färg ... */}
      <SvgText x={cx} y={paBase} fill={ring} {...line}>PÅ</SvgText>
      {/* ... överst samma ord utan ring, vilket lämnar just ringen synlig. */}
      <SvgText x={cx} y={paBase} fill={ink} {...line}>PA</SvgText>
    </Svg>
  );
}
