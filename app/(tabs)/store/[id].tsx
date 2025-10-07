import AuthModal from '@/app/composants/authModal';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Product = {
    id: string;
    title: string;
    price: number | null;
    description?: string | null;
    image_url?: string | null;
    created_at?: string | null;
    whatsapp_number?: string | null;
};

export default function StoreScreen() {
    const router = useRouter();
    const params: any = useLocalSearchParams();
    const storeId = params?.id;
    const { user } = useAuth();
    const [authVisible, setAuthVisible] = useState(false);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [profile, setProfile] = useState<{ display_name?: string | null; avatar_url?: string | null } | null>(null);
    const [stats, setStats] = useState({ total: 0, totalValue: 0 });

    const scrollY = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!user) setAuthVisible(true);
    }, [user]);

    useEffect(() => {
        if (user) fetchProducts();
    }, [storeId, user]);

    useEffect(() => {
        if (!user) return;
        let mounted = true;
        (async () => {
            try {
                const { data, error } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle();
                if (!error && data && mounted) setProfile({ display_name: data.display_name, avatar_url: data.avatar_url });
            } catch (e) {
                // ignore
            }
        })();
        return () => { mounted = false; };
    }, [user]);

    useEffect(() => {
        // Fade in animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, [products]);

    const canManage = user && storeId && user.id === storeId;

    async function fetchProducts() {
        if (!storeId) {
            setProducts([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchErr } = await supabase
                .from('product')
                .select('id,title,price,description,image_url,created_at,whatsapp_number')
                .eq('user_id', storeId)
                .order('created_at', { ascending: false });
            if (fetchErr) throw fetchErr;
            const prods = Array.isArray(data) ? (data as Product[]) : [];
            setProducts(prods);

            // Calculer les stats
            const total = prods.length;
            const totalValue = prods.reduce((sum, p) => sum + (p.price || 0), 0);
            setStats({ total, totalValue });
        } catch (err: any) {
            console.error('fetchProducts', err);
            setError(err.message || 'Erreur lors du chargement des produits.');
        } finally {
            setLoading(false);
        }
    }

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProducts();
        setRefreshing(false);
    };

    const confirmDelete = (productId: string, title?: string) => {
        Alert.alert(
            'Supprimer l\'annonce',
            `Es-tu sûr de vouloir supprimer "${title || 'cette annonce'}" ? Cette action est irréversible.`,
            [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Supprimer', style: 'destructive', onPress: () => handleDelete(productId) },
            ],
            { cancelable: true }
        );
    };

    async function handleDelete(productId: string) {
        if (!canManage) {
            Alert.alert('Accès refusé', "Vous n'êtes pas autorisé à supprimer cette annonce.");
            return;
        }
        const previous = products;
        setProducts(prev => prev.filter(p => p.id !== productId));
        setProcessingId(productId);
        try {
            const { error: deleteImgsErr } = await supabase.from('product_images').delete().eq('product_id', productId);
            if (deleteImgsErr) throw deleteImgsErr;

            const { error: deleteErr } = await supabase.from('product').delete().eq('id', productId);
            if (deleteErr) throw deleteErr;
        } catch (err: any) {
            console.error('handleDelete', err);
            Alert.alert('Erreur', err.message || 'Impossible de supprimer l\'annonce.');
            setProducts(previous);
        } finally {
            setProcessingId(null);
        }
    }

    const handleEdit = (productId: string) => router.push(`/edit/${productId}`);
    const goToNew = () => router.push('/vendre');
    const goToProduct = (productId: string) => router.push(`/product/${productId}`);

    const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utilisateur';
    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;

    const formattedPrice = (price?: number | null) => {
        if (!price && price !== 0) return 'Prix non défini';
        return `${Number(price).toLocaleString('fr-FR')} FCFA`;
    };

    const headerScale = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [1, 0.95],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 50],
        outputRange: [1, 0.8],
        extrapolate: 'clamp',
    });

    if (!user) return <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#F8F9FB" barStyle="dark-content" />

            <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ scale: headerScale }] }]}>
                <View style={styles.headerContent}>
                    <View style={styles.profileSection}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarInitials}>{(displayName || 'U').slice(0, 2).toUpperCase()}</Text>
                            </View>
                        )}
                        <View style={styles.profileInfo}>
                            <Text style={styles.greeting}>Bonjour 👋</Text>
                            <Text style={styles.userName}>{displayName}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
                        <Ionicons name="refresh" size={22} color="#1C2B49" />
                    </TouchableOpacity>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <View style={styles.statIcon}>
                            <Ionicons name="cube" size={20} color="#F6C445" />
                        </View>
                        <Text style={styles.statValue}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Produits</Text>
                    </View>

                    <View style={[styles.statCard, styles.statCardHighlight]}>
                        <View style={styles.statIcon}>
                            <Ionicons name="cash" size={20} color="#10B981" />
                        </View>
                        <Text style={styles.statValue}>{(stats.totalValue / 1000).toFixed(0)}k</Text>
                        <Text style={styles.statLabel}>Valeur totale</Text>
                    </View>

                    <TouchableOpacity style={styles.statCard} onPress={goToNew}>
                        <View style={[styles.statIcon, styles.addIcon]}>
                            <Ionicons name="add" size={24} color="#fff" />
                        </View>
                        <Text style={styles.statLabel}>Ajouter</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#F6C445"
                        colors={['#F6C445']}
                    />
                }
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <View style={styles.loaderCircle}>
                            <ActivityIndicator size="large" color="#F6C445" />
                        </View>
                        <Text style={styles.loadingText}>Chargement...</Text>
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <View style={styles.errorIcon}>
                            <Ionicons name="alert-circle" size={48} color="#EF4444" />
                        </View>
                        <Text style={styles.errorTitle}>Oups !</Text>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={fetchProducts}>
                            <Ionicons name="refresh" size={18} color="#fff" />
                            <Text style={styles.retryText}>Réessayer</Text>
                        </TouchableOpacity>
                    </View>
                ) : products.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIllustration}>
                            <Ionicons name="bag-handle-outline" size={64} color="#D1D5DB" />
                        </View>
                        <Text style={styles.emptyTitle}>Aucune annonce</Text>
                        <Text style={styles.emptyText}>
                            Commence à vendre en ajoutant ta première annonce.
                        </Text>
                        {canManage && (
                            <TouchableOpacity style={styles.ctaButton} onPress={goToNew}>
                                <Ionicons name="add-circle" size={20} color="#1C2B49" />
                                <Text style={styles.ctaText}>Créer une annonce</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Mes annonces</Text>
                            <Text style={styles.sectionCount}>{products.length} article{products.length > 1 ? 's' : ''}</Text>
                        </View>

                        {products.map((p, index) => (
                            <Animated.View
                                key={p.id}
                                style={[
                                    styles.cardWrapper,
                                    {
                                        opacity: fadeAnim,
                                        transform: [{
                                            translateY: fadeAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [20, 0],
                                            })
                                        }]
                                    }
                                ]}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.95}
                                    onPress={() => goToProduct(p.id)}
                                    style={styles.card}
                                >
                                    <View style={styles.cardImageWrapper}>
                                        <Image
                                            source={p.image_url ? { uri: p.image_url } : require('@/assets/images/icon.png')}
                                            style={styles.cardImage}
                                        />
                                        {index === 0 && (
                                            <View style={styles.recentBadge}>
                                                <Text style={styles.recentText}>Récent</Text>
                                            </View>
                                        )}
                                    </View>

                                    <View style={styles.cardContent}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.productTitle} numberOfLines={2}>{p.title}</Text>
                                            <Text style={styles.productPrice}>{formattedPrice(p.price)}</Text>
                                        </View>

                                        <View style={styles.cardMeta}>
                                            <View style={styles.metaItem}>
                                                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                                                <Text style={styles.metaText}>
                                                    {p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR', {
                                                        day: 'numeric',
                                                        month: 'short'
                                                    }) : '—'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.cardActions}>
                                            <TouchableOpacity
                                                style={styles.editButton}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(p.id);
                                                }}
                                                disabled={!canManage}
                                            >
                                                <Ionicons name="create-outline" size={18} color="#1C2B49" />
                                                <Text style={styles.editText}>Modifier</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    confirmDelete(p.id, p.title);
                                                }}
                                                disabled={!canManage || processingId === p.id}
                                            >
                                                {processingId === p.id ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <>
                                                        <Ionicons name="trash-outline" size={18} color="#fff" />
                                                        <Text style={styles.deleteText}>Supprimer</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}

                        <View style={styles.footer}>
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                            <Text style={styles.footerText}>Toutes les annonces chargées</Text>
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Floating Action Button */}
            {canManage && products.length > 0 && (
                <TouchableOpacity style={styles.fab} onPress={goToNew}>
                    <Ionicons name="add" size={28} color="#1C2B49" />
                </TouchableOpacity>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8F9FB',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#F6C445',
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#F6C445',
    },
    avatarInitials: {
        color: '#1C2B49',
        fontWeight: '800',
        fontSize: 18,
    },
    profileInfo: {
        marginLeft: 12,
    },
    greeting: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    userName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
        marginTop: 2,
    },
    refreshBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#F8F9FB',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    statCardHighlight: {
        backgroundColor: '#D1FAE5',
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    addIcon: {
        backgroundColor: '#F6C445',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 100,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 80,
    },
    loaderCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
    },
    errorContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    errorIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 8,
    },
    errorText: {
        color: '#6B7280',
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F6C445',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 14,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    retryText: {
        color: '#1C2B49',
        fontWeight: '700',
        fontSize: 15,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyIllustration: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F6C445',
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
    },
    ctaText: {
        color: '#1C2B49',
        fontWeight: '800',
        fontSize: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
    },
    sectionCount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    cardWrapper: {
        marginBottom: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardImageWrapper: {
        position: 'relative',
        width: '100%',
        height: 200,
    },
    cardImage: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
    },
    recentBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#10B981',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    recentText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardContent: {
        padding: 16,
    },
    cardHeader: {
        marginBottom: 12,
    },
    productTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 6,
        lineHeight: 24,
    },
    productPrice: {
        fontSize: 20,
        fontWeight: '800',
        color: '#F6C445',
    },
    cardMeta: {
        marginBottom: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 10,
    },
    editButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#F3F4F6',
        paddingVertical: 12,
        borderRadius: 12,
    },
    editText: {
        color: '#1C2B49',
        fontWeight: '700',
        fontSize: 14,
    },
    deleteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#EF4444',
        paddingVertical: 12,
        borderRadius: 12,
    },
    deleteText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 24,
    },
    footerText: {
        fontSize: 14,
        color: '#10B981',
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 80,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F6C445',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
    },
});