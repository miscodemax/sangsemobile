import { useAuth } from "@/context/authContext";
import { sendPushNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface OtherUser {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    fetchConversationInfo();
    fetchMessages();

    const channel = supabase
      .channel(`chat:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(
            () => flatListRef.current?.scrollToEnd({ animated: true }),
            100,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  async function fetchConversationInfo() {
    const { data: conv } = await supabase
      .from("conversations")
      .select("participant_1, participant_2")
      .eq("id", id)
      .single();

    if (!conv) return;

    const otherUserId =
      conv.participant_1 === user?.id ? conv.participant_2 : conv.participant_1;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, full_name")
      .eq("id", otherUserId)
      .single();

    if (profile) setOtherUser(profile);
  }

  async function fetchMessages() {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    setMessages(data || []);
    setLoading(false);
    setTimeout(
      () => flatListRef.current?.scrollToEnd({ animated: false }),
      100,
    );
    // Marque les messages comme lus
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", id)
      .neq("sender_id", user?.id)
      .eq("is_read", false);
  }

  async function sendMessage() {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);

    await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user?.id,
      content,
    });

    await supabase
      .from("conversations")
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Envoie la notification au destinataire
    if (otherUser?.id) {
      const { data: senderProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user?.id)
        .single();

      await sendPushNotification(
        otherUser.id,
        senderProfile?.username || "Quelqu'un",
        content,
      );
    }

    setSending(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.sender_id === user?.id;
    const prevMsg = messages[index - 1];
    const showAvatar =
      !isMe && (!prevMsg || prevMsg.sender_id !== item.sender_id);

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowThem,
        ]}
      >
        {/* Avatar interlocuteur */}
        {!isMe && (
          <View style={styles.avatarSlot}>
            {showAvatar && (
              <Image
                source={{
                  uri:
                    otherUser?.avatar_url ||
                    "https://placehold.co/32x32/F3F4F6/888?text=U",
                }}
                style={styles.messageAvatar}
              />
            )}
          </View>
        )}

        <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
          <View
            style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
          >
            <Text
              style={[
                styles.bubbleText,
                isMe ? styles.textMe : styles.textThem,
              ]}
            >
              {item.content}
            </Text>
          </View>
          <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.userInfo} activeOpacity={0.7}>
          <Image
            source={{
              uri:
                otherUser?.avatar_url ||
                "https://placehold.co/40x40/F3F4F6/888?text=U",
            }}
            style={styles.headerAvatar}
          />
          <View>
            <Text style={styles.headerName}>
              {otherUser?.username ? `@${otherUser.username}` : "Chargement..."}
            </Text>
            {otherUser?.full_name && (
              <Text style={styles.headerFullName}>{otherUser.full_name}</Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={{ width: 40 }} />
      </View>

      {/* ── Messages ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C63FF" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  Commencez la conversation !
                </Text>
                <Text style={styles.emptySubtext}>
                  Dites bonjour à {otherUser?.username || "votre interlocuteur"}{" "}
                  👋
                </Text>
              </View>
            }
          />
        )}

        {/* ── Input ── */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Écris ton message..."
              placeholderTextColor="#9CA3AF"
              multiline
              maxLength={500}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!text.trim() || sending) && styles.sendBtnDisabled,
              ]}
              onPress={sendMessage}
              disabled={!text.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  paddingTop: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "#fff",
    elevation: 2,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginHorizontal: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 2,
    borderColor: "#6C63FF",
  },
  headerName: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  headerFullName: { fontSize: 12, color: "#6B7280" },

  // Messages
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  messagesList: { padding: 16, paddingBottom: 8, gap: 4 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#6B7280" },
  emptySubtext: { fontSize: 13, color: "#9CA3AF" },

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  messageRowMe: { justifyContent: "flex-end" },
  messageRowThem: { justifyContent: "flex-start" },
  avatarSlot: { width: 32, marginRight: 8 },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },

  bubbleWrapper: { maxWidth: "75%" },
  bubbleWrapperMe: { alignItems: "flex-end" },

  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 2,
  },
  bubbleMe: {
    backgroundColor: "#6C63FF",
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: "#F3F4F6",
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  textMe: { color: "#fff" },
  textThem: { color: "#1F2937" },
  timeText: { fontSize: 11, color: "#9CA3AF", marginHorizontal: 4 },
  timeTextMe: { textAlign: "right" },

  // Input
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 70,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    maxHeight: 100,
    paddingVertical: 4,
    minHeight: 36,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { backgroundColor: "#C4B5FD" },
});
