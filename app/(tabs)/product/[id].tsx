import AuthModal from "@/app/composants/authModal";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Carousel from "react-native-reanimated-carousel";

// ─── Constants ───────────────────────────────────────────────────────────────
const { width } = Dimensions.get("window");
const HEADER_MAX_HEIGHT = 420;
const HEADER_MIN_HEIGHT = Platform.OS === "ios" ? 88 : 64;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const CATEGORY_EMOJIS: Record<string, string> = {
  vetement: "👗",
  electronique: "📱",
  artisanat: "🎨",
  soins_et_astuces: "💄",
  maquillage: "💋",
  accessoire: "👜",
  chaussure: "👠",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type PriceType = "unit" | "wholesale";

interface Seller {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  zone: string;
  image_url: string;
  images: string[];
  created_at: string;
  user_id: string;
  whatsapp_number?: string;
  has_wholesale?: boolean;
  wholesale_price?: number;
  min_wholesale_qty?: number;
  seller: Seller;
  isNew: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const [selectedPriceType, setSelectedPriceType] = useState<PriceType>("unit");
  const [contactLoading, setContactLoading] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  useEffect(() => {
    const pulse = Animated.loop(
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
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // ─── Data Fetching ────────────────────────────────────────────────────────
  async function fetchProduct() {
    try {
      setLoading(true);

      const { data: productData, error } = await supabase
        .from("product")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const [{ data: imagesData }, { data: sellerData }] = await Promise.all([
        supabase
          .from("product_images")
          .select("image_url")
          .eq("product_id", id),
        supabase
          .from("profiles")
          .select("id, username, avatar_url, bio")
          .eq("id", productData.user_id)
          .single(),
      ]);

      const isNew =
        Date.now() - new Date(productData.created_at).getTime() <
        7 * 24 * 60 * 60 * 1000;

      setProduct({
        ...productData,
        images: [
          productData.image_url,
          ...(imagesData?.map((i: any) => i.image_url) ?? []),
        ].filter(Boolean),
        seller: sellerData,
        isNew,
      });

      if (productData.has_wholesale) setSelectedPriceType("wholesale");
    } catch {
      Alert.alert("Erreur", "Impossible de charger ce produit");
    } finally {
      setLoading(false);
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleWhatsApp = () => {
    if (!product?.whatsapp_number) {
      Alert.alert(
        "Indisponible",
        "Le vendeur n'a pas fourni de numéro WhatsApp",
      );
      return;
    }
    const priceInfo =
      selectedPriceType === "wholesale" && product.has_wholesale
        ? `Prix de gros: ${product.wholesale_price?.toLocaleString()} FCFA (min. ${product.min_wholesale_qty} unités)`
        : `Prix: ${product.price.toLocaleString()} FCFA`;

    const message = `Bonjour, je suis intéressé(e) par votre article "${product.title}". ${priceInfo}`;
    const url = `whatsapp://send?phone=${product.whatsapp_number}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) Linking.openURL(url);
      else
        Alert.alert("Erreur", "WhatsApp n'est pas installé sur cet appareil");
    });
  };

  const handleContact = async () => {
    if (!user) {
      setAuthVisible(true);
      return;
    }
    if (!product) return;

    if (user.id === product.seller.id) {
      Alert.alert("Info", "C'est votre propre article !");
      return;
    }

    try {
      setContactLoading(true);

      // Cherche conversation où tu es participant_1
      const { data: conv1 } = await supabase
        .from("conversations")
        .select("id")
        .eq("participant_1", user.id)
        .eq("participant_2", product.user_id)
        .maybeSingle();

      if (conv1) {
        router.push(`/messages/${conv1.id}`);
        return;
      }

      // Cherche conversation où tu es participant_2
      const { data: conv2 } = await supabase
        .from("conversations")
        .select("id")
        .eq("participant_1", product.user_id)
        .eq("participant_2", user.id)
        .maybeSingle();

      if (conv2) {
        router.push(`/messages/${conv2.id}`);
        return;
      }

      // Crée une nouvelle conversation
      const { data: newConv, error } = await supabase
        .from("conversations")
        .insert({
          participant_1: user.id,
          participant_2: product.user_id,
          listing_id: product.id,
        })
        .select()
        .single();

      if (error) {
        console.error("Erreur création conversation:", error);
        throw error;
      }

      router.push(`/messages/${newConv.id}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Impossible de démarrer la conversation");
    } finally {
      setContactLoading(false);
    }
  };
  const calculateSavings = () => {
    if (
      !product?.has_wholesale ||
      !product.wholesale_price ||
      !product.min_wholesale_qty
    )
      return 0;
    return (
      (product.price - product.wholesale_price) * product.min_wholesale_qty
    );
  };

  // ─── Animated Values ──────────────────────────────────────────────────────
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: "clamp",
  });
  const imageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });
  const imageScale = scrollY.interpolate({
    inputRange: [-HEADER_MAX_HEIGHT, 0],
    outputRange: [2, 1],
    extrapolate: "clamp",
  });

  // ─── Loading State ────────────────────────────────────────────────────────
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Fixed Header (visible on scroll) */}
      <Animated.View style={[styles.fixedHeader, { opacity: headerOpacity }]}>
        <BlurView intensity={95} style={StyleSheet.absoluteFill} tint="light">
          <View style={styles.fixedHeaderContent}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#1C2B49" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {product.title}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </BlurView>
      </Animated.View>

      {/* Scrollable Content */}
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Carousel */}
        <Animated.View
          style={[
            styles.imageCarouselContainer,
            {
              transform: [
                { translateY: headerTranslateY },
                { scale: imageScale },
              ],
              opacity: imageOpacity,
            },
          ]}
        >
          <Carousel
            width={width}
            height={HEADER_MAX_HEIGHT}
            data={product.images}
            renderItem={({ item }: { item: string }) => (
              <View style={styles.imageSlide}>
                <Image
                  source={{ uri: item }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              </View>
            )}
            onSnapToItem={setActiveSlide}
            scrollAnimationDuration={400}
            panGestureHandlerProps={{ activeOffsetX: [-10, 10] }}
          />

          {/* Top gradient overlay */}
          <LinearGradient
            colors={["rgba(0,0,0,0.5)", "transparent"]}
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
            <TouchableOpacity
              style={[
                styles.floatingButton,
                isFavorite && styles.favoriteActive,
              ]}
              onPress={() => setIsFavorite(!isFavorite)}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={24}
                color={isFavorite ? "#FF3B30" : "#fff"}
              />
            </TouchableOpacity>
          </View>

          {/* Image counter */}
          <View style={styles.imageCounter}>
            <Ionicons name="images" size={14} color="#fff" />
            <Text style={styles.imageCounterText}>
              {activeSlide + 1}/{product.images.length}
            </Text>
          </View>

          {/* New badge */}
          {product.isNew && (
            <View style={styles.newBadge}>
              <LinearGradient
                colors={["#F6C445", "#F0A500"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.newBadgeGradient}
              >
                <Ionicons name="sparkles" size={14} color="#1C2B49" />
                <Text style={styles.newBadgeText}>Nouveau</Text>
              </LinearGradient>
            </View>
          )}

          {/* Pagination dots */}
          <View style={styles.paginationDots}>
            {product.images.map((_: any, index: number) => (
              <View
                key={index}
                style={[styles.dot, index === activeSlide && styles.dotActive]}
              />
            ))}
          </View>
        </Animated.View>

        {/* Main Content Card */}
        <View style={styles.contentCard}>
          {/* ── Title & Price Section ── */}
          <View style={styles.heroSection}>
            <Text style={styles.title}>{product.title}</Text>

            {/* Meta badges */}
            <View style={styles.metaRow}>
              {product.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryEmoji}>
                    {CATEGORY_EMOJIS[product.category] ?? "📦"}
                  </Text>
                  <Text style={styles.categoryText}>{product.category}</Text>
                </View>
              )}
              <View style={styles.timeBadge}>
                <Ionicons name="time-outline" size={12} color="#6B7280" />
                <Text style={styles.timeText}>
                  {new Date(product.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </View>
            </View>

            {/* Price display */}
            {product.has_wholesale ? (
              <View style={styles.priceOptionsContainer}>
                {/* Toggle unit / gros */}
                <View style={styles.priceTypeSelector}>
                  {(["unit", "wholesale"] as PriceType[]).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.priceTypeButton,
                        selectedPriceType === type &&
                          styles.priceTypeButtonActive,
                      ]}
                      onPress={() => setSelectedPriceType(type)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={type === "unit" ? "pricetag" : "basket"}
                        size={18}
                        color={
                          selectedPriceType === type
                            ? type === "unit"
                              ? "#F6C445"
                              : "#10B981"
                            : "#6B7280"
                        }
                      />
                      <Text
                        style={[
                          styles.priceTypeText,
                          selectedPriceType === type &&
                            styles.priceTypeTextActive,
                        ]}
                      >
                        {type === "unit" ? "Prix unitaire" : "Prix de gros"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedPriceType === "unit" ? (
                  <View style={styles.priceCard}>
                    <Text style={styles.priceLabel}>Prix par unité</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceAmount}>
                        {product.price.toLocaleString()}
                      </Text>
                      <Text style={styles.priceCurrency}>FCFA</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.priceCard, styles.wholesalePriceCard]}>
                    <View style={styles.wholesalePriceHeader}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceAmount}>
                          {product.wholesale_price?.toLocaleString()}
                        </Text>
                        <Text style={styles.priceCurrency}>FCFA</Text>
                      </View>
                      <View style={styles.minQtyBadge}>
                        <Text style={styles.minQtyText}>
                          Min. {product.min_wholesale_qty} unités
                        </Text>
                      </View>
                    </View>
                    <View style={styles.savingsContainer}>
                      <Ionicons
                        name="trending-down"
                        size={16}
                        color="#10B981"
                      />
                      <Text style={styles.savingsText}>
                        Économisez {calculateSavings().toLocaleString()} FCFA
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Prix</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceAmount}>
                    {product.price.toLocaleString()}
                  </Text>
                  <Text style={styles.priceCurrency}>FCFA</Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Seller Card ── */}
          <TouchableOpacity
            style={styles.sellerCard}
            onPress={() => router.push(`/profile/${product.seller.id}`)}
            activeOpacity={0.9}
          >
            <Image
              source={{
                uri:
                  product.seller.avatar_url ??
                  "https://placehold.co/60x60/F3F4F6/888?text=U",
              }}
              style={styles.sellerAvatar}
            />
            <View style={styles.onlineBadge} />
            <View style={styles.sellerInfo}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName}>
                  @{product.seller.username}
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="#10B981"
                  style={{ marginLeft: 6 }}
                />
              </View>
              {product.seller.bio && (
                <Text style={styles.sellerBio} numberOfLines={1}>
                  {product.seller.bio}
                </Text>
              )}
              <View style={styles.sellerStats}>
                <Ionicons name="star" size={14} color="#F6C445" />
                <Text style={styles.sellerStatText}>4.9 · Répond en 1h</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#D1D5DB" />
          </TouchableOpacity>

          {/* ── Description ── */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text
                style={styles.descriptionText}
                numberOfLines={showFullDescription ? undefined : 4}
              >
                {product.description}
              </Text>
              {product.description.length > 150 && (
                <TouchableOpacity
                  onPress={() => setShowFullDescription(!showFullDescription)}
                  style={styles.showMoreButton}
                >
                  <Text style={styles.showMoreText}>
                    {showFullDescription ? "Voir moins" : "Voir plus"}
                  </Text>
                  <Ionicons
                    name={showFullDescription ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#F6C445"
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Details ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails</Text>
            {[
              product.category && {
                icon: "pricetag",
                label: "Catégorie",
                value: product.category,
              },
              product.zone && {
                icon: "location",
                label: "Localisation",
                value: product.zone,
              },
              { icon: "shield-checkmark", label: "État", value: "Comme neuf" },
            ]
              .filter(Boolean)
              .map((detail: any, i) => (
                <View key={i} style={styles.detailItem}>
                  <View style={styles.detailIcon}>
                    <Ionicons name={detail.icon} size={18} color="#6B7280" />
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>{detail.label}</Text>
                    <Text style={styles.detailValue}>{detail.value}</Text>
                  </View>
                </View>
              ))}
          </View>

          {/* ── Trust badges ── */}
          <View style={styles.trustSection}>
            <Text style={styles.sectionTitle}>Acheter en toute sécurité</Text>
            {[
              {
                bg: "#D1FAE5",
                icon: "shield-checkmark",
                color: "#10B981",
                title: "Paiement sécurisé",
                desc: "Transaction protégée",
              },
              {
                bg: "#DBEAFE",
                icon: "cube",
                color: "#3B82F6",
                title: "Livraison flexible",
                desc: "Remise en main propre ou livraison",
              },
              {
                bg: "#FEF3C7",
                icon: "ribbon",
                color: "#F59E0B",
                title: "Vendeur vérifié",
                desc: "Profil authentifié par notre équipe",
              },
            ].map((item, i) => (
              <View key={i} style={styles.trustItem}>
                <View
                  style={[
                    styles.trustIconContainer,
                    { backgroundColor: item.bg },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={24}
                    color={item.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trustTitle}>{item.title}</Text>
                  <Text style={styles.trustDescription}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 140 }} />
        </View>
      </Animated.ScrollView>

      {/* ── Bottom CTA ── */}
      <View style={styles.bottomCTA}>
        <BlurView intensity={95} style={StyleSheet.absoluteFill} tint="light" />
        <View style={styles.ctaContent}>
          {/* Chat button */}
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleContact}
            activeOpacity={0.85}
            disabled={contactLoading}
          >
            {contactLoading ? (
              <ActivityIndicator size="small" color="#6C63FF" />
            ) : (
              <Ionicons name="chatbubble-ellipses" size={24} color="#6C63FF" />
            )}
          </TouchableOpacity>

          {/* contact chat / Buy button */}
          <Animated.View
            style={[
              styles.buyButtonWrapper,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <TouchableOpacity
              style={styles.buyButton}
              onPress={handleContact}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#03010aff", "#d6a213ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buyButtonGradient}
              >
                <Ionicons
                  name="chatbubble-ellipses"
                  size={20}
                  color="#6C63FF"
                />
                <Text style={styles.buyButtonText}>Contacter</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {!user && (
        <AuthModal
          visible={authVisible}
          onClose={() => setAuthVisible(false)}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Layout
  container: { flex: 1, backgroundColor: "#F8F9FB" },
  scrollView: { flex: 1 },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FB",
  },
  loaderCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFBEB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loadingText: { fontSize: 16, fontWeight: "600", color: "#1F2937" },

  // Fixed header
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MIN_HEIGHT,
    zIndex: 1000,
  },
  fixedHeaderContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : StatusBar.currentHeight || 10,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: "#1C2B49",
    textAlign: "center",
    marginHorizontal: 12,
  },

  // Carousel
  imageCarouselContainer: {
    height: HEADER_MAX_HEIGHT,
    backgroundColor: "#E5E7EB",
  },
  imageSlide: { width, height: HEADER_MAX_HEIGHT },
  productImage: { width: "100%", height: "100%" },
  topGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 140 },
  floatingActions: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  favoriteActive: { backgroundColor: "rgba(255,255,255,0.98)" },
  imageCounter: {
    position: "absolute",
    bottom: 70,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imageCounterText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  newBadge: {
    position: "absolute",
    top: Platform.OS === "ios" ? 120 : 100,
    left: 16,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 6,
  },
  newBadgeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  newBadgeText: { color: "#1C2B49", fontSize: 13, fontWeight: "800" },
  paginationDots: {
    position: "absolute",
    bottom: 38,
    flexDirection: "row",
    alignSelf: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: { backgroundColor: "#F6C445", width: 24 },

  // Content
  contentCard: {
    flex: 1,
    backgroundColor: "#F8F9FB",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -32,
    paddingTop: 24,
  },

  // Hero section
  heroSection: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 12,
    lineHeight: 32,
  },
  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  categoryEmoji: { fontSize: 14 },
  categoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
    textTransform: "capitalize",
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  timeText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },

  // Price
  priceOptionsContainer: { backgroundColor: "#F8F9FB", borderRadius: 16 },
  priceTypeSelector: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  priceTypeButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 9,
    gap: 8,
  },
  priceTypeButtonActive: { backgroundColor: "#FFF", elevation: 2 },
  priceTypeText: { fontSize: 13, fontWeight: "700", color: "#4B5563" },
  priceTypeTextActive: { color: "#1F2937" },
  priceCard: { padding: 16, borderRadius: 16 },
  priceLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 6,
  },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  priceAmount: { fontSize: 32, fontWeight: "800", color: "#1F2937" },
  priceCurrency: { fontSize: 18, fontWeight: "700", color: "#6B7280" },
  wholesalePriceCard: {
    backgroundColor: "#F0FFF4",
    borderWidth: 1,
    borderColor: "#9AE6B4",
  },
  wholesalePriceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  minQtyBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  minQtyText: { color: "#FFF", fontSize: 11, fontWeight: "bold" },
  savingsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(16,185,129,0.2)",
  },
  savingsText: { color: "#065F46", fontSize: 14, fontWeight: "700" },

  // Seller card
  sellerCard: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
  },
  sellerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#F6C445",
  },
  onlineBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    position: "absolute",
    bottom: 18,
    left: 60,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  sellerInfo: { flex: 1, marginLeft: 16 },
  sellerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sellerName: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  sellerBio: { fontSize: 13, color: "#6B7280", marginBottom: 4 },
  sellerStats: { flexDirection: "row", alignItems: "center", gap: 4 },
  sellerStatText: { fontSize: 12, color: "#4B5563", fontWeight: "600" },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  descriptionText: { fontSize: 15, color: "#4B5563", lineHeight: 24 },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    alignSelf: "flex-start",
  },
  showMoreText: {
    color: "#D97706",
    fontWeight: "bold",
    fontSize: 14,
    marginRight: 4,
  },
  detailItem: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailLabel: { fontSize: 13, color: "#6B7280" },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    textTransform: "capitalize",
  },

  // Trust
  trustSection: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 16,
  },
  trustIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  trustTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  trustDescription: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  // Bottom CTA
  bottomCTA: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    marginBottom: 80,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    gap: 12,
  },
  chatButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#6C63FF",
  },
  buyButtonWrapper: { flex: 1 },
  buyButton: { elevation: 8 },
  buyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
    borderRadius: 28,
  },
  buyButtonText: { fontSize: 16, fontWeight: "bold", color: "#fff" },
});
