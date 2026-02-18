import { Session, User } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { supabase } from "../lib/supabaseClient";

WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Charge la session au démarrage
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    loadSession();

    // Écoute les changements de session
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "appmobilesangse://auth/callback",
          skipBrowserRedirect: true, // Important !
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error("Pas d'URL de connexion");

      // Ouvre le navigateur et attend le retour
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        "appmobilesangse://auth/callback",
      );

      if (result.type === "success") {
        // Extrait les tokens de l'URL de retour
        const url = result.url;
        const params = new URLSearchParams(url.split("#")[1]);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        }
      }
    } catch (error: any) {
      console.error("❌ Erreur Google SignIn:", error);
      Alert.alert(
        "Erreur de connexion",
        error.message || "Une erreur est survenue",
      );
    }
  };
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert("Erreur", "Impossible de se déconnecter");
      console.error(error);
    } else {
      setUser(null);
      setSession(null);
      Alert.alert("Déconnecté", "À bientôt 👋");
    }
  };

  const refreshUser = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) return console.error(error);
    setUser(data.user);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithGoogle, signOut, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
