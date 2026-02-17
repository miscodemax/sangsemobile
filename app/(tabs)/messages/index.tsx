import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user]);

  async function fetchConversations() {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        participant_1_profile:profiles!conversations_participant_1_fkey(id, username, avatar_url),
        participant_2_profile:profiles!conversations_participant_2_fkey(id, username, avatar_url)
      `,
      )
      .or(`participant_1.eq.${user?.id},participant_2.eq.${user?.id}`)
      .order("last_message_at", { ascending: false });

    if (!error) setConversations(data || []);
    setLoading(false);
  }

  function getOtherUser(conv: any) {
    if (conv.participant_1 === user?.id) return conv.participant_2_profile;
    return conv.participant_1_profile;
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6C63FF" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Aucune conversation pour l'instant
          </Text>
          <Text style={styles.emptySubtext}>
            Contacte un vendeur depuis une annonce !
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const other = getOtherUser(item);
            return (
              <TouchableOpacity
                style={styles.convItem}
                onPress={() => router.push(`/messages/${item.id}`)}
              >
                <Image
                  source={{
                    uri: other?.avatar_url || "https://via.placeholder.com/50",
                  }}
                  style={styles.avatar}
                />
                <View style={styles.convInfo}>
                  <Text style={styles.username}>
                    {other?.username || "Utilisateur"}
                  </Text>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.last_message || "Nouvelle conversation"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingTop: 60 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 16, color: "#333", fontWeight: "600" },
  emptySubtext: { fontSize: 13, color: "#999", marginTop: 8 },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#eee" },
  convInfo: { marginLeft: 12, flex: 1 },
  username: { fontWeight: "600", fontSize: 15 },
  lastMessage: { color: "#999", fontSize: 13, marginTop: 2 },
});
