// app/(tabs)/profile.tsx
import { useAuth } from '@/context/authContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import AuthModal from '../composants/authModal';

export default function ProfileTab() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [signingOut, setSigningOut] = useState(false);

    const handleSignOut = async () => {
        try {
            setSigningOut(true);
            await signOut();
        } catch (error) {
            console.error('Erreur déconnexion:', error);
        } finally {
            setSigningOut(false);
        }
    };

    // État de chargement
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F6C445" />
                <Text style={styles.loadingText}>Chargement...</Text>
            </View>
        );
    }

    // Non connecté - Écran d'invitation
    if (!user) {
        return (
            <>
                <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
                <View style={styles.guestContainer}>
                    {/* Illustration/Icon */}
                    <View style={styles.iconCircle}>
                        <Ionicons name="person-outline" size={64} color="#F6C445" />
                    </View>

                    {/* Message d'accueil */}
                    <Text style={styles.guestTitle}>Rejoins la communauté</Text>
                    <Text style={styles.guestSubtitle}>
                        Connecte-toi pour vendre, acheter et échanger avec des milliers d'utilisateurs
                    </Text>

                    {/* Avantages */}
                    <View style={styles.benefitsContainer}>
                        <BenefitItem
                            icon="flash"
                            text="Vends en quelques clics"
                        />
                        <BenefitItem
                            icon="shield-checkmark"
                            text="Transactions sécurisées"
                        />
                        <BenefitItem
                            icon="chatbubbles"
                            text="Discussion instantanée"
                        />
                    </View>

                    {/* Bouton de connexion */}
                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={() => setShowAuthModal(true)}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#F6C445', '#F8D563']}
                            style={styles.loginButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="log-in-outline" size={20} color="#1C2B49" />
                            <Text style={styles.loginButtonText}>Se connecter</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Lien d'exploration */}
                    <TouchableOpacity
                        style={styles.exploreButton}
                        onPress={() => router.push('/')}
                    >
                        <Text style={styles.exploreText}>Continuer sans compte</Text>
                    </TouchableOpacity>

                    <AuthModal
                        visible={showAuthModal}
                        onClose={() => setShowAuthModal(false)}
                    />
                </View>
            </>
        );
    }

    // Connecté - Profil complet
    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#1C2B49" />
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header avec dégradé */}
                <LinearGradient
                    colors={['#1C2B49', '#2A3F5F']}
                    style={styles.header}
                >
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: user?.avatar_url || user?.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.email || 'User') }}
                            style={styles.avatar}
                        />
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        </View>
                    </View>

                    {/* Info utilisateur */}
                    <Text style={styles.username}>
                        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur'}
                    </Text>
                    <Text style={styles.email}>{user?.email}</Text>

                    {/* Badge membre */}
                    <View style={styles.memberBadge}>
                        <Ionicons name="star" size={14} color="#F6C445" />
                        <Text style={styles.memberText}>Membre depuis 2025</Text>
                    </View>
                </LinearGradient>

                {/* Stats en carte */}
                <View style={styles.statsCard}>
                    <StatItem
                        icon="cube-outline"
                        value="24"
                        label="Produits"
                        color="#4CAF50"
                    />
                    <View style={styles.statDivider} />
                    <StatItem
                        icon="star"
                        value="4.8"
                        label="Note"
                        color="#F6C445"
                    />
                    <View style={styles.statDivider} />
                    <StatItem
                        icon="cart-outline"
                        value="12"
                        label="Ventes"
                        color="#2196F3"
                    />
                </View>

                {/* Menu Actions */}
                <View style={styles.menuContainer}>
                    <Text style={styles.sectionTitle}>Mon compte</Text>

                    <MenuItem
                        icon="cube-outline"
                        title="Mes produits"
                        subtitle="Gérer mes annonces"
                        onPress={() => router.push('/')}
                    />
                    <MenuItem
                        icon="heart-outline"
                        title="Favoris"
                        subtitle="Articles sauvegardés"
                        badge="3"
                        onPress={() => router.push('/')}
                    />
                    <MenuItem
                        icon="chatbubbles-outline"
                        title="Messages"
                        subtitle="Conversations"
                        badge="2"
                        onPress={() => router.push('/')}
                    />
                    <MenuItem
                        icon="wallet-outline"
                        title="Paiements"
                        subtitle="Modes de paiement"
                        onPress={() => router.push('/')}
                    />

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Paramètres</Text>

                    <MenuItem
                        icon="settings-outline"
                        title="Préférences"
                        subtitle="Notifications, langue..."
                        onPress={() => router.push('/')}
                    />
                    <MenuItem
                        icon="help-circle-outline"
                        title="Aide & Support"
                        subtitle="FAQ, contact"
                        onPress={() => router.push('/')}
                    />
                    <MenuItem
                        icon="shield-checkmark-outline"
                        title="Confidentialité"
                        subtitle="Données et sécurité"
                        onPress={() => router.push('/')}
                    />

                    {/* Bouton déconnexion */}
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleSignOut}
                        disabled={signingOut}
                    >
                        {signingOut ? (
                            <ActivityIndicator color="#EF4444" size="small" />
                        ) : (
                            <>
                                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                                <Text style={styles.logoutText}>Se déconnecter</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Version 1.0.0</Text>
                    <Text style={styles.footerText}>© 2025 Sangse Marketplace</Text>
                </View>
            </ScrollView>
        </>
    );
}

