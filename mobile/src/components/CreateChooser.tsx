/**
 * Väljer mellan att planera något och att göra något nu.
 *
 * De två är olika saker och inte två lägen av samma sak, så valet görs här
 * i stället för med en växlingsknapp inne i ett gemensamt formulär. Ett
 * gemensamt formulär hade tvingat den spontana vägen att bära den planerades
 * fält, och det är just fälten som gör att en spontan post aldrig blir av.
 */

import { Modal, View } from "react-native";

import { Icon } from "@/components/icons/Icon";
import { t } from "@/i18n";
import { Tappable } from "@/components/Tappable";
import { Gap, Txt } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { radius, space } from "@/theme";

interface Props {
  visible: boolean;
  onClose(): void;
  onPlanned(): void;
  onSpontaneous(): void;
}

export function CreateChooser({ visible, onClose, onPlanned, onSpontaneous }: Props) {
  const theme = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Tappable
        onPress={onClose}
        accessibilityLabel={t.chooser.close}
        scale={1}
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: theme.color.overlay }}
      >
        <View
          style={{
            backgroundColor: theme.color.bg,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            padding: space.xl,
            paddingBottom: space.xxl,
            gap: space.md,
          }}
        >
          <Txt variant="title">{t.chooser.title}</Txt>

          <Option
            icon="fika"
            title={t.chooser.spontaneous}
            body={t.chooser.spontaneousBody}
            onPress={onSpontaneous}
            highlight
          />

          <Option
            icon="vandring"
            title={t.chooser.planned}
            body={t.chooser.plannedBody}
            onPress={onPlanned}
          />
        </View>
      </Tappable>
    </Modal>
  );
}

function Option({
  icon,
  title,
  body,
  onPress,
  highlight = false,
}: {
  icon: string;
  title: string;
  body: string;
  onPress(): void;
  highlight?: boolean;
}) {
  const theme = useTheme();

  return (
    <Tappable
      onPress={onPress}
      accessibilityLabel={title}
      style={{
        flexDirection: "row",
        gap: space.md,
        alignItems: "flex-start",
        backgroundColor: highlight ? theme.color.primarySoft : theme.color.surface,
        borderRadius: radius.card,
        padding: space.lg,
      }}
    >
      <Icon
        name={icon as never}
        size={26}
        color={highlight ? theme.color.primary : theme.color.textMuted}
      />
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong">{title}</Txt>
        <Gap size="xs" />
        <Txt variant="small" tone="muted">{body}</Txt>
      </View>
    </Tappable>
  );
}
