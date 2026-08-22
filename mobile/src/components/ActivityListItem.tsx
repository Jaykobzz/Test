/**
 * Aktivitetskortet i flödet.
 *
 * Bilden är stor med flit — bildkravet finns för att man ska kunna se vad man
 * tackar ja till, inte för att fylla en databaskolumn.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { View } from "react-native";

import type { ActivityCard } from "@/api/types";
import { interestLabel } from "@/api/interests";
import { Avatar, Badge, Card, Credentials, Gap, Row, Txt } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { formatDistance } from "@/lib/geo";
import { formatActivityWhen } from "@/lib/time";
import { radius, space } from "@/theme";

export function ActivityListItem({
  activity,
  onPress,
}: {
  activity: ActivityCard;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Card onPress={onPress}>
      <View>
        <Image
          source={{ uri: activity.coverUrl }}
          contentFit="cover"
          transition={200}
          style={{ width: "100%", height: 172, backgroundColor: theme.color.surfaceAlt }}
        />

        <Row gap="xs" wrap style={{ position: "absolute", top: space.md, left: space.md }}>
          {activity.visibility === "bff" && <Badge label="Bara BFFs" icon="heart" tone="accent" />}
          {activity.myStatus === "pending" && <Badge label="Ansökt" tone="dark" />}
          {activity.myStatus === "accepted" && <Badge label="Du är med" tone="primary" />}
          {activity.isMine && <Badge label="Din aktivitet" tone="dark" />}
        </Row>

        {activity.distanceM !== null && (
          <View style={{ position: "absolute", top: space.md, right: space.md }}>
            <Badge label={formatDistance(activity.distanceM)} icon="navigate" />
          </View>
        )}
      </View>

      <View style={{ padding: space.lg }}>
        <Row gap="sm" justify="space-between" align="flex-start">
          <View style={{ flex: 1 }}>
            <Txt variant="heading" numberOfLines={2}>{activity.title}</Txt>
          </View>
          {activity.category && (
            <Txt variant="small" tone="faint">{interestLabel(activity.category)}</Txt>
          )}
        </Row>

        <Gap size="sm" />

        <Row gap="xs">
          <Ionicons name="time-outline" size={15} color={theme.color.textMuted} />
          <Txt variant="small" tone="muted">
            {formatActivityWhen(activity.startsAt, activity.endsAt)}
          </Txt>
        </Row>

        <Gap size="xs" />

        <Row gap="xs">
          <Ionicons name="location-outline" size={15} color={theme.color.textMuted} />
          <Txt variant="small" tone="muted" numberOfLines={1}>{activity.locationName}</Txt>
        </Row>

        <Gap size="md" />

        <Row justify="space-between">
          <Row gap="sm">
            <Avatar uri={activity.hostAvatar} name={activity.hostName} size={30} />
            <View>
              <Txt variant="smallStrong">{activity.hostName}</Txt>
              <Credentials verified activityCount={activity.hostActivityCount} size="micro" />
            </View>
          </Row>

          <SpotsLabel activity={activity} />
        </Row>
      </View>
    </Card>
  );
}

/** "3 platser kvar", "Fullt" eller antal med när det inte finns tak. */
function SpotsLabel({ activity }: { activity: ActivityCard }) {
  const theme = useTheme();

  if (activity.capacity === null) {
    return (
      <View
        style={{
          backgroundColor: theme.color.surfaceAlt,
          borderRadius: radius.pill,
          paddingVertical: 5,
          paddingHorizontal: space.md,
        }}
      >
        <Txt variant="micro" tone="muted">
          {activity.acceptedCount === 0
            ? "Öppet för alla"
            : `${activity.acceptedCount} med`}
        </Txt>
      </View>
    );
  }

  const left = activity.spotsLeft ?? 0;
  const full = left === 0;

  return (
    <View
      style={{
        backgroundColor: full ? theme.color.surfaceAlt : theme.color.primarySoft,
        borderRadius: radius.pill,
        paddingVertical: 5,
        paddingHorizontal: space.md,
      }}
    >
      <Txt variant="micro" tone={full ? "faint" : "primary"}>
        {full ? "Fullt" : left === 1 ? "1 plats kvar" : `${left} platser kvar`}
      </Txt>
    </View>
  );
}
