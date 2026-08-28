/**
 * En aktivitets omslag: fotot om det finns, annars ett ritat.
 *
 * Planerade aktiviteter kräver en bild. Spontana gör det inte, för den som
 * står i hallen och vill gå ut om tjugo minuter kommer inte att fotografera
 * något först, och kravet skulle bara göra att posten aldrig blev av.
 *
 * Det ritade omslaget är inte en tom platshållare. Det tar kategorins ikon
 * och en färg som hör till just den kategorin, så flödet ser fyllt ut och
 * två fisketurer ser ut som släkt utan att någon behövt ta en bild.
 */

import { Image } from "expo-image";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { Icon, type IconName } from "@/components/icons/Icon";
import { INTERESTS } from "@/api/interests";

/**
 * Färgen väljs ur kategorins namn och inte slumpas, så att samma kategori
 * alltid ser likadan ut. Tonerna ligger nära varandra med flit: det ska
 * kännas som en app, inte som ett färgprov.
 */
const TINTS = [
  "#15604B", "#1D5B6E", "#3A5A40", "#5A4B81",
  "#8A5A2B", "#7A3B4E", "#2F6B5F", "#4A5568",
] as const;

function tintFor(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length]!;
}

function iconFor(category: string | null): IconName {
  const match = INTERESTS.find((i) => i.slug === category);
  // Utan kategori finns ingen bra ikon. Fikakoppen är den mest neutrala
  // i setet och läser som "något man gör ihop".
  return (match?.icon as IconName) ?? "fika";
}

interface Props {
  uri: string | null;
  category: string | null;
  /** Titeln används bara som fröet till färgen när kategori saknas. */
  title?: string;
  style?: StyleProp<ViewStyle>;
}

export function Cover({ uri, category, title = "", style }: Props) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={style as never}
        contentFit="cover"
        transition={180}
      />
    );
  }

  const tint = tintFor(category ?? title);

  return (
    <View
      style={[
        style,
        { backgroundColor: tint, alignItems: "center", justifyContent: "center" },
      ]}
    >
      {/*
        Ikonen ligger stort och lågmält snarare än centrerat och tydligt.
        Omslaget ska läsas som en yta med en antydan, inte som en knapp.
      */}
      <View style={{ opacity: 0.42 }}>
        <Icon name={iconFor(category)} size={64} color="#F7F5EF" />
      </View>
    </View>
  );
}
