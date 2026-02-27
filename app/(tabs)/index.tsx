import { useAuth } from "@/context/authContext";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabaseClient";
import ProductCard from "../composants/productCard";

interface Product {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  image?: string;
  image_url?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  product_like?: { count: number }[];
  distance?: number;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

const PRICE_RANGES = [
  { id: "all", label: "Tous", min: 0, max: Infinity },
  { id: "low", label: "< 10k", min: 0, max: 10000 },
  { id: "medium", label: "10k - 50k", min: 10000, max: 50000 },
  { id: "high", label: "50k - 100k", min: 50000, max: 100000 },
  { id: "premium", label: "> 100k", min: 100000, max: Infinity },
];

const DISTANCE_RANGES = [
  { id: "all", label: "Partout", max: Infinity },
  { id: "nearby", label: "< 5 km", max: 5 },
  { id: "local", label: "< 10 km", max: 10 },
  { id: "area", label: "< 25 km", max: 25 },
  { id: "far", label: "< 50 km", max: 50 },
];

const CATEGORIES = [
  { id: "all", name: "Tout", icon: "🗂" },
  { id: "vetement", name: "Vêtements", icon: "👗" },
  { id: "soins_et_astuces", name: "Soins & Astuces", icon: "💄" },
  { id: "maquillage", name: "Maquillage", icon: "💋" },
  { id: "artisanat", name: "Artisanat", icon: "🎨" },
  { id: "electronique", name: "Électronique", icon: "📱" },
  { id: "accessoire", name: "Accessoires", icon: "👜" },
  { id: "chaussure", name: "Chaussures", icon: "👠" },
];

const ITEMS_PER_PAGE = 10;

// Calcul de la distance entre deux points (formule de Haversine)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [selectedDistance, setSelectedDistance] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationPermission, setLocationPermission] = useState<
    "granted" | "denied" | "pending"
  >("pending");
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const { user } = useAuth();

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchProducts();
    }
  }, [userLocation]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        setLocationPermission("granted");
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        setLocationPermission("denied");
        // Charger les produits sans géolocalisation
        fetchProducts();
      }
    } catch (error) {
      console.error("Erreur localisation:", error);
      setLocationPermission("denied");
      fetchProducts();
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
  }, [user]);

  async function fetchUnreadCount() {
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .or(`participant_1.eq.${user!.id},participant_2.eq.${user!.id}`);

    if (!convs || convs.length === 0) return;

    const convIds = convs.map((c) => c.id);

    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .eq("is_read", false)
      .neq("sender_id", user!.id);

    setUnreadCount(count || 0);
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("product")
        .select(
          `
          *,
          product_like(count)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculer la distance pour chaque produit
      const productsWithDistance = (data || []).map((product) => {
        if (userLocation && product.latitude && product.longitude) {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            product.latitude,
            product.longitude,
          );
          return { ...product, distance };
        }
        return { ...product, distance: Infinity };
      });

      // Trier par distance si géolocalisation disponible
      if (userLocation) {
        productsWithDistance.sort(
          (a, b) => (a.distance || Infinity) - (b.distance || Infinity),
        );
      }

      setProducts(productsWithDistance);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setVisibleCount(ITEMS_PER_PAGE);
    fetchProducts();
  };

  const filteredProducts = products.filter((product) => {
    const q = searchQuery?.trim().toLowerCase() || "";
    const matchesSearch =
      !q ||
      (product.name && product.name.toLowerCase().includes(q)) ||
      (product.title && product.title.toLowerCase().includes(q)) ||
      (product.description && product.description.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;

    const priceRange = PRICE_RANGES.find((r) => r.id === selectedPriceRange);
    const price = typeof product.price === "number" ? product.price : NaN;
    const matchesPrice =
      !priceRange ||
      (Number.isFinite(price) &&
        price >= priceRange.min &&
        price <= priceRange.max) ||
      priceRange.id === "all";

    const distanceRange = DISTANCE_RANGES.find(
      (r) => r.id === selectedDistance,
    );
    const matchesDistance =
      selectedDistance === "all" ||
      (product.distance !== undefined &&
        product.distance <= (distanceRange?.max || Infinity));

    return matchesSearch && matchesCategory && matchesPrice && matchesDistance;
  });

  const displayedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedPriceRange("all");
    setSelectedDistance("all");
    setShowFilters(false);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const loadMore = () => {
    setVisibleCount((prev) =>
      Math.min(prev + ITEMS_PER_PAGE, filteredProducts.length),
    );
  };

  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedPriceRange !== "all" ||
    selectedDistance !== "all" ||
    !!searchQuery;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.95],
    extrapolate: "clamp",
  });

  const retryLocation = () => {
    setLocationPermission("pending");
    setLoading(true);
    requestLocationPermission();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loaderCircle}>
          <ActivityIndicator size="large" color="#F6C445" />
        </View>
        <Text style={styles.loadingText}>
          {locationPermission === "pending"
            ? "Localisation en cours..."
            : "Chargement..."}
        </Text>
      </View>
    );
  }

  const renderHeader = () => (
    <>
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>
              <Text style={styles.logoSangse}>Sangse</Text>
              <Text style={styles.logoShop}>Shop</Text>
            </Text>
            <View style={styles.logoDot} />
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={retryLocation}
            >
              <Ionicons
                name={
                  locationPermission === "granted"
                    ? "location"
                    : "location-outline"
                }
                size={20}
                color={locationPermission === "granted" ? "#10B981" : "#EF4444"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.push("/messages")}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#1F2937"
              />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {locationPermission === "granted" && userLocation && (
          <View style={styles.locationBanner}>
            <Ionicons name="navigate" size={16} color="#10B981" />
            <Text style={styles.locationText}>
              Produits recommandés près de vous
            </Text>
          </View>
        )}

        {locationPermission === "denied" && (
          <TouchableOpacity
            style={styles.locationDeniedBanner}
            onPress={retryLocation}
          >
            <Ionicons name="location-outline" size={16} color="#EF4444" />
            <Text style={styles.locationDeniedText}>
              Activer la localisation pour voir les produits à proximité
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#EF4444" />
          </TouchableOpacity>
        )}

        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.filterButton,
              hasActiveFilters && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options" size={22} color="#1F2937" />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        <Text style={styles.productCount}>
          {filteredProducts.length} article
          {filteredProducts.length > 1 ? "s" : ""}
        </Text>
      </Animated.View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          {locationPermission === "granted" && (
            <View style={styles.filterSection}>
              <Text style={styles.filterTitle}>📍 Distance</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {DISTANCE_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range.id}
                    style={[
                      styles.filterChip,
                      selectedDistance === range.id && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedDistance(range.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedDistance === range.id &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Catégories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.filterChip,
                    selectedCategory === category.id && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={styles.categoryEmoji}>{category.icon}</Text>
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategory === category.id &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterTitle}>Prix</Text>
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
                      selectedPriceRange === range.id &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Ionicons name="close-circle" size={16} color="#EF4444" />
              <Text style={styles.clearButtonText}>Effacer les filtres</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );

  const formatDistance = (distance?: number) => {
    if (distance === undefined || distance === Infinity) return null;
    if (distance < 1) return `${Math.round(distance * 1000)}m`;
    return `${distance.toFixed(1)}km`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Animated.FlatList
        data={displayedProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.productWrapper}>
            {index < 3 &&
              !hasActiveFilters &&
              locationPermission === "granted" && (
                <View style={styles.topBadge}>
                  <Ionicons name="star" size={10} color="#FFF" />
                </View>
              )}
            {item.distance !== undefined && item.distance !== Infinity && (
              <View style={styles.distanceBadge}>
                <Ionicons name="location" size={10} color="#10B981" />
                <Text style={styles.distanceText}>
                  {formatDistance(item.distance)}
                </Text>
              </View>
            )}
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          </View>
        )}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCircle}>
              <Ionicons name="search" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Aucun résultat</Text>
            <Text style={styles.emptyText}>
              {hasActiveFilters
                ? "Essayez de modifier vos filtres"
                : "Aucun produit disponible pour le moment"}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={clearFilters}
              >
                <Text style={styles.emptyButtonText}>
                  Réinitialiser les filtres
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}
              >
                <Text style={styles.loadMoreText}>Voir plus</Text>
                <Ionicons name="chevron-down" size={20} color="#1C2B49" />
              </TouchableOpacity>
              <Text style={styles.loadMoreInfo}>
                {displayedProducts.length} sur {filteredProducts.length}
              </Text>
            </View>
          ) : displayedProducts.length > 0 ? (
            <View style={styles.endContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.endText}>Tous les produits affichés</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#F6C445"]}
            tintColor="#F6C445"
          />
        }
        columnWrapperStyle={styles.row}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
          },
        )}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FB",
  },
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
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  listContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logoContainer: {
    position: "relative",
  },
  logo: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -1,
  },
  logoSangse: {
    color: "#1F2937",
  },
  logoShop: {
    color: "#F6C445",
  },
  logoDot: {
    position: "absolute",
    right: -8,
    top: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  locationButton: {
    padding: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  iconButton: {
    padding: 4,
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#EF4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  notificationText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  locationText: {
    fontSize: 13,
    color: "#065F46",
    fontWeight: "600",
    flex: 1,
  },
  locationDeniedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  locationDeniedText: {
    fontSize: 12,
    color: "#991B1B",
    fontWeight: "600",
    flex: 1,
  },
  searchWrapper: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#F6C445",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#FFD700",
  },
  filterDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  productCount: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  filtersPanel: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  filterSection: {
    marginBottom: 14,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: "#F6C445",
  },
  filterChipText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#1C2B49",
    fontWeight: "700",
  },
  categoryEmoji: {
    fontSize: 16,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 14,
    gap: 6,
    marginTop: 4,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  productWrapper: {
    width: "48%",
    position: "relative",
  },
  topBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F6C445",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  distanceBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: "#F6C445",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1C2B49",
  },
  loadMoreContainer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6C445",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C2B49",
  },
  loadMoreInfo: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 12,
    fontWeight: "500",
  },
  endContainer: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 8,
  },
  endText: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
  },
});
