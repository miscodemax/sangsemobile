import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import AuthModal from "../../composants/authModal";
import ProductCard from "../../composants/productCard";

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const ITEM_MARGIN = 14;
const NUM_COLUMNS = 2;

const CATEGORIES = [
    { id: 'all', name: 'Tout', icon: '🗂' },
    { id: 'vetement', name: 'Vêtements', icon: '👗' },
    { id: 'soins_et_astuces', name: 'Soins', icon: '💄' },
    { id: 'maquillage', name: 'Maquillage', icon: '💋' },
    { id: 'artisanat', name: 'Artisanat', icon: '🎨' },
    { id: 'electronique', name: 'Électronique', icon: '📱' },
    { id: 'accessoire', name: 'Accessoires', icon: '👜' },
    { id: 'chaussure', name: 'Chaussures', icon: '👠' },
];

const PRICE_RANGES = [
    { id: 'all', label: 'Tous', min: 0, max: Infinity },
    { id: 'low', label: '< 10k', min: 0, max: 10000 },
    { id: 'medium', label: '10k - 50k', min: 10000, max: 50000 },
    { id: 'high', label: '> 50k', min: 50001, max: Infinity },
];

type Profile = {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
    bio?: string;
    created_at?: string;
    wave_number?: string | null;
};

type Product = {
    id: string;
    title: string;
    price?: number;
    image_url?: string;
    category?: string;
    created_at?: string;
};

const formatJoinDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    return date.toLocaleDateString('fr-FR', options);
};

const StarRating = ({ rating, count }: { rating: number; count: number }) => (
    <View style={styles.starContainer}>
        {[...Array(5)].map((_, index) => (
            <Ionicons
                key={index}
                name={index < Math.round(rating) ? "star" : "star-outline"}
                size={14}
                color="#F6C445"
            />
        ))}
        {count > 0 && <Text style={styles.ratingCount}>({count})</Text>}
    </View>
);

const maskWave = (num?: string | null) => {
    if (!num) return null;
    const cleaned = num.replace(/\s+/g, '');
    if (cleaned.length <= 4) return cleaned;
    const len = cleaned.length;
    const last = cleaned.slice(-3);
    const first = cleaned.slice(0, Math.max(0, len - 6));
    return `${first ? first + ' ' : ''}*** ${last}`;
};

