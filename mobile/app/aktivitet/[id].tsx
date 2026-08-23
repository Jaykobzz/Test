/**
 * En aktivitet.
 *
 * Skärmen har tre skepnader beroende på vem som tittar:
 *   värden     , ser ansökningar och kan acceptera eller tacka nej
 *   accepterad , ser deltagarna och kommer in i chatten
 *   övriga     , ser vad det handlar om och kan ansöka
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import { Alert, Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { getBackend } from "@/api";
import { ApplySheet } from "@/components/ApplySheet";
import { Cover } from "@/components/Cover";
import { formatCost } from "@/lib/pris";
import { interestLabel } from "@/api/interests";
import type { ActivityDetail, Applicant, ExperienceLevel } from "@/api/types";
import {
  Avatar, Badge, Button, Card, Chip, Credentials, Divider, Gap, IconButton, Loading, Row, Screen,
  Txt,
} from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { formatDistance, mapsUrl } from "@/lib/geo";
import { formatActivityWhen } from "@/lib/time";
import { space } from "@/theme";

export default function ActivityScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setActivity(await getBackend().getActivity(id));
    } catch (error) {
      Alert.alert("Kunde inte hämta aktiviteten", describe(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "",
      headerRight: () =>
        activity?.threadId ? (
          <IconButton
            icon="chatbubbles"
            label="Öppna chatten"
            tone="primary"
            onPress={() => router.push(`/chatt/${activity.threadId}`)}
          />
        ) : null,
    });
  }, [navigation, activity, router]);

  if (loading || !activity) return <Screen><Loading /></Screen>;

  const full = activity.spotsLeft === 0;
  const past = new Date(activity.endsAt).getTime() < Date.now();

  async function apply(message: string, experience: ExperienceLevel | undefined) {
    if (!activity) return;
    setWorking(true);
    try {
      await getBackend().applyToActivity(activity.id, message, experience);
      setApplying(false);
      await load();
    } catch (error) {
      Alert.alert("Kunde inte haka på", describe(error));
    } finally {
      setWorking(false);
    }
  }

  async function withdraw() {
    if (!activity?.myParticipantId) return;
    Alert.alert("Hoppa av?", "Du tas bort från aktiviteten och dess chatt.", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Hoppa av",
        style: "destructive",
        onPress: async () => {
          setWorking(true);
          try {
            await getBackend().withdrawApplication(activity.myParticipantId!);
            await load();
          } catch (error) {
            Alert.alert("Gick inte", describe(error));
          } finally {
            setWorking(false);
          }
        },
      },
    ]);
  }

  async function decide(participantId: string, accept: boolean) {
    setWorking(true);
    try {
      await getBackend().decideApplication(participantId, accept);
      await load();
    } catch (error) {
      Alert.alert("Gick inte", describe(error));
    } finally {
      setWorking(false);
    }
  }

  function cancelActivity() {
    if (!activity) return;
    Alert.alert("Ställa in?", "Alla som är med får ett meddelande i chatten.", [
      { text: "Avbryt", style: "cancel" },
      {
        text: "Ställ in",
        style: "destructive",
        onPress: async () => {
          try {
            await getBackend().cancelActivity(activity.id, "Värden ställde in.");
            await load();
          } catch (error) {
            Alert.alert("Gick inte", describe(error));
          }
        },
      },
    ]);
  }

  return (
    <Screen padded={false} edges={[]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xxxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void load(); }}
          />
        }
      >
        <Cover
          uri={activity.coverUrl}
          category={activity.category}
          title={activity.title}
          style={{ width: "100%", height: 230, backgroundColor: theme.color.surfaceAlt }}
        />

        <View style={{ padding: space.lg }}>
          <Row gap="xs" wrap>
            {activity.visibility === "friends" && (
              <Badge label="Bara kompisar" icon="heart" tone="accent" />
            )}
            {activity.status === "cancelled" && <Badge label="Inställd" tone="dark" />}
            {past && activity.status !== "cancelled" && <Badge label="Har varit" tone="dark" />}
            {activity.category && <Badge label={interestLabel(activity.category)} tone="dark" />}
          </Row>

          <Gap size="md" />
          <Txt variant="display">{activity.title}</Txt>

          <Gap size="lg" />

          <InfoRow icon="time-outline" text={formatActivityWhen(activity.startsAt, activity.endsAt)} />
          <Gap size="sm" />
          <Pressable
            onPress={() => Linking.openURL(mapsUrl(activity, activity.locationName))}
            accessibilityRole="link"
            accessibilityLabel={`Öppna ${activity.locationName} i kartor`}
          >
            <Row justify="space-between" gap="sm">
              <InfoRow
                icon="location-outline"
                text={activity.locationName
                  + (activity.distanceM !== null
                    ? ` · ${formatDistance(activity.distanceM)}`
                    : "")}
              />
              <Row gap="xs" style={{ flexShrink: 0 }}>
                <Txt variant="small" tone="primary">Karta</Txt>
                <Ionicons name="open-outline" size={14} color={theme.color.primary} />
              </Row>
            </Row>
          </Pressable>
          <Gap size="sm" />
          <InfoRow
            icon="people-outline"
            text={activity.capacity === null
              ? `${activity.acceptedCount} med · ingen gräns`
              : `${activity.acceptedCount} av ${activity.capacity} platser tagna`}
          />
          {/* Bara när det faktiskt kostar. Tystnad betyder att det inte gör
              det, vilket är det normala och därför inte behöver sägas. */}
          {formatCost(activity.priceSek) && (
            <>
              <Gap size="sm" />
              <InfoRow icon="wallet-outline" text={formatCost(activity.priceSek)!} />
            </>
          )}

          {activity.description && (
            <>
              <Gap size="lg" />
              <Txt variant="body">{activity.description}</Txt>
            </>
          )}

          <Gap size="lg" />
          <Divider />

          <Txt variant="heading">Värd</Txt>
          <Gap size="md" />
          <PersonRow
            id={activity.hostId}
            name={activity.hostName}
            avatar={activity.hostAvatar}
            activityCount={activity.hostActivityCount}
            onPress={() => router.push(`/person/${activity.hostId}`)}
          />

          {activity.accepted.length > 0 && (
            <>
              <Gap size="lg" />
              <Divider />
              <Txt variant="heading">Med på det ({activity.accepted.length})</Txt>
              <Gap size="md" />
              <View style={{ gap: space.md }}>
                {activity.accepted.map((person) => (
                  <PersonRow
                    key={person.participantId}
                    id={person.profile.id}
                    name={person.profile.displayName}
                    avatar={person.profile.avatarUrl}
                    activityCount={person.profile.activitiesJoined}
                    onPress={() => router.push(`/person/${person.profile.id}`)}
                  />
                ))}
              </View>
            </>
          )}

          {activity.isMine && activity.applicants.length > 0 && (
            <>
              <Gap size="lg" />
              <Divider />
              <Txt variant="heading">
                Vill haka på ({activity.applicants.length})
              </Txt>
              <Gap size="xs" />
              <Txt variant="small" tone="muted">
                Accepterar du någon hamnar ni direkt i en chatt tillsammans.
              </Txt>
              {full && (
                <>
                  <Gap size="sm" />
                  {/* Utan den här raden ser knapparna nedanför bara ut att
                      vara trasiga. */}
                  <Txt variant="small" tone="danger">
                    Alla platser är tagna. Hoppar någon av kan du acceptera fler.
                  </Txt>
                </>
              )}
              <Gap size="md" />

              <View style={{ gap: space.md }}>
                {activity.applicants.map((applicant) => (
                  <ApplicantCard
                    key={applicant.participantId}
                    applicant={applicant}
                    disabled={working || full}
                    onOpen={() => router.push(`/person/${applicant.profile.id}`)}
                    onDecide={(accept) => decide(applicant.participantId, accept)}
                  />
                ))}
              </View>
            </>
          )}

          <Gap size="xl" />

          <ActionArea
            activity={activity}
            working={working}
            onApply={() => setApplying(true)}
            onWithdraw={withdraw}
            onCancel={cancelActivity}
            onOpenChat={() =>
              activity.threadId && router.push(`/chatt/${activity.threadId}`)
            }
            onRepeat={() =>
              router.push({
                pathname: "/aktivitet/ny",
                params: { title: activity.title, category: activity.category ?? "" },
              })
            }
          />
        </View>
      </ScrollView>

      <ApplySheet
        visible={applying}
        activityTitle={activity.title}
        priceSek={activity.priceSek}
        working={working}
        onCancel={() => setApplying(false)}
        onSubmit={apply}
      />
    </Screen>
  );
}

function InfoRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  const theme = useTheme();
  return (
    <Row gap="sm" style={{ flex: 1, minWidth: 0 }}>
      <Ionicons name={icon} size={17} color={theme.color.textMuted} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt variant="body" tone="muted">{text}</Txt>
      </View>
    </Row>
  );
}

function PersonRow({
  name,
  avatar,
  activityCount,
  onPress,
}: {
  id: string;
  name: string;
  avatar: string;
  activityCount?: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name}>
      <Row justify="space-between">
        <Row gap="md">
          <Avatar uri={avatar} name={name} size={44} />
          <View>
            <Txt variant="bodyStrong">{name}</Txt>
            <Credentials verified activityCount={activityCount} size="micro" />
          </View>
        </Row>
        <Ionicons name="chevron-forward" size={18} color={theme.color.textFaint} />
      </Row>
    </Pressable>
  );
}

/** Nivån i klartext. Beskriver aktiviteten, aldrig personen. */
const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = {
  first_time: "Första gången",
  some: "Gjort det förr",
  often: "Gör det ofta",
};

function ApplicantCard({
  applicant,
  disabled,
  onOpen,
  onDecide,
}: {
  applicant: Applicant;
  disabled: boolean;
  onOpen: () => void;
  onDecide: (accept: boolean) => void;
}) {
  const profile = applicant.profile;

  return (
    <Card>
      <View style={{ padding: space.lg }}>
        <Pressable onPress={onOpen} accessibilityRole="button">
          <Row gap="md">
            <Avatar uri={profile.avatarUrl} name={profile.displayName} size={48} />
            <View style={{ flex: 1 }}>
              <Txt variant="bodyStrong">
                {profile.displayName}, {profile.approxAge}
              </Txt>
              <Credentials
                verified={profile.bankIdVerified}
                activityCount={profile.activitiesJoined}
                memberSince={profile.memberSince}
                size="micro"
              />
              {profile.homeAreaLabel && (
                <Txt variant="small" tone="faint">{profile.homeAreaLabel}</Txt>
              )}
            </View>
          </Row>
        </Pressable>

        {applicant.introMessage && (
          <>
            <Gap size="md" />
            <Txt variant="body">”{applicant.introMessage}”</Txt>
          </>
        )}

        {applicant.experience && (
          <>
            <Gap size="sm" />
            <Row gap="sm">
              <Chip label={EXPERIENCE_LABEL[applicant.experience]} tone="accent" />
            </Row>
          </>
        )}

        <Gap size="md" />

        <Row gap="sm">
          <View style={{ flex: 1 }}>
            <Button
              label="Acceptera"
              icon="checkmark"
              onPress={() => onDecide(true)}
              disabled={disabled}
            />
          </View>
          <Button
            label="Nej tack"
            kind="secondary"
            onPress={() => onDecide(false)}
            disabled={disabled}
            fullWidth={false}
          />
        </Row>
      </View>
    </Card>
  );
}

