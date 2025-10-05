// ProductDetailScreen.tsx - Ultra Soigné Style Vinted
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
const HEADER_MAX_HEIGHT = 450;
const HEADER_MIN_HEIGHT = Platform.OS === 'ios' ? 88 : 64;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

export default function ProductDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeSlide, setActiveSlide] = useState(0);
    const [isFavorite, setIsFavorite] = useState(false);
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (id) fetchProduct();
    }, [id]);

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

            // Déterminer si nouveau (moins de 7 jours)
            const isNew = new Date().getTime() - new Date(productData.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;

            setProduct({
                ...productData,
                images: [productData.image_url, ...(imagesData?.map(i => i.image_url) || [])].filter(Boolean),
                seller: sellerData,
                isNew,
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleShare = async () => {
        if (!product) return;
        try {
            await Share.share({
                message: `Découvre ${product.title} à ${product.price.toLocaleString()} FCFA sur SangSe ! 🛍️\nhttps://sangse.shop/product/${product.id}`,
                title: product.title,
            });
        } catch (error) {
            console.error('Erreur de partage:', error);
        }
    };

    const handleBuyNow = () => {
        if (!product) return;
        console.log('hello');

        //router.push(`/payment/escrow?productId=${product.id}`);
    };

    const toggleFavorite = () => {
        setIsFavorite(!isFavorite);
    };

    // Animation header
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

    const renderImage = ({ item, index }: { item: string; index: number }) => (
        <View style={styles.imageSlide}>
            <Image source={{ uri: item }} style={styles.productImage} resizeMode="cover" />
        </View>
    );

    if (loading || !product) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F6C445" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Fixed Animated Header */}
            <Animated.View
                style={[
                    styles.fixedHeader,
                    {
                        opacity: headerOpacity,
                    },
                ]}
            >
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
                {/* Image Carousel with overlay controls */}
                <Animated.View
                    style={[
                        styles.imageCarouselContainer,
                        {
                            transform: [{ translateY: headerTranslateY }],
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

                    {/* Image counter overlay */}
                    <View style={styles.imageCounter}>
                        <Text style={styles.imageCounterText}>
                            {activeSlide + 1} / {product.images.length}
                        </Text>
                    </View>

                    {/* Top gradient for better readability */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.6)', 'transparent']}
                        style={styles.topGradient}
                        pointerEvents="none"
                    />

                    {/* Floating action buttons */}
                    <View style={styles.floatingActions}>
                        <TouchableOpacity
                            style={styles.floatingButton}
                            onPress={() => router.back()}
                        >
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
                                <Ionicons name="share-social" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* New badge */}
                    {product.isNew && (
                        <View style={styles.newBadge}>
                            <LinearGradient
                                colors={['#F6C445', '#F0A500']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.newBadgeGradient}
                            >
                                <Ionicons name="star" size={14} color="#1C2B49" />
                                <Text style={styles.newBadgeText}>Nouveau</Text>
                            </LinearGradient>
                        </View>
                    )}

                    {/* Pagination dots */}
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

                {/* Content Card - appears to slide over image */}
                <View style={styles.contentCard}>
                    {/* Price section - Hero element */}
                    <View style={styles.priceSection}>
                        <View style={styles.priceRow}>
                            <View>
                                <Text style={styles.priceLabel}>Prix</Text>
                                <View style={styles.priceContainer}>
                                    <Text style={styles.priceAmount}>
                                        {product.price.toLocaleString()}
                                    </Text>
                                    <Text style={styles.priceCurrency}>FCFA</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.makeOfferButton}>
                                <Ionicons name="chatbubble-ellipses" size={20} color="#1C2B49" />
                                <Text style={styles.makeOfferText}>Faire une offre</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Title and category */}
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>{product.title}</Text>
                        <View style={styles.metaRow}>
                            <View style={styles.categoryPill}>
                                <Ionicons name="pricetag" size={14} color="#666" />
                                <Text style={styles.categoryText}>{product.category}</Text>
                            </View>
                            <View style={styles.timePill}>
                                <Ionicons name="time-outline" size={14} color="#666" />
                                <Text style={styles.timeText}>
                                    {new Date(product.created_at).toLocaleDateString('fr-FR', {
                                        day: 'numeric',
                                        month: 'short',
                                    })}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Seller card - Premium style */}
                    <TouchableOpacity
                        style={styles.sellerCard}
                        onPress={() => router.push(`/profile/${product.seller.id}`)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.sellerRow}>
                            {/* Avatar */}
                            <Image
                                source={{ uri: product.seller.avatar_url }}
                                style={styles.sellerAvatar}
                            />

                            {/* Infos vendeur */}
                            <View style={styles.sellerInfo}>
                                <Text style={styles.sellerName}>{product.seller.username}</Text>

                                {/* Bio */}
                                {product.seller.bio ? (
                                    <Text style={styles.sellerBio} numberOfLines={1} ellipsizeMode="tail">
                                        {product.seller.bio}
                                    </Text>
                                ) : null}

                                {/* Stats */}
                                <View style={styles.sellerStats}>
                                    <View style={styles.statItem}>
                                        <Ionicons name="star" size={14} color="#F6C445" />
                                        <Text style={styles.statText}>4.8</Text>
                                    </View>

                                    <View style={styles.statDivider} />

                                    <View style={styles.statItem}>
                                        <Ionicons name="cube" size={14} color="#666" />
                                        <Text style={styles.statText}>24 ventes</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Chevron */}
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </View>
                    </TouchableOpacity>

                    {/* Description */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.descriptionText}>{product.description}</Text>
                    </View>

                    {/* Product details grid */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Détails du produit</Text>
                        <View style={styles.detailsGrid}>
                            {product.category && (
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Catégorie</Text>
                                    <Text style={styles.detailValue}>{product.category}</Text>
                                </View>
                            )}
                            {product.zone && (
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailLabel}>Localisation</Text>
                                    <Text style={styles.detailValue}>{product.zone}</Text>
                                </View>
                            )}
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>État</Text>
                                <Text style={styles.detailValue}>Excellent</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>ID produit</Text>
                                <Text style={styles.detailValue}>#{product.id}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Trust & Safety section */}
                    <View style={styles.trustSection}>
                        <Text style={styles.sectionTitle}>Acheter en toute confiance</Text>
                        <View style={styles.trustItems}>
                            <View style={styles.trustItem}>
                                <View style={styles.trustIcon}>
                                    <Ionicons name="shield-checkmark" size={24} color="#34C759" />
                                </View>
                                <View style={styles.trustContent}>
                                    <Text style={styles.trustTitle}>Paiement sécurisé</Text>
                                    <Text style={styles.trustDesc}>
                                        Protection escrow jusqu'à réception
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.trustItem}>
                                <View style={styles.trustIcon}>
                                    <Ionicons name="time" size={24} color="#007AFF" />
                                </View>
                                <View style={styles.trustContent}>
                                    <Text style={styles.trustTitle}>Livraison rapide</Text>
                                    <Text style={styles.trustDesc}>
                                        Vendeur répond en moins de 2h
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Bottom spacing for fixed button */}
                    <View style={{ height: 120 }} />
                </View>
            </Animated.ScrollView>

            {/* Fixed bottom CTA */}
            <View style={styles.bottomCTA}>
                <BlurView intensity={95} style={StyleSheet.absoluteFill} tint="light" />
                <View style={styles.ctaContent}>
                    <TouchableOpacity
                        style={styles.contactButton}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={24} color="#1C2B49" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.buyButton}
                        onPress={handleBuyNow}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#1C2B49', '#2a3d66']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.buyButtonGradient}
                        >
                            <Ionicons name="lock-closed" size={20} color="#fff" />
                            <Text style={styles.buyButtonText}>Acheter maintenant</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
    },
    scrollView: {
        flex: 1,
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HEADER_MIN_HEIGHT + (Platform.OS === 'ios' ? 44 : 0),
        zIndex: 1000,
        elevation: 10,
    },
    fixedHeaderContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
    },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#1C2B49',
        marginHorizontal: 12,
    },
    imageCarouselContainer: {
        height: HEADER_MAX_HEIGHT,
    },
    imageSlide: {
        width,
        height: HEADER_MAX_HEIGHT,
        backgroundColor: '#000',
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
        height: 120,
    },
    floatingActions: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 54 : 40,
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
        backgroundColor: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(10px)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    favoriteActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    floatingRightButtons: {
        gap: 8,
    },
    imageCounter: {
        position: 'absolute',
        bottom: 70,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backdropFilter: 'blur(10px)',
    },
    imageCounterText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    newBadge: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 110 : 96,
        left: 16,
        borderRadius: 20,
        overflow: 'hidden',
    },
    newBadgeGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
    },
    newBadgeText: {
        color: '#1C2B49',
        fontSize: 12,
        fontWeight: '700',
    },
    paginationDots: {
        position: 'absolute',
        bottom: 20,
        flexDirection: 'row',
        alignSelf: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    dotActive: {
        backgroundColor: '#F6C445',
        width: 20,
    },
    contentCard: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -24,
        paddingTop: 24,
        minHeight: height - HEADER_MAX_HEIGHT + 100,
    },
    priceSection: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
        fontWeight: '500',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6,
    },
    priceAmount: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1C2B49',
    },
    priceCurrency: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    makeOfferButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F6C445',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    makeOfferText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1C2B49',
    },
    titleSection: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1C2B49',
        marginBottom: 12,
        lineHeight: 28,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 8,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    timePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    sellerCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sellerRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sellerAvatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#F0F0F0',
    },
    sellerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    sellerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1C2B49',
        marginBottom: 2,
    },
    sellerBio: {
        fontSize: 13,
        color: '#666',
        marginBottom: 6,
    },
    sellerStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    statDivider: {
        width: 1,
        height: 12,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 10,
    },
    section: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1C2B49',
        marginBottom: 12,
    },
    descriptionText: {
        fontSize: 15,
        lineHeight: 24,
        color: '#444',
    },
    detailsGrid: {
        gap: 16,
    },
    detailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    detailLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    detailValue: {
        fontSize: 14,
        color: '#1C2B49',
        fontWeight: '600',
    },
    trustSection: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
    },
    trustItems: {
        gap: 16,
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    trustIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F8F9FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    trustContent: {
        flex: 1,
    },
    trustTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1C2B49',
        marginBottom: 2,
    },
    trustDesc: {
        fontSize: 13,
        color: '#666',
    },
    bottomCTA: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    ctaContent: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        gap: 12,
    },
    contactButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    buyButton: {
        flex: 1,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
    },
    buyButtonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buyButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});