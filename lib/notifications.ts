import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabaseClient";

// Configuration de l'affichage des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Enregistre le token push de l'utilisateur
export async function registerPushToken(userId: string) {
  if (!Device.isDevice) return; // Ne marche pas sur émulateur

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // Sauvegarde le token dans Supabase
    await supabase
      .from("profiles")
      .update({ push_token: token })
      .eq("id", userId);

    // Configuration Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("messages", {
        name: "Messages",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6C63FF",
        sound: "default",
      });
    }

    return token;
  } catch (error) {
    console.error("Erreur push token:", error);
  }
}

// Envoie une notification via Expo Push API
export async function sendPushNotification(
  recipientUserId: string,
  senderUsername: string,
  message: string,
) {
  try {
    // Récupère le token du destinataire
    const { data: profile } = await supabase
      .from("profiles")
      .select("push_token")
      .eq("id", recipientUserId)
      .single();

    if (!profile?.push_token) return;

    // Envoie la notification via Expo Push API
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: profile.push_token,
        title: `💬 ${senderUsername}`,
        body: message.length > 50 ? message.substring(0, 50) + "..." : message,
        sound: "default",
        badge: 1,
        channelId: "messages",
        data: { type: "message" },
      }),
    });
  } catch (error) {
    console.error("Erreur envoi notification:", error);
  }
}