/** Den stora knappen längst ner beror helt på vem du är i sammanhanget. */
function ActionArea({
  activity,
  working,
  onApply,
  onWithdraw,
  onCancel,
  onOpenChat,
  onRepeat,
}: {
  activity: ActivityDetail;
  working: boolean;
  onApply: () => void;
  onWithdraw: () => void;
  onCancel: () => void;
  onOpenChat: () => void;
  onRepeat: () => void;
}) {
  const past = new Date(activity.endsAt).getTime() < Date.now();
  const full = activity.spotsLeft === 0;

  if (activity.status === "cancelled") {
    return <Txt variant="small" tone="faint" align="center">Aktiviteten är inställd.</Txt>;
  }

  if (past) {
    return (
      <View style={{ gap: space.sm }}>
        {activity.threadId && (
          <Button label="Öppna chatten" icon="chatbubbles" kind="secondary" onPress={onOpenChat} />
        )}
        <Button label="Gör om det här" icon="repeat" onPress={onRepeat} />
      </View>
    );
  }

  if (activity.isMine) {
    return (
      <View style={{ gap: space.sm }}>
        {activity.threadId && (
          <Button label="Öppna chatten" icon="chatbubbles" onPress={onOpenChat} />
        )}
        <Button label="Ställ in aktiviteten" kind="danger" onPress={onCancel} />
      </View>
    );
  }

  switch (activity.myStatus) {
    case "accepted":
      return (
        <View style={{ gap: space.sm }}>
          <Button label="Öppna chatten" icon="chatbubbles" onPress={onOpenChat} />
          <Button label="Hoppa av" kind="ghost" onPress={onWithdraw} />
        </View>
      );

    case "pending":
      return (
        <View style={{ gap: space.sm }}>
          <Txt variant="small" tone="muted" align="center">
            Du har ansökt. Värden hör av sig.
          </Txt>
          <Button label="Ta tillbaka ansökan" kind="ghost" onPress={onWithdraw} />
        </View>
      );

    case "declined":
      return (
        <Txt variant="small" tone="faint" align="center">
          Värden tackade nej den här gången.
        </Txt>
      );

    default:
      return (
        <Button
          label={full ? "Fullt" : "Jag vill haka på"}
          icon="hand-right"
          onPress={onApply}
          loading={working}
          disabled={full}
        />
      );
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Något gick fel.";
}
