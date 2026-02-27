import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Palette ──────────────────────────────────────────────────────────────────
const COLORS = {
  primary: "#FFD700",
  inactive: "#888",
  background: "#111",
  badge: "#FF3B30",
};

// ─── Badge Component ──────────────────────────────────────────────────────────
const TabBarIconWithBadge = ({
  name,
  color,
  size,
  badgeCount = 0,
}: {
  name: any;
  color: string;
  size: number;
  badgeCount?: number;
}) => (
  <View
    style={{
      width: size + 10,
      height: size + 10,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Ionicons name={name} size={size} color={color} />
    {badgeCount > 0 && (
      <View style={styles.badgeContainer}>
        <Text style={styles.badgeText}>
          {badgeCount > 99 ? "99+" : badgeCount}
        </Text>
      </View>
    )}
  </View>
);

// ─── FAB Center Button ────────────────────────────────────────────────────────
const CustomTabBarButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    style={styles.fabContainer}
    activeOpacity={0.9}
    onPress={onPress}
  >
    <View style={styles.fab}>
      <Ionicons name="add" size={34} color={COLORS.background} />
    </View>
  </TouchableOpacity>
);

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  // ─── Fetch unread messages count ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();

    // Écoute en temps réel les nouveaux messages
    const channel = supabase
      .channel("unread_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => fetchUnreadCount(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        () => fetchUnreadCount(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function fetchUnreadCount() {
    if (!user) return;

    // Récupère les conversations de l'utilisateur
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`);

    if (!convs || convs.length === 0) return;

    const convIds = convs.map((c) => c.id);

    // Compte les messages non lus envoyés par d'autres
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .eq("is_read", false)
      .neq("sender_id", user.id);

    setUnreadCount(count || 0);
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: styles.tabBarStyle,
        tabBarLabelStyle: styles.tabBarLabelStyle,
      }}
    >
      {/* 🏠 Accueil */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: () =>
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />

      {/* 🏬 Store */}
      <Tabs.Screen
        name="store/[id]"
        options={{
          title: "Store",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "storefront" : "storefront-outline"}
              size={size}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            if (user?.id) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/store/${user.id}`);
            }
          },
        }}
      />

      {/* ➕ Vendre (FAB) */}
      <Tabs.Screen
        name="vendre"
        options={{
          tabBarShowLabel: false,
          tabBarButton: (props) => (
            <CustomTabBarButton
              {...props}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/vendre");
              }}
            />
          ),
        }}
      />

      {/* 💬 Messages */}
      <Tabs.Screen
        name="messages/index"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconWithBadge
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={size}
              color={color}
              badgeCount={unreadCount}
            />
          ),
        }}
        listeners={{
          tabPress: () =>
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />

      {/* 👤 Profil */}
      <Tabs.Screen
        name="profile/[id]"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            if (user?.id) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/profile/${user.id}`);
            }
          },
        }}
      />

      {/* 🔒 Pages cachées */}
      <Tabs.Screen name="favoris" options={{ href: null }} />
      <Tabs.Screen name="product/[id]" options={{ href: null }} />
      <Tabs.Screen name="edit/[id]" options={{ href: null }} />
      <Tabs.Screen name="editprofile/[id]" options={{ href: null }} />
      <Tabs.Screen name="messages/[id]" options={{ href: null }} />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBarStyle: {
    backgroundColor: COLORS.background,
    borderTopWidth: 0,
    height: Platform.OS === "ios" ? 90 : 70,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: -5,
    marginBottom: Platform.OS === "ios" ? -15 : 5,
  },
  fabContainer: {
    top: -25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 10,
  },
  fab: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: COLORS.background,
  },
  badgeContainer: {
    position: "absolute",
    right: -2,
    top: -2,
    backgroundColor: COLORS.badge,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});
