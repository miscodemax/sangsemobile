import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    Platform,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Carousel from 'react-native-reanimated-carousel';

const { width, height } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 420;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 88 : 64;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

export default function ProductDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeSlide, setActiveSlide] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (id) fetchProduct();
    }, [id]);

    useEffect(() => {
        // Animation de pulse pour le bouton d'achat
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    async function fetchProduct() {
        try {
            setLoading(true);
            const { data: productData, error: productError } = await supabase
                .from('product')
                .select('*')
                .eq('id', id)
                .single();
            if (productError) throw productError;

            const { data: imagesData } = await supabase
                .from('product_images')
                .select('image_url')
                .eq('product_id', id);

            const { data: sellerData } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, bio')
                .eq('id', productData.user_id)
                .single();

            const isNew = new Date().getTime() - new Date(productData.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;

            setProduct({
                ...productData,
                images: [productData.image_url, ...(imagesData?.map(i => i.image_url) || [])].filter(Boolean),
                seller: sellerData,
                isNew,
            });
        } catch (err) {
            console.error(err);
            Alert.alert('Erreur', 'Impossible de charger ce produit');
        } finally {
            setLoading(false);
        }
    }

    const handleShare = async () => {
        if (!product) return;
        try {
            await Share.share({
                message: `Découvre ${product.title} à ${product.price.toLocaleString()} FCFA sur SangseSho 🛍️\nhttps://sangseshop.sn/product/${product.id}`,
                title: product.title,
            });
        } catch (error) {
            console.error('Erreur de partage:', error);
        }
    };

    const handleBuyNow = () => {
        if (!product) return;
        Alert.alert(
            'Acheter maintenant',
            `Confirmer l'achat de "${product.title}" pour ${product.price.toLocaleString()} FCFA ?`,
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Confirmer',
                    onPress: () => {
                        // Navigation vers le paiement escrow
                        console.log('Achat confirmé');
                    }
                },
            ]
        );
    };

    const toggleFavorite = () => {
        setIsFavorite(!isFavorite);
    };

    const headerTranslateY = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE],
        outputRange: [0, -HEADER_SCROLL_DISTANCE],
        extrapolate: 'clamp',
    });

    const imageOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
        outputRange: [1, 0.5, 0],
        extrapolate: 'clamp',
    });

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
        outputRange: [0, 0, 1],
        extrapolate: 'clamp',
    });

    const imageScale = scrollY.interpolate({
        inputRange: [-100, 0, HEADER_SCROLL_DISTANCE],
        outputRange: [1.3, 1, 0.9],
        extrapolate: 'clamp',
    });

    const renderImage = ({ item, index }: { item: string; index: number }) => (
        <View style={styles.imageSlide}>
            <Image source={{ uri: item }} style={styles.productImage} resizeMode="cover" />
        </View>
    );

    if (loading || !product) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loaderCircle}>
                    <ActivityIndicator size="large" color="#F6C445" />
                </View>
                <Text style={styles.loadingText}>Chargement du produit...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            <Animated.View style={[styles.fixedHeader, { opacity: headerOpacity }]}>
                <BlurView intensity={95} style={StyleSheet.absoluteFill} tint="light">
                    <View style={styles.fixedHeaderContent}>
                        <TouchableOpacity style={styles.headerIconButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#1C2B49" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {product.title}
                        </Text>
                        <TouchableOpacity style={styles.headerIconButton} onPress={handleShare}>
                            <Ionicons name="share-social" size={22} color="#1C2B49" />
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </Animated.View>

            <Animated.ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    style={[
                        styles.imageCarouselContainer,
                        {
                            transform: [
                                { translateY: headerTranslateY },
                                { scale: imageScale }
                            ],
                            opacity: imageOpacity,
                        },
                    ]}
                >
                    <Carousel
                        width={width}
                        height={HEADER_MAX_HEIGHT}
                        data={product.images}
                        renderItem={renderImage}
                        onSnapToItem={(index) => setActiveSlide(index)}
                        scrollAnimationDuration={400}
                        panGestureHandlerProps={{
                            activeOffsetX: [-10, 10],
                        }}
                    />

                    <View style={styles.imageCounter}>
                        <Ionicons name="images" size={14} color="#fff" />
                        <Text style={styles.imageCounterText}>
                            {activeSlide + 1}/{product.images.length}
                        </Text>
                    </View>

                    <LinearGradient
                        colors={['rgba(0,0,0,0.5)', 'transparent']}
                        style={styles.topGradient}
                        pointerEvents="none"
                    />

                    <View style={styles.floatingActions}>
                        <TouchableOpacity style={styles.floatingButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>

                        <View style={styles.floatingRightButtons}>
                            <TouchableOpacity
                                style={[styles.floatingButton, isFavorite && styles.favoriteActive]}
                                onPress={toggleFavorite}
                            >
                                <Ionicons
                                    name={isFavorite ? "heart" : "heart-outline"}
                                    size={24}
                                    color={isFavorite ? "#FF3B30" : "#fff"}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.floatingButton} onPress={handleShare}>
                                <Ionicons name="share-social-outline" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {product.isNew && (
                        <View style={styles.newBadge}>
                            <LinearGradient
                                colors={['#F6C445', '#F0A500']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.newBadgeGradient}
                            >
                                <Ionicons name="sparkles" size={14} color="#1C2B49" />
                                <Text style={styles.newBadgeText}>Nouveau</Text>
                            </LinearGradient>
                        </View>
                    )}

                    <View style={styles.paginationDots}>
                        {product.images.map((_: any, index: number) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    index === activeSlide && styles.dotActive,
                                ]}
                            />
                        ))}
                    </View>
                </Animated.View>

                <View style={styles.contentCard}>
                    {/* Title and Price Hero Section */}
                    <View style={styles.heroSection}>
                        <View style={styles.titleRow}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>{product.title}</Text>
                                <View style={styles.metaRow}>
                                    {product.category && (
                                        <View style={styles.categoryBadge}>
                                            <Text style={styles.categoryEmoji}>
                                                {product.category === 'vetement' ? '👗' :
                                                    product.category === 'electronique' ? '📱' :
                                                        product.category === 'artisanat' ? '🎨' : '📦'}
                                            </Text>
                                            <Text style={styles.categoryText}>{product.category}</Text>
                                        </View>
                                    )}
                                    <View style={styles.timeBadge}>
                                        <Ionicons name="time-outline" size={12} color="#6B7280" />
                                        <Text style={styles.timeText}>
                                            {new Date(product.created_at).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={styles.priceCard}>
                            <Text style={styles.priceLabel}>Prix</Text>
                            <View style={styles.priceRow}>
                                <Text style={styles.priceAmount}>{product.price.toLocaleString()}</Text>
                                <Text style={styles.priceCurrency}>FCFA</Text>
                            </View>
                            <TouchableOpacity style={styles.negotiableButton}>
                                <Ionicons name="cash-outline" size={16} color="#10B981" />
                                <Text style={styles.negotiableText}>Prix négociable</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Seller Card Premium */}
                    <TouchableOpacity
                        style={styles.sellerCard}
                        onPress={() => router.push(`/profile/${product.seller.id}`)}
                        activeOpacity={0.9}
                    >
                        <View style={styles.sellerContent}>
                            <View style={styles.sellerLeft}>
                                <Image
                                    source={{ uri: product.seller.avatar_url || 'https://placehold.co/60x60/F3F4F6/888?text=U' }}
                                    style={styles.sellerAvatar}
                                />
                                <View style={styles.onlineBadge} />
                            </View>

                            <View style={styles.sellerInfo}>
                                <View style={styles.sellerNameRow}>
                                    <Text style={styles.sellerName}>@{product.seller.username}</Text>
                                    <View style={styles.verifiedBadge}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                    </View>
                                </View>

                                {product.seller.bio && (
                                    <Text style={styles.sellerBio} numberOfLines={1}>
                                        {product.seller.bio}
                                    </Text>
                                )}

                                <View style={styles.sellerStats}>
                                    <View style={styles.sellerStat}>
                                        <Ionicons name="star" size={14} color="#F6C445" />
                                        <Text style={styles.sellerStatText}>4.9 (127)</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.sellerStat}>
                                        <Ionicons name="time" size={14} color="#6B7280" />
                                        <Text style={styles.sellerStatText}>Répond en 1h</Text>
                                    </View>
                                </View>
                            </View>

                            <Ionicons name="chevron-forward" size={24} color="#D1D5DB" />
                        </View>
                    </TouchableOpacity>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text
                            style={styles.descriptionText}
                            numberOfLines={showFullDescription ? undefined : 4}
                        >
                            {product.description}
                        </Text>
                        {product.description && product.description.length > 150 && (
                            <TouchableOpacity
                                onPress={() => setShowFullDescription(!showFullDescription)}
                                style={styles.showMoreButton}
                            >
                                <Text style={styles.showMoreText}>
                                    {showFullDescription ? 'Voir moins' : 'Voir plus'}
                                </Text>
                                <Ionicons
                                    name={showFullDescription ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color="#F6C445"
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Product Details */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Détails</Text>
                        <View style={styles.detailsList}>
                            {product.category && (
                                <View style={styles.detailItem}>
                                    <View style={styles.detailIcon}>
                                        <Ionicons name="pricetag" size={18} color="#6B7280" />
                                    </View>
                                    <View style={styles.detailContent}>
                                        <Text style={styles.detailLabel}>Catégorie</Text>
                                        <Text style={styles.detailValue}>{product.category}</Text>
                                    </View>
                                </View>
                            )}
                            {product.zone && (
                                <View style={styles.detailItem}>
                                    <View style={styles.detailIcon}>
                                        <Ionicons name="location" size={18} color="#6B7280" />
                                    </View>
                                    <View style={styles.detailContent}>
                                        <Text style={styles.detailLabel}>Localisation</Text>
                                        <Text style={styles.detailValue}>{product.zone}</Text>
                                    </View>
                                </View>
                            )}
                            <View style={styles.detailItem}>
                                <View style={styles.detailIcon}>
                                    <Ionicons name="shield-checkmark" size={18} color="#6B7280" />
                                </View>
                                <View style={styles.detailContent}>
                                    <Text style={styles.detailLabel}>État</Text>
                                    <Text style={styles.detailValue}>Comme neuf</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Trust Section */}
                    <View style={styles.trustSection}>
                        <Text style={styles.sectionTitle}>Acheter en toute sécurité</Text>
                        <View style={styles.trustList}>
                            <View style={styles.trustItem}>
                                <View style={[styles.trustIconContainer, { backgroundColor: '#D1FAE5' }]}>
                                    <Ionicons name="shield-checkmark" size={24} color="#10B981" />
                                </View>
                                <View style={styles.trustTextContainer}>
                                    <Text style={styles.trustTitle}>Paiement sécurisé</Text>
                                    <Text style={styles.trustDescription}>
                                        Transaction protégée par escrow
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.trustItem}>
                                <View style={[styles.trustIconContainer, { backgroundColor: '#DBEAFE' }]}>
                                    <Ionicons name="cube" size={24} color="#3B82F6" />
                                </View>
                                <View style={styles.trustTextContainer}>
                                    <Text style={styles.trustTitle}>Livraison flexible</Text>
                                    <Text style={styles.trustDescription}>
                                        Remise en main propre ou livraison
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.trustItem}>
                                <View style={[styles.trustIconContainer, { backgroundColor: '#FEF3C7' }]}>
                                    <Ionicons name="ribbon" size={24} color="#F59E0B" />
                                </View>
                                <View style={styles.trustTextContainer}>
                                    <Text style={styles.trustTitle}>Vendeur vérifié</Text>
                                    <Text style={styles.trustDescription}>
                                        Profil authentifié par notre équipe
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 140 }} />
                </View>
            </Animated.ScrollView>

            {/* Fixed Bottom CTA */}
            <View style={styles.bottomCTA}>
                <BlurView intensity={95} style={StyleSheet.absoluteFill} tint="light" />
                <View style={styles.ctaContent}>
                    <TouchableOpacity
                        style={styles.contactButton}
                        onPress={() => router.push(`/chat/${product.seller.id}`)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="chatbubble-ellipses" size={24} color="#1C2B49" />
                        <Text style={styles.contactButtonText}>Message</Text>
                    </TouchableOpacity>

                    <Animated.View style={[styles.buyButtonWrapper, { transform: [{ scale: pulseAnim }] }]}>
                        <TouchableOpacity
                            style={styles.buyButton}
                            onPress={handleBuyNow}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={['#F6C445', '#F0A500']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.buyButtonGradient}
                            >
                                <Ionicons name="lock-closed" size={20} color="#1C2B49" />
                                <Text style={styles.buyButtonText}>Acheter maintenant</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // --- Conteneurs et état de chargement ---
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB', // Un gris très clair pour le fond général
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
        backgroundColor: '#FEF3C7', // Fond jaune pâle pour l'indicateur
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937', // Texte gris foncé
    },
    scrollView: {
        flex: 1,
    },

    // --- Header animé et fixe ---
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HEADER_MIN_HEIGHT, // Hauteur minimale du header
        zIndex: 1000,
    },
    fixedHeaderContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 10, // Marge pour la barre de statut
    },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: '#1C2B49', // Bleu nuit pour le titre
        textAlign: 'center',
        marginHorizontal: 12,
    },

    // --- Carousel d'images (Header) ---
    imageCarouselContainer: {
        height: HEADER_MAX_HEIGHT,
        backgroundColor: '#E5E7EB', // Couleur de fond si l'image charge
    },
    imageSlide: {
        width: width,
        height: HEADER_MAX_HEIGHT,
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 140, // Dégradé pour la lisibilité des boutons flottants
    },
    floatingActions: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    floatingButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    favoriteActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)', // Fond blanc pour le favori actif
    },
    floatingRightButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    imageCounter: {
        position: 'absolute',
        bottom: 70,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    imageCounterText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    newBadge: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 100,
        left: 16,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    newBadgeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 6,
    },
    newBadgeText: {
        color: '#1C2B49',
        fontSize: 13,
        fontWeight: '800',
    },
    paginationDots: {
        position: 'absolute',
        bottom: 38, // Positionné sous le contenu principal
        flexDirection: 'row',
        alignSelf: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    dotActive: {
        backgroundColor: '#F6C445', // Couleur d'accentuation
        width: 24, // Le point actif est plus large
    },

    // --- Contenu principal (sous les images) ---
    contentCard: {
        flex: 1,
        backgroundColor: '#F8F9FB',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        marginTop: -32, // Superposition sur l'image
        paddingTop: 24,
    },

    // --- Section Titre & Prix ---
    heroSection: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 5,
    },
    titleRow: {
        marginBottom: 16,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 12,
        lineHeight: 32,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    categoryEmoji: {
        fontSize: 14,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#92400E', // Marron foncé pour contraster avec le jaune
        textTransform: 'capitalize',
    },
    timeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
    },
    priceCard: {
        backgroundColor: '#F8F9FB', // Fond légèrement différent pour le contraste
        padding: 16,
        borderRadius: 16,
    },
    priceLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
        marginBottom: 6,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 12,
    },
    priceAmount: {
        fontSize: 36,
        fontWeight: '800',
        color: '#1F2937',
    },
    priceCurrency: {
        fontSize: 18,
        fontWeight: '700',
        color: '#6B7280',
    },
    negotiableButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
    },
    negotiableText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10B981', // Vert pour indiquer une action positive
    },

    // --- Carte du vendeur ---
    sellerCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 16,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    sellerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sellerLeft: {
        marginRight: 16,
    },
    sellerAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#F3F4F6',
    },
    onlineBadge: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10B981', // Vert pour "en ligne"
        position: 'absolute',
        bottom: 2,
        right: 2,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    sellerInfo: {
        flex: 1,
    },
    sellerNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    sellerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    verifiedBadge: {
        marginLeft: 6,
    },
    sellerBio: {
        fontSize: 13,
        color: '#6B7280',
    },
    sellerStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    sellerStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statDivider: {
        width: 1,
        height: 14,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 12,
    },
    sellerStatText: {
        fontSize: 12,
        color: '#4B5563',
        fontWeight: '600',
    },

    // --- Sections de contenu (Description, Détails, etc.) ---
    section: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6', // Séparateur très léger
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    descriptionText: {
        fontSize: 15,
        color: '#4B5563',
        lineHeight: 24, // Pour une meilleure lisibilité
    },
    showMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        alignSelf: 'flex-start',
    },
    showMoreText: {
        color: '#F6C445',
        fontWeight: 'bold',
        fontSize: 14,
        marginRight: 4,
    },

    // --- Liste des détails du produit ---
    detailsList: {
        gap: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 13,
        color: '#6B7280',
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
        textTransform: 'capitalize',
    },

    // --- Section Confiance & Sécurité ---
    trustSection: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        paddingBottom: 50,
        marginHorizontal: 16,
        marginTop: 16,
    },
    trustList: {
        gap: 20,
        marginTop: 16,
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    trustIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    trustTextContainer: {
        flex: 1,
    },
    trustTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
    },
    trustDescription: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },

    // --- Barre d'action fixe en bas (CTA) ---
    bottomCTA: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        marginBottom: 90,
    },
    ctaContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Safe area pour iPhone
        gap: 12,
        backgroundColor: 'transparent',
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#E5E7EB', // Fond neutre pour l'action secondaire
        height: 56,
        borderRadius: 28,
        flex: 1,
    },
    contactButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1C2B49',
    },
    buyButtonWrapper: {
        flex: 2, // Le bouton d'achat est plus large
    },
    buyButton: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    buyButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        height: 56,
        borderRadius: 28,
    },
    buyButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1C2B49',
    },
});