// context/authContext.tsx
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
    signInWithGoogle: async () => { },
    signOut: async () => { },
    refreshUser: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // 🔄 Charge la session au démarrage
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                console.log("🔧 Initialisation de l'authentification...");

                // Récupère la session existante
                const { data: { session: currentSession }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("❌ Erreur getSession:", error);
                } else {
                    console.log("✅ Session chargée:", currentSession?.user?.email || "Aucune session");
                    setSession(currentSession);
                    setUser(currentSession?.user ?? null);
                }
            } catch (error) {
                console.error("❌ Erreur d'initialisation:", error);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // 👂 Écoute les changements d'authentification
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            console.log("🔔 Auth event:", event);
            console.log("👤 User:", newSession?.user?.email || "Aucun");

            setSession(newSession);
            setUser(newSession?.user ?? null);

            // Actions spécifiques selon l'événement
            switch (event) {
                case "SIGNED_IN":
                    console.log("✅ Connexion réussie");
                    break;
                case "SIGNED_OUT":
                    console.log("🚪 Déconnexion");
                    break;
                case "TOKEN_REFRESHED":
                    console.log("🔄 Token rafraîchi");
                    break;
                case "USER_UPDATED":
                    console.log("👤 Utilisateur mis à jour");
                    break;
            }
        });

        return () => {
            console.log("🧹 Nettoyage du listener auth");
            authListener.subscription.unsubscribe();
        };
    }, []);

    // 🔐 Connexion avec Google OAuth
    const signInWithGoogle = async () => {
        try {
            console.log("🚀 Démarrage OAuth Google");

            // Crée l'URL de redirection
            const redirectUrl = "appmobilesangse://auth/callback";

            console.log("🔗 Redirect URL:", redirectUrl);

            // Lance l'OAuth
            const { data, error: authError } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (authError) {
                console.error("❌ Erreur OAuth:", authError);
                throw authError;
            }

            if (!data?.url) {
                throw new Error("URL d'authentification manquante");
            }

            console.log("🌐 Ouverture du navigateur...");

            // Ouvre le navigateur pour l'authentification
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectUrl
            );

            console.log("📱 Résultat:", result);

            if (result.type === "success") {
                // Parse l'URL de retour pour extraire les tokens
                const url = result.url;
                const params = new URLSearchParams(url.split("#")[1] || url.split("?")[1]);

                const access_token = params.get("access_token");
                const refresh_token = params.get("refresh_token");
                const error_description = params.get("error_description");

                console.log("🎫 Tokens:", {
                    access: !!access_token,
                    refresh: !!refresh_token
                });

                if (error_description) {
                    throw new Error(decodeURIComponent(error_description));
                }

                if (access_token && refresh_token) {
                    console.log("💾 Établissement de la session...");

                    // Établit la session avec les tokens
                    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                        access_token,
                        refresh_token,
                    });

                    if (sessionError) {
                        console.error("❌ Erreur setSession:", sessionError);
                        throw sessionError;
                    }

                    console.log("✅ Session établie:", sessionData.session?.user?.email);

                    // Met à jour l'état local
                    setSession(sessionData.session);
                    setUser(sessionData.session?.user ?? null);

                    Alert.alert(
                        "Connexion réussie",
                        `Bienvenue ${sessionData.session?.user?.email} 🎉`
                    );
                } else {
                    throw new Error("Tokens manquants dans la réponse");
                }
            } else if (result.type === "cancel") {
                console.log("❌ Authentification annulée");
                Alert.alert("Connexion annulée", "Vous avez annulé la connexion");
            }
        } catch (error: any) {
            console.error("❌ Erreur complète:", error);
            Alert.alert(
                "Erreur de connexion",
                error.message || "Une erreur est survenue"
            );
            throw error;
        }
    };

    // 🚪 Déconnexion
    const signOut = async () => {
        try {
            console.log("🚪 Déconnexion en cours...");

            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error("❌ Erreur signOut:", error);
                throw error;
            }

            // Réinitialise l'état local
            setUser(null);
            setSession(null);

            console.log("✅ Déconnexion réussie");
            Alert.alert("Déconnecté", "À bientôt ! 👋");
        } catch (error: any) {
            console.error("❌ Erreur de déconnexion:", error);
            Alert.alert("Erreur", "Impossible de se déconnecter");
            throw error;
        }
    };

    // 🔄 Rafraîchit les données utilisateur
    const refreshUser = async () => {
        try {
            console.log("🔄 Rafraîchissement utilisateur...");

            const { data: { user: refreshedUser }, error } = await supabase.auth.getUser();

            if (error) {
                console.error("❌ Erreur refresh:", error);
                throw error;
            }

            setUser(refreshedUser);
            console.log("✅ Utilisateur rafraîchi:", refreshedUser?.email);
        } catch (error) {
            console.error("❌ Erreur refreshUser:", error);
        }
    };

    const value = {
        user,
        session,
        loading,
        signInWithGoogle,
        signOut,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error("useAuth doit être utilisé dans un AuthProvider");
    }

    return context;
}