export default function ProfilePage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showFilters, setShowFilters] = useState(false);

    const [rating, setRating] = useState<number>(0);
    const [ratingCount, setRatingCount] = useState<number>(0);
    const [isBioExpanded, setIsBioExpanded] = useState(false);

    const scrollY = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!user) setShowAuthModal(true);
        else setShowAuthModal(false);
    }, [user]);

    useEffect(() => {
        if (!id) return;
        fetchData();
    }, [id]);

    useEffect(() => {
        if (products.length > 0) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();
        }
    }, [products]);

    const fetchData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("id, username, full_name, avatar_url, bio, created_at, wave_number")
                .eq("id", id)
                .maybeSingle();
            if (profileError) console.warn("Erreur profil:", profileError.message);
            setProfile(profileData || null);

            const { data: productsData, error: productsError } = await supabase
                .from("product")
                .select("id, title, price, image_url, category, created_at")
                .eq("user_id", id)
                .order('created_at', { ascending: false });
            if (productsError) console.warn("Erreur produits:", productsError.message);
            setProducts(productsData || []);

            const { data: ratingsData, error: ratingsError } = await supabase
                .from("ratings_sellers")
                .select("rating")
                .eq("seller_id", id);
            if (!ratingsError && ratingsData) {
                const validRatings = ratingsData.map((r: any) => r.rating).filter((r: any) => r != null && r >= 1 && r <= 5) as number[];
                const count = validRatings.length;
                const avg = count > 0 ? validRatings.reduce((a, b) => a + b, 0) / count : 0;
                setRating(avg);
                setRatingCount(count);
            }
        } catch (err) {
            console.error("profile fetch error", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const filteredProducts = useMemo(() => {
        const q = (searchQuery || '').trim().toLowerCase();
        const priceRange = PRICE_RANGES.find(r => r.id === selectedPriceRange) || PRICE_RANGES[0];

        return products.filter(p => {
            const matchesCategory = selectedCategory === 'all' || (p.category === selectedCategory);
            const price = typeof p.price === 'number' ? p.price : NaN;
            const matchesPrice = priceRange.id === 'all' || (Number.isFinite(price) && price >= priceRange.min && price <= priceRange.max);
            const matchesSearch = !q || (p.title && p.title.toLowerCase().includes(q));
            return matchesCategory && matchesPrice && matchesSearch;
        });
    }, [products, selectedCategory, selectedPriceRange, searchQuery]);

    const isOwner = useMemo(() => !!(user && id && user.id === id), [user, id]);
    const hasActiveFilters = selectedCategory !== 'all' || selectedPriceRange !== 'all' || !!searchQuery;

    const toggleBio = useCallback(() => setIsBioExpanded(s => !s), []);
    const clearFilters = useCallback(() => {
        setSelectedCategory('all');
        setSelectedPriceRange('all');
        setSearchQuery('');
    }, []);

    const headerScale = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [1, 0.95],
        extrapolate: 'clamp',
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loaderCircle}>
                    <ActivityIndicator size="large" color="#F6C445" />
                </View>
                <Text style={styles.loadingText}>Chargement du profil...</Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.errorContainer}>
                <View style={styles.errorIcon}>
                    <Ionicons name="person-outline" size={64} color="#D1D5DB" />
                </View>
                <Text style={styles.errorTitle}>Profil introuvable</Text>
                <Text style={styles.errorText}>Ce profil n'existe pas ou a été supprimé</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={20} color="#1C2B49" />
                    <Text style={styles.backButtonText}>Retour</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
            <AuthModal visible={showAuthModal} onClose={() => router.replace('/')} />
            <Animated.ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#F6C445"
                        colors={['#F6C445']}
                    />
                }
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                {/* Cover & Avatar Section */}
                <Animated.View style={[styles.coverSection, { transform: [{ scale: headerScale }] }]}>
                    <View style={styles.coverGradient} />
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: profile.avatar_url || 'https://placehold.co/120x120/F5F5F5/888?text=Profile' }}
                            style={styles.avatar}
                        />
                        {isOwner && (
                            <TouchableOpacity
                                style={styles.editAvatarButton}
                                onPress={() => router.push(`/editprofile/${id}`)}
                            >
                                <Ionicons name="camera" size={18} color="#1C2B49" />
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>

                {/* Profile Info */}
                <View style={styles.profileInfo}>
                    <View style={styles.nameSection}>
                        <Text style={styles.username}>@{profile.username || 'utilisateur'}</Text>
                        {profile.full_name && (
                            <Text style={styles.fullName}>{profile.full_name}</Text>
                        )}
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <View style={styles.statIcon}>
                                <Ionicons name="cube" size={20} color="#F6C445" />
                            </View>
                            <View>
                                <Text style={styles.statValue}>{products.length}</Text>
                                <Text style={styles.statLabel}>Articles</Text>
                            </View>
                        </View>

                        <View style={styles.statBox}>
                            <View style={styles.statIcon}>
                                <Ionicons name="star" size={20} color="#F6C445" />
                            </View>
                            <View>
                                <Text style={styles.statValue}>
                                    {ratingCount > 0 ? rating.toFixed(1) : '—'}
                                </Text>
                                <Text style={styles.statLabel}>
                                    {ratingCount > 0 ? `${ratingCount} avis` : 'Aucun avis'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.statBox}>
                            <View style={styles.statIcon}>
                                <Ionicons name="calendar-outline" size={20} color="#F6C445" />
                            </View>
                            <View>
                                <Text style={styles.statValue}>{profile.created_at ? formatJoinDate(profile.created_at).split(' ')[2] : '—'}</Text>
                                <Text style={styles.statLabel}>Membre</Text>
                            </View>
                        </View>
                    </View>

                    {/* Bio */}
                    {profile.bio && (
                        <View style={styles.bioSection}>
                            <Text style={styles.bioText} numberOfLines={isBioExpanded ? undefined : 3}>
                                {profile.bio}
                            </Text>
                            {profile.bio.length > 120 && (
                                <TouchableOpacity onPress={toggleBio}>
                                    <Text style={styles.readMore}>
                                        {isBioExpanded ? "Voir moins" : "Voir plus"}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Wave Number */}
                    <View style={styles.waveSection}>
                        {profile.wave_number ? (
                            <View style={styles.waveCard}>
                                <View style={styles.waveIcon}>
                                    <Ionicons name="card" size={20} color="#10B981" />
                                </View>
                                <View style={styles.waveInfo}>
                                    <Text style={styles.waveLabel}>Numéro Wave</Text>
                                    <Text style={styles.waveNumber}>{maskWave(profile.wave_number)}</Text>
                                </View>
                            </View>
                        ) : isOwner ? (
                            <TouchableOpacity
                                style={styles.wavePrompt}
                                onPress={() => router.push(`/editprofile/${id}`)}
                            >
                                <Ionicons name="information-circle" size={20} color="#F6C445" />
                                <Text style={styles.wavePromptText}>
                                    Ajoutez votre numéro Wave pour recevoir des paiements
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color="#F6C445" />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                        {isOwner ? (
                            <>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.primaryButton]}
                                    onPress={() => router.push(`/store/${id}`)}
                                >
                                    <Ionicons name="storefront" size={20} color="#1C2B49" />
                                    <Text style={styles.primaryButtonText}>Ma boutique</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.secondaryButton]}
                                    onPress={() => router.push(`/editprofile/${id}`)}
                                >
                                    <Ionicons name="create-outline" size={20} color="#6B7280" />
                                    <Text style={styles.secondaryButtonText}>Modifier</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity style={[styles.actionButton, styles.primaryButton]}>
                                    <Ionicons name="person-add" size={20} color="#1C2B49" />
                                    <Text style={styles.primaryButtonText}>Suivre</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]}>
                                    <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
                                    <Text style={styles.secondaryButtonText}>Contacter</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

                {/* Products Section */}
                <View style={styles.productsSection}>
                    <View style={styles.productsSectionHeader}>
                        <Text style={styles.sectionTitle}>Articles à vendre</Text>
                        <TouchableOpacity
                            style={styles.filterToggle}
                            onPress={() => setShowFilters(!showFilters)}
                        >
                            <Ionicons name="options" size={20} color="#1C2B49" />
                            {hasActiveFilters && <View style={styles.filterDot} />}
                        </TouchableOpacity>
                    </View>

                    {showFilters && (
                        <View style={styles.filtersPanel}>
                            <View style={styles.filterHeader}>
                                <Text style={styles.filterTitle}>Filtres</Text>
                                {hasActiveFilters && (
                                    <TouchableOpacity onPress={clearFilters} style={styles.clearButton}>
                                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                                        <Text style={styles.clearText}>Effacer</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Search */}
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={18} color="#9CA3AF" />
                                <TextInput
                                    placeholder="Rechercher..."
                                    placeholderTextColor="#9CA3AF"
                                    style={styles.searchInput}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                                        <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Categories */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>Catégories</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {CATEGORIES.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[
                                                styles.filterChip,
                                                selectedCategory === cat.id && styles.filterChipActive,
                                            ]}
                                            onPress={() => setSelectedCategory(cat.id)}
                                        >
                                            <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                                            <Text
                                                style={[
                                                    styles.filterChipText,
                                                    selectedCategory === cat.id && styles.filterChipTextActive,
                                                ]}
                                            >
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Price */}
                            <View style={styles.filterSection}>
                                <Text style={styles.filterSectionTitle}>Prix</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {PRICE_RANGES.map((range) => (
                                        <TouchableOpacity
                                            key={range.id}
                                            style={[
                                                styles.filterChip,
                                                selectedPriceRange === range.id && styles.filterChipActive,
                                            ]}
                                            onPress={() => setSelectedPriceRange(range.id)}
                                        >
                                            <Text
                                                style={[
                                                    styles.filterChipText,
                                                    selectedPriceRange === range.id && styles.filterChipTextActive,
                                                ]}
                                            >
                                                {range.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        </View>
                    )}

                    <Text style={styles.productCount}>
                        {filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''}
                    </Text>

                    {filteredProducts.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
                            </View>
                            <Text style={styles.emptyTitle}>Aucun article</Text>
                            <Text style={styles.emptyText}>
                                {hasActiveFilters
                                    ? 'Aucun article ne correspond à vos filtres'
                                    : 'Aucun article en vente pour le moment'}
                            </Text>
                            {hasActiveFilters && (
                                <TouchableOpacity style={styles.emptyButton} onPress={clearFilters}>
                                    <Text style={styles.emptyButtonText}>Réinitialiser</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <Animated.View style={[styles.productsGrid, { opacity: fadeAnim }]}>
                            {filteredProducts.map((product, index) => (
                                <View
                                    key={product.id}
                                    style={[
                                        styles.productItem,
                                        index % 2 === 0 ? { marginRight: ITEM_MARGIN / 2 } : { marginLeft: ITEM_MARGIN / 2 },
                                    ]}
                                >
                                    <ProductCard
                                        product={product}
                                        onPress={() => router.push(`/product/${product.id}`)}
                                    />
                                </View>
                            ))}
                        </Animated.View>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </Animated.ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
        marginBottom: 60,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FB',
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
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FB',
        paddingHorizontal: 40,
    },
    errorIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 15,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 32,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F6C445',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    backButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1C2B49',
    },
    coverSection: {
        height: 200,
        backgroundColor: '#FEF3C7',
        position: 'relative',
    },
    coverGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 100,
        backgroundColor: 'rgba(246, 196, 69, 0.3)',
    },
    avatarContainer: {
        position: 'absolute',
        bottom: -60,
        left: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 5,
        borderColor: '#FFF',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F6C445',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFF',
    },
    profileInfo: {
        backgroundColor: '#FFF',
        marginTop: 70,
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    nameSection: {
        marginBottom: 20,
    },
    username: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 4,
    },
    fullName: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#F8F9FB',
        padding: 12,
        borderRadius: 12,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
    },
    statLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
    },
    bioSection: {
        marginBottom: 16,
    },
    bioText: {
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    readMore: {
        fontSize: 14,
        color: '#F6C445',
        fontWeight: '700',
        marginTop: 8,
    },
    waveSection: {
        marginBottom: 20,
    },
    waveCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    waveIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    waveInfo: {
        flex: 1,
    },
    waveLabel: {
        fontSize: 12,
        color: '#065F46',
        fontWeight: '600',
        marginBottom: 2,
    },
    waveNumber: {
        fontSize: 16,
        color: '#047857',
        fontWeight: '700',
    },
    wavePrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        padding: 12,
        borderRadius: 12,
        gap: 8,
    },
    wavePromptText: {
        flex: 1,
        fontSize: 13,
        color: '#92400E',
        fontWeight: '600',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 14,
    },
    primaryButton: {
        backgroundColor: '#F6C445',
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1C2B49',
    },
    secondaryButton: {
        backgroundColor: '#F3F4F6',
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#6B7280',
    },
    productsSection: {
        marginTop: 16,
        paddingHorizontal: 20,
    },
    productsSectionHeader: {
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
    filterToggle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    filterDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
    },
    filtersPanel: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    filterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    filterTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1F2937',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    clearText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#EF4444',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        borderRadius: 12,
        height: 48,
        gap: 8,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
    },
    filterSection: {
        marginBottom: 14,
    },
    filterSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        marginRight: 8,
        gap: 6,
    },
    filterChipActive: {
        backgroundColor: '#F6C445',
    },
    filterChipText: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
    },
    filterChipTextActive: {
        color: '#1C2B49',
        fontWeight: '700',
    },
    categoryEmoji: {
        fontSize: 16,
    },
    productCount: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
        marginBottom: 16,
    },
    productsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -ITEM_MARGIN / 2,
    },
    productItem: {
        width: (width - GRID_PADDING * 2 - ITEM_MARGIN) / 2,
        marginBottom: ITEM_MARGIN,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    emptyButton: {
        backgroundColor: '#F6C445',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    emptyButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1C2B49',
    },
    starContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    ratingCount: {
        fontSize: 11,
        color: '#6B7280',
        marginLeft: 4,
        fontWeight: '600',
    },
});