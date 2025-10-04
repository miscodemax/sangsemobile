// app/composants/authModal.tsx
import React, { useState } from "react";
import { ActivityIndicator, Modal, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/authContext";

export default function AuthModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { signInWithGoogle } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            await signInWithGoogle();
            onClose(); // Ferme le modal après succès
        } catch (error) {
            console.error("Erreur modal:", error);
            // L'erreur est déjà gérée dans le contexte avec Alert
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Bouton fermer */}
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>

                    {/* Header */}
                    <Text style={styles.title}>Bienvenue 👋</Text>
                    <Text style={styles.subtitle}>
                        Connecte-toi pour continuer et découvrir plus.
                    </Text>

                    {/* Bouton Google */}
                    <TouchableOpacity
                        onPress={handleGoogleLogin}
                        disabled={loading}
                        style={[styles.button, loading && styles.buttonDisabled]}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <>
                                <ActivityIndicator color="#374151" size="small" />
                                <Text style={styles.buttonText}>Connexion...</Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.googleIcon}>🔍</Text>
                                <Text style={styles.buttonText}>Continuer avec Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Footer */}
                    <Text style={styles.footer}>
                        🔒 Tes données sont sécurisées
                    </Text>

                    <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                        <Text style={styles.cancelText}>Annuler</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 20,
    },
    container: {
        backgroundColor: '#fff',
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        position: 'relative',
    },
    closeButton: {
        position: 'absolute',
        right: 16,
        top: 16,
        zIndex: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1C2B49',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F6C445',
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    googleIcon: {
        fontSize: 20,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1C2B49',
    },
    footer: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 16,
    },
    cancelButton: {
        paddingVertical: 12,
        marginTop: 12,
    },
    cancelText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        fontWeight: '600',
    },
});