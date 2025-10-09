import { useAuth } from "@/context/authContext";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Tabs, useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";

// 🎨 Palette de couleurs
const COLORS = {
  primary: "#FFD700",
  inactive: "#888",
  background: "#111",
  badge: "#FF3B30",
};

// 🔔 Icône avec badge
const TabBarIconWithBadge = ({ name, color, size, badgeCount = 0 }) => (
  <View style={{ width: size, height: size }}>
    <Ionicons name={name} size={size} color={color} />
    {badgeCount > 0 && <View style={styles.badgeContainer} />}
  </View>
);

// ➕ Bouton central personnalisé
const CustomTabBarButton = ({ onPress }) => (
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

export default function TabLayout() {
  const { user } = useAuth();
  const router = useRouter();

  const [favoriteNotifications] = useState(2);
  const [profileNotifications] = useState(0);

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

      {/* 🏬 Store dynamique */}
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
            if (!user?.id) {
              console.log("Utilisateur non connecté");
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/store/${user.id}`);
            }
          },
        }}
      />

      {/* ➕ Bouton central "Vendre" */}
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

      {/* ❤️ Favoris */}
      <Tabs.Screen
        name="favoris"
        options={{
          title: "Favoris",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconWithBadge
              name={focused ? "heart" : "heart-outline"}
              size={size}
              color={color}
              badgeCount={favoriteNotifications}
            />
          ),
        }}
        listeners={{
          tabPress: () =>
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        }}
      />

      {/* 👤 Profil dynamique */}
      <Tabs.Screen
        name="profile/[id]"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <TabBarIconWithBadge
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
              badgeCount={profileNotifications}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            if (!user?.id) {
              console.log("Utilisateur non connecté");
            } else {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/profile/${user.id}`);
            }
          },
        }}
      />

      {/* 🔒 Pages cachées */}
      <Tabs.Screen name="product/[id]" options={{ href: null }} />
      <Tabs.Screen name="edit/[id]" options={{ href: null }} />
      <Tabs.Screen name="editprofile/[id]" options={{ href: null }} />
    </Tabs>
  );
}

// 💅 Styles
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
    right: -6,
    top: -2,
    backgroundColor: COLORS.badge,
    borderRadius: 8,
    width: 10,
    height: 10,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
});
