/**
 * BFFs — de permanenta vännerna.
 *
 * Skillnaden mot en vanlig aktivitetskompis: BFFs ser aktiviteter du lägger
 * upp med synlighet "bara mina BFFs", och ni kan alltid chatta.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { getBackend } from "@/api";
import type { BffRequest, PublicProfile } from "@/api/types";
import {
  Avatar, Button, Card, Credentials, EmptyState, Gap, Loading, Row, Screen, Txt,
} from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { space } from "@/theme";

export default function FriendsScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [bffs, setBffs] = useState<PublicProfile[]>([]);
  const [requests, setRequests] = useState<BffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [friends, pending] = await Promise.all([
        getBackend().listBffs(),
        getBackend().listBffRequests(),
      ]);
      setBffs(friends);
      setRequests(pending);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <Screen><Loading /></Screen>;

  async function respond(friendshipId: string, accept: boolean) {
    try {
      await getBackend().respondBff(friendshipId, accept);
      await load();
    } catch (error) {
      Alert.alert("Gick inte", describe(error));
    }
  }

  const incoming = requests.filter((r) => r.incoming);
  const outgoing = requests.filter((r) => !r.incoming);

  return (
    <Screen padded={false} edges={[]}>
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl, gap: space.md }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); void load(); }}
          />
        }
      >
        {incoming.length > 0 && (
          <>
            <Txt variant="heading">Vill bli BFF med dig</Txt>
            {incoming.map((request) => (
              <Card key={request.friendshipId}>
                <View style={{ padding: space.lg, gap: space.md }}>
                  <Pressable onPress={() => router.push(`/person/${request.profile.id}`)}>
                    <Row gap="md">
                      <Avatar
                        uri={request.profile.avatarUrl}
                        name={request.profile.displayName}
                        size={48}
                      />
                      <View style={{ flex: 1 }}>
                        <Txt variant="bodyStrong">{request.profile.displayName}</Txt>
                        <Credentials
                          verified={request.profile.bankIdVerified}
                          activityCount={request.profile.activitiesJoined}
                          size="micro"
                        />
                      </View>
                    </Row>
                  </Pressable>
                  <Row gap="sm">
                    <View style={{ flex: 1 }}>
                      <Button
                        label="Ja gärna"
                        icon="heart"
                        onPress={() => respond(request.friendshipId, true)}
                      />
                    </View>
                    <Button
                      label="Nej tack"
                      kind="secondary"
                      onPress={() => respond(request.friendshipId, false)}
                      fullWidth={false}
                    />
                  </Row>
                </View>
              </Card>
            ))}
            <Gap size="md" />
          </>
        )}

        {bffs.length === 0 && incoming.length === 0 && outgoing.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="Inga BFFs än"
            body="När du varit med om något kul med någon kan du fråga om ni ska bli BFFs. Då ser ni varandras privata aktiviteter."
            action={{ label: "Hitta något att göra", onPress: () => router.push("/(tabs)") }}
          />
        ) : (
          bffs.length > 0 && (
            <>
              <Txt variant="heading">Dina BFFs ({bffs.length})</Txt>
              {bffs.map((person) => (
                <Card key={person.id} onPress={() => router.push(`/person/${person.id}`)}>
                  <View style={{ padding: space.lg }}>
                    <Row justify="space-between">
                      <Row gap="md">
                        <Avatar uri={person.avatarUrl} name={person.displayName} size={48} />
                        <View>
                          <Txt variant="bodyStrong">{person.displayName}</Txt>
                          <Row gap="sm">
                            <Credentials
                            verified={person.bankIdVerified}
                            activityCount={person.activitiesJoined}
                            size="micro"
                          />
                            {person.homeAreaLabel && (
                              <Txt variant="small" tone="faint">· {person.homeAreaLabel}</Txt>
                            )}
                          </Row>
                        </View>
                      </Row>
                      <Ionicons name="chevron-forward" size={18} color={theme.color.textFaint} />
                    </Row>
                  </View>
                </Card>
              ))}
            </>
          )
        )}

        {outgoing.length > 0 && (
          <>
            <Gap size="md" />
            <Txt variant="heading">Väntar på svar</Txt>
            {outgoing.map((request) => (
              <Card key={request.friendshipId}>
                <View style={{ padding: space.lg }}>
                  <Row gap="md">
                    <Avatar
                      uri={request.profile.avatarUrl}
                      name={request.profile.displayName}
                      size={40}
                    />
                    <View style={{ flex: 1 }}>
                      <Txt variant="bodyStrong">{request.profile.displayName}</Txt>
                      <Txt variant="small" tone="faint">Du har frågat</Txt>
                    </View>
                  </Row>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Något gick fel.";
}
