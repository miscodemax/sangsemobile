import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

type DbMessage = {
    id: number;
    sender_id: string;
    receiver_id: string;
    message: string;
    created_at: string;
};

export default function ChatScreen() {
    const { id } = useLocalSearchParams();
    const otherId = Array.isArray(id) ? id[0] : id;

    const { user } = useAuth();
    const meId = user?.id;

    // 🐛 DEBUG: Afficher les IDs au chargement
    console.log("=== CHAT DEBUG ===");
    console.log("meId:", meId);
    console.log("otherId:", otherId);

    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [text, setText] = useState("");
    const [messages, setMessages] = useState<DbMessage[]>([]);
    const [profiles, setProfiles] = useState<
        Record<string, { username?: string; avatar_url?: string }>
    >({});
    const channelRef = useRef<any>(null);
    const flatListRef = useRef<FlatList>(null);

    // 🧠 Charger les profils participants
    const fetchProfiles = useCallback(async () => {
        if (!meId || !otherId) {
            console.log("❌ fetchProfiles: IDs manquants");
            return;
        }

        console.log("🔍 Chargement des profils pour:", [meId, otherId]);

        try {
            const ids = [meId, otherId];
            const { data, error } = await supabase
                .from("profiles")
                .select("id, username, avatar_url")
                .in("id", ids);

            if (error) {
                console.error("❌ Erreur fetchProfiles:", error);
                throw error;
            }

            console.log("✅ Profils chargés:", data);

            const map: Record<string, { username?: string; avatar_url?: string }> = {};
            for (const p of data) {
                map[p.id] = { username: p.username, avatar_url: p.avatar_url };
            }
            setProfiles(map);
        } catch (err: any) {
            console.warn("⚠️ Erreur fetchProfiles:", err.message);
        }
    }, [meId, otherId]);

    // 📩 Charger les messages
    useEffect(() => {
        if (!meId || !otherId) {
            console.log("❌ Pas d'IDs disponibles");
            setLoading(false);
            return;
        }

        const fetchMessages = async () => {
            console.log("📨 Début du chargement des messages...");
            console.log("Requête entre:", meId, "et", otherId);

            setLoading(true);
            try {
                // Essayer d'abord une requête simple pour tester
                const { data, error, count } = await supabase
                    .from("messages")
                    .select("*", { count: 'exact' })
                    .or(
                        `and(sender_id.eq.${meId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${meId})`
                    )
                    .order("created_at", { ascending: true });

                console.log("📊 Résultat requête:");
                console.log("- Nombre total:", count);
                console.log("- Messages:", data);
                console.log("- Erreur:", error);

                if (error) {
                    console.error("❌ Erreur Supabase:", error);
                    throw error;
                }

                setMessages(data || []);
                console.log(`✅ ${data?.length || 0} messages chargés`);

            } catch (err: any) {
                console.error("❌ Erreur fetch messages:", err.message);
                console.error("Détails:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
        fetchProfiles();

    }, [meId, otherId, fetchProfiles]);

    // Auto-scroll
    useEffect(() => {
        if (messages.length > 0) {
            console.log("📜 Auto-scroll vers le bas");
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages.length]);

    // 🔄 Abonnement temps réel
    useEffect(() => {
        if (!meId || !otherId) return;

        const channelIdentifier = [meId, otherId].sort().join("-");
        console.log("🔔 Création du canal realtime:", channelIdentifier);

        const channel = supabase
            .channel(`chat:${channelIdentifier}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "messages" },
                (payload: any) => {
                    console.log("📬 Nouveau message reçu:", payload.new);
                    const m: DbMessage = payload.new;
                    if (!m) return;

                    const relevant =
                        (m.sender_id === meId && m.receiver_id === otherId) ||
                        (m.sender_id === otherId && m.receiver_id === meId);

                    console.log("Message pertinent?", relevant);

                    if (relevant) {
                        setMessages((prev) => {
                            if (prev.some((x) => x.id === m.id)) return prev;
                            return [...prev, m];
                        });
                    }
                }
            )
            .subscribe((status) => {
                console.log("📡 Status du canal:", status);
            });

        channelRef.current = channel;

        return () => {
            console.log("🔌 Déconnexion du canal realtime");
            channelRef.current?.unsubscribe();
            channelRef.current = null;
        };
    }, [meId, otherId]);

    // ✉️ Envoi d'un message
    const sendMessage = useCallback(async () => {
        if (!meId || !otherId || !text.trim()) {
            console.log("❌ Impossible d'envoyer: données manquantes");
            return;
        }

        const content = text.trim();
        console.log("📤 Envoi du message:", content);

        setText("");
        setSending(true);

        try {
            const messageData = {
                sender_id: meId,
                receiver_id: otherId,
                message: content,
            };

            console.log("Données à envoyer:", messageData);

            const { data, error } = await supabase
                .from("messages")
                .insert(messageData)
                .select();

            if (error) {
                console.error("❌ Erreur envoi:", error);
                throw error;
            }

            console.log("✅ Message envoyé:", data);

        } catch (err: any) {
            console.error("❌ Erreur envoi message:", err.message);
            console.error("Détails:", err);
        } finally {
            setSending(false);
        }
    }, [meId, otherId, text]);

    // 💬 Affichage d'un message
    const renderItem = useCallback(
        ({ item }: { item: DbMessage }) => {
            const isMe = item.sender_id === meId;
            const profile = profiles[item.sender_id];
            const name = profile?.username || "Utilisateur";

            return (
                <View style={[styles.row, isMe ? styles.rowRight : styles.rowLeft]}>
                    {!isMe && (
                        <View style={styles.avatarWrapper}>
                            {profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitial}>
                                        {name.slice(0, 2).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                        <Text style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}>
                            {item.message}
                        </Text>
                        <Text style={styles.timeText}>
                            {new Date(item.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </Text>
                    </View>

                    {isMe && (
                        <View style={styles.avatarWrapper}>
                            {profiles[meId!]?.avatar_url ? (
                                <Image source={{ uri: profiles[meId!].avatar_url }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitial}>
                                        {(profiles[meId!]?.username || "Moi").slice(0, 2).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            );
        },
        [meId, profiles]
    );

    const keyExtractor = useCallback((item: DbMessage) => String(item.id), []);

    // 🐛 AJOUT: Affichage de debug si pas de messages
    const renderEmptyList = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptyText}>
                meId: {meId || "manquant"}{"\n"}
                otherId: {otherId || "manquant"}{"\n"}
                Messages chargés: {messages.length}
            </Text>
            <Text style={styles.emptyHint}>
                Envoie le premier message pour commencer la conversation !
            </Text>
        </View>
    );

    if (!otherId) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={{ color: "#333" }}>Identifiant du destinataire manquant.</Text>
                <Text style={{ color: "#999", marginTop: 10 }}>ID reçu: {JSON.stringify(id)}</Text>
            </SafeAreaView>
        );
    }

    if (!meId) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={{ color: "#333" }}>Vous devez être connecté pour discuter.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#F6C445" />
                    <Text style={{ marginTop: 10, color: "#666" }}>Chargement...</Text>
                </View>
            ) : (
                <>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={styles.listContent}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={renderEmptyList}
                    />

                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="Écris un message..."
                            placeholderTextColor="#999"
                            value={text}
                            onChangeText={setText}
                            multiline
                            returnKeyType="send"
                            onSubmitEditing={() => {
                                if (!sending) sendMessage();
                            }}
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, (sending || text.trim() === "") && { opacity: 0.5 }]}
                            onPress={sendMessage}
                            disabled={sending || text.trim() === ""}
                        >
                            {sending ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.sendText}>➤</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#e4a913ff" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { padding: 16, paddingBottom: 8, flexGrow: 1 },
    row: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12 },
    rowLeft: { justifyContent: "flex-start" },
    rowRight: { justifyContent: "flex-end" },
    avatarWrapper: { width: 40, height: 40, marginHorizontal: 8 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitial: { color: "#1C2B49", fontWeight: "700" },
    bubble: { maxWidth: "75%", padding: 12, borderRadius: 18 },
    bubbleMe: { backgroundColor: "#F6C445", borderTopRightRadius: 4 },
    bubbleOther: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E6E9EE", borderTopLeftRadius: 4 },
    messageText: { fontSize: 15, lineHeight: 22 },
    textMe: { color: "#1C2B49", fontWeight: "500" },
    textOther: { color: "#333" },
    timeText: { fontSize: 11, color: "#6B7280", marginTop: 4, alignSelf: "flex-end" },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        backgroundColor: "#FFF",
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        backgroundColor: "#F9FAFB",
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 12 : 8,
        paddingBottom: Platform.OS === 'ios' ? 12 : 8,
        marginRight: 8,
        fontSize: 16,
        color: "#000",
    },
    sendBtn: {
        backgroundColor: "#1C2B49",
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
    },
    sendText: { color: "#fff", fontWeight: "700", fontSize: 20 },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1C2B49",
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 12,
        color: "#666",
        textAlign: "center",
        marginBottom: 20,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    emptyHint: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
    },
});