// Composant Avantage
const BenefitItem = ({ icon, text }: { icon: any, text: string }) => (
    <View style={styles.benefitItem}>
        <View style={styles.benefitIcon}>
            <Ionicons name={icon} size={20} color="#F6C445" />
        </View>
        <Text style={styles.benefitText}>{text}</Text>
    </View>
);

// Composant Stat
const StatItem = ({ icon, value, label, color }: { icon: any, value: string, label: string, color: string }) => (
    <View style={styles.statItem}>
        <Ionicons name={icon} size={28} color={color} />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

// Composant MenuItem
const MenuItem = ({
    icon,
    title,
    subtitle,
    badge,
    onPress
}: {
    icon: any,
    title: string,
    subtitle: string,
    badge?: string,
    onPress: () => void
}) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.menuIconContainer}>
            <Ionicons name={icon} size={24} color="#1C2B49" />
        </View>
        <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>{title}</Text>
            <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
        {badge && (
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
            </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },

    // Guest Screen
    guestContainer: {
        flex: 1,
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 32,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFF8E1',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 24,
    },
    guestTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1C2B49',
        textAlign: 'center',
        marginBottom: 12,
    },
    guestSubtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
    },
    benefitsContainer: {
        marginBottom: 40,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    benefitIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF8E1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    benefitText: {
        fontSize: 15,
        color: '#1C2B49',
        fontWeight: '600',
    },
    loginButton: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#F6C445',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        marginBottom: 16,
    },
    loginButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1C2B49',
    },
    exploreButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    exploreText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },

    // Logged In Screen
    scrollView: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#fff',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    username: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 12,
    },
    memberBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(246,196,69,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    memberText: {
        fontSize: 12,
        color: '#F6C445',
        fontWeight: '600',
    },

    // Stats Card
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: -20,
        borderRadius: 16,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1C2B49',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 12,
    },

    // Menu
    menuContainer: {
        marginTop: 24,
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1C2B49',
        marginBottom: 12,
        marginTop: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    menuIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1C2B49',
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 13,
        color: '#666',
    },
    badge: {
        backgroundColor: '#EF4444',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginRight: 8,
    },
    badgeText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#FFE5E5',
    },
    logoutText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
    },

    // Footer
    footer: {
        alignItems: 'center',
        paddingVertical: 24,
        gap: 4,
    },
    footerText: {
        fontSize: 12,
        color: '#999',
    },
});