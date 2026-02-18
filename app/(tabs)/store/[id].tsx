import AuthModal from "@/app/composants/authModal";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────
type Product = {
  id: string;
  title: string;
  price: number | null;
  description?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  whatsapp_number?: string | null;
  has_promo?: boolean;
  promo_price?: number | null;
  promo_percentage?: number | null;
  promo_expiration?: string | null;
};

type PromoForm = {
  promo_price: string;
  promo_percentage: string;
  promo_expiration: Date;
  usePercentage: boolean;
};

// ─── Promo Modal ──────────────────────────────────────────────────────────────
function PromoModal({
  visible,
  onClose,
  onSave,
  product,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (form: PromoForm, productId?: string) => void;
  product: Product | null; // null = promo globale
  loading: boolean;
}) {
  const [form, setForm] = useState<PromoForm>({
    promo_price: "",
    promo_percentage: "",
    promo_expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    usePercentage: true,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible && product) {
      setForm({
        promo_price: product.promo_price?.toString() || "",
        promo_percentage: product.promo_percentage?.toString() || "",
        promo_expiration: product.promo_expiration
          ? new Date(product.promo_expiration)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        usePercentage: !!product.promo_percentage,
      });
    }
  }, [visible, product]);

  const isGlobal = product === null;
  const title = isGlobal
    ? "Promo sur tous les produits"
    : `Promo — ${product?.title}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Toggle % ou prix fixe */}
          <View style={modalStyles.toggleRow}>
            <Text style={modalStyles.label}>Mode de réduction</Text>
            <View style={modalStyles.toggleOptions}>
              <TouchableOpacity
                style={[
                  modalStyles.toggleBtn,
                  form.usePercentage && modalStyles.toggleBtnActive,
                ]}
                onPress={() => setForm((f) => ({ ...f, usePercentage: true }))}
              >
                <Text
                  style={[
                    modalStyles.toggleText,
                    form.usePercentage && modalStyles.toggleTextActive,
                  ]}
                >
                  % Pourcentage
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  modalStyles.toggleBtn,
                  !form.usePercentage && modalStyles.toggleBtnActive,
                ]}
                onPress={() => setForm((f) => ({ ...f, usePercentage: false }))}
              >
                <Text
                  style={[
                    modalStyles.toggleText,
                    !form.usePercentage && modalStyles.toggleTextActive,
                  ]}
                >
                  Prix fixe
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Input */}
          {form.usePercentage ? (
            <View style={modalStyles.inputGroup}>
              <Text style={modalStyles.label}>Réduction (%)</Text>
              <View style={modalStyles.inputRow}>
                <TextInput
                  style={modalStyles.input}
                  value={form.promo_percentage}
                  onChangeText={(v) =>
                    setForm((f) => ({ ...f, promo_percentage: v }))
                  }
                  keyboardType="numeric"
                  placeholder="ex: 20"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={modalStyles.inputSuffix}>%</Text>
              </View>
              {!isGlobal && product?.price && form.promo_percentage && (
                <Text style={modalStyles.preview}>
                  Prix après promo :{" "}
                  {Math.round(
                    product.price * (1 - Number(form.promo_percentage) / 100),
                  ).toLocaleString()}{" "}
                  FCFA
                </Text>
              )}
            </View>
          ) : (
            <View style={modalStyles.inputGroup}>
              <Text style={modalStyles.label}>Prix promo (FCFA)</Text>
              <View style={modalStyles.inputRow}>
                <TextInput
                  style={modalStyles.input}
                  value={form.promo_price}
                  onChangeText={(v) =>
                    setForm((f) => ({ ...f, promo_price: v }))
                  }
                  keyboardType="numeric"
                  placeholder="ex: 5000"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={modalStyles.inputSuffix}>FCFA</Text>
              </View>
              {!isGlobal && product?.price && form.promo_price && (
                <Text style={modalStyles.preview}>
                  Économie :{" "}
                  {(product.price - Number(form.promo_price)).toLocaleString()}{" "}
                  FCFA
                </Text>
              )}
            </View>
          )}

          {/* Date d'expiration */}
          <View style={modalStyles.inputGroup}>
            <Text style={modalStyles.label}>Expiration de la promo</Text>
            <TouchableOpacity
              style={modalStyles.dateBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={modalStyles.dateText}>
                {form.promo_expiration.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={form.promo_expiration}
                mode="date"
                minimumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (date) setForm((f) => ({ ...f, promo_expiration: date }));
                }}
              />
            )}
          </View>

          {/* Boutons */}
          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modalStyles.saveBtn}
              onPress={() => onSave(form, product?.id)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#1C2B49" />
              ) : (
                <Text style={modalStyles.saveText}>Appliquer la promo</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
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
  const [profile, setProfile] = useState<{
    display_name?: string | null;
    avatar_url?: string | null;
  } | null>(null);
  const [stats, setStats] = useState({ total: 0, totalValue: 0 });

  // Promo state
  const [promoModal, setPromoModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<
    Product | null | undefined
  >(undefined); // undefined = fermé, null = global
  const [promoLoading, setPromoLoading] = useState(false);

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
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data && mounted) setProfile(data);
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [products]);

  const canManage = user && storeId && user.id === storeId;

  // ─── Fetch ────────────────────────────────────────────────────────────────
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
        .from("product")
        .select(
          "id,title,price,description,image_url,created_at,whatsapp_number,has_promo,promo_price,promo_percentage,promo_expiration",
        )
        .eq("user_id", storeId)
        .order("created_at", { ascending: false });
      if (fetchErr) throw fetchErr;
      const prods = Array.isArray(data) ? (data as Product[]) : [];
      setProducts(prods);
      setStats({
        total: prods.length,
        totalValue: prods.reduce((s, p) => s + (p.price || 0), 0),
      });
    } catch (err: any) {
      setError(err.message || "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const confirmDelete = (productId: string, title?: string) => {
    Alert.alert("Supprimer", `Supprimer "${title || "cette annonce"}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => handleDelete(productId),
      },
    ]);
  };

  async function handleDelete(productId: string) {
    if (!canManage) return;
    const previous = products;
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    setProcessingId(productId);
    try {
      await supabase
        .from("product_images")
        .delete()
        .eq("product_id", productId);
      const { error } = await supabase
        .from("product")
        .delete()
        .eq("id", productId);
      if (error) throw error;
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
      setProducts(previous);
    } finally {
      setProcessingId(null);
    }
  }

  // ─── Promo ────────────────────────────────────────────────────────────────
  const openPromoSingle = (product: Product) => {
    setSelectedProduct(product);
    setPromoModal(true);
  };

  const openPromoGlobal = () => {
    setSelectedProduct(null);
    setPromoModal(true);
  };

  const handleRemovePromo = (productId: string) => {
    Alert.alert("Retirer la promo", "Retirer la promo de ce produit ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Retirer",
        style: "destructive",
        onPress: async () => {
          await supabase
            .from("product")
            .update({
              has_promo: false,
              promo_price: null,
              promo_percentage: null,
              promo_expiration: null,
            })
            .eq("id", productId);
          fetchProducts();
        },
      },
    ]);
  };

  const handleSavePromo = async (form: PromoForm, productId?: string) => {
    setPromoLoading(true);
    try {
      const promoData = {
        has_promo: true,
        promo_price: form.usePercentage ? null : Number(form.promo_price),
        promo_percentage: form.usePercentage
          ? Number(form.promo_percentage)
          : null,
        promo_expiration: form.promo_expiration.toISOString(),
      };

      if (productId) {
        // Promo sur un seul produit
        const { error } = await supabase
          .from("product")
          .update(promoData)
          .eq("id", productId);
        if (error) throw error;
      } else {
        // Promo globale sur tous les produits du vendeur
        const { error } = await supabase
          .from("product")
          .update(promoData)
          .eq("user_id", user!.id);
        if (error) throw error;
      }

      setPromoModal(false);
      await fetchProducts();
      Alert.alert(
        "✅ Promo appliquée !",
        productId
          ? "La promo a été ajoutée au produit."
          : "La promo a été appliquée à tous vos produits.",
      );
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setPromoLoading(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Utilisateur";
  const avatarUrl =
    profile?.avatar_url || user?.user_metadata?.avatar_url || null;
  const formattedPrice = (price?: number | null) =>
    price != null
      ? `${Number(price).toLocaleString("fr-FR")} FCFA`
      : "Prix non défini";

  const getPromoDisplay = (p: Product) => {
    if (!p.has_promo) return null;
    if (p.promo_percentage) return `-${p.promo_percentage}%`;
    if (p.promo_price) return `${p.promo_price.toLocaleString()} FCFA`;
    return null;
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.8],
    extrapolate: "clamp",
  });
  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: "clamp",
  });

  if (!user)
    return (
      <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#F8F9FB" barStyle="dark-content" />

      {/* ── Header ── */}
      <Animated.View
        style={[
          styles.header,
          { opacity: headerOpacity, transform: [{ scale: headerScale }] },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.profileSection}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>
                  {displayName.slice(0, 2).toUpperCase()}
                </Text>
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

        {/* Stats */}
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
            <Text style={styles.statValue}>
              {(stats.totalValue / 1000).toFixed(0)}k
            </Text>
            <Text style={styles.statLabel}>Valeur totale</Text>
          </View>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push("../vendre")}
          >
            <View style={[styles.statIcon, styles.addIcon]}>
              <Ionicons name="add" size={24} color="#fff" />
            </View>
            <Text style={styles.statLabel}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {/* Bouton promo globale */}
        {canManage && products.length > 0 && (
          <TouchableOpacity
            style={styles.globalPromoBtn}
            onPress={openPromoGlobal}
          >
            <Ionicons name="pricetag" size={18} color="#1C2B49" />
            <Text style={styles.globalPromoText}>
              🔥 Appliquer une promo sur tous mes produits
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ── Liste ── */}
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F6C445"
            colors={["#F6C445"]}
          />
        }
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
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
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorTitle}>Oups !</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchProducts}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bag-handle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Aucune annonce</Text>
            <Text style={styles.emptyText}>
              Commence à vendre en ajoutant ta première annonce.
            </Text>
            {canManage && (
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push("../vendre")}
              >
                <Ionicons name="add-circle" size={20} color="#1C2B49" />
                <Text style={styles.ctaText}>Créer une annonce</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mes annonces</Text>
              <Text style={styles.sectionCount}>
                {products.length} article{products.length > 1 ? "s" : ""}
              </Text>
            </View>

            {products.map((p, index) => {
              const promoDisplay = getPromoDisplay(p);
              return (
                <Animated.View
                  key={p.id}
                  style={[styles.cardWrapper, { opacity: fadeAnim }]}
                >
                  <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => router.push(`/product/${p.id}`)}
                    style={styles.card}
                  >
                    {/* Image */}
                    <View style={styles.cardImageWrapper}>
                      <Image
                        source={
                          p.image_url
                            ? { uri: p.image_url }
                            : require("@/assets/images/icon.png")
                        }
                        style={styles.cardImage}
                      />
                      {index === 0 && (
                        <View style={styles.recentBadge}>
                          <Text style={styles.recentText}>Récent</Text>
                        </View>
                      )}
                      {promoDisplay && (
                        <View style={styles.promoBadge}>
                          <Ionicons name="pricetag" size={12} color="#fff" />
                          <Text style={styles.promoBadgeText}>
                            {promoDisplay}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Content */}
                    <View style={styles.cardContent}>
                      <Text style={styles.productTitle} numberOfLines={2}>
                        {p.title}
                      </Text>

                      {/* Prix avec promo */}
                      <View style={styles.priceRow}>
                        <Text style={styles.productPrice}>
                          {formattedPrice(p.price)}
                        </Text>
                        {p.has_promo && p.promo_price && (
                          <Text style={styles.promoPrice}>
                            {formattedPrice(p.promo_price)}
                          </Text>
                        )}
                        {p.has_promo && p.promo_percentage && (
                          <Text style={styles.promoPrice}>
                            {Math.round(
                              (p.price || 0) * (1 - p.promo_percentage / 100),
                            ).toLocaleString()}{" "}
                            FCFA
                          </Text>
                        )}
                      </View>

                      {/* Expiration promo */}
                      {p.has_promo && p.promo_expiration && (
                        <Text style={styles.promoExpiry}>
                          ⏳ Expire le{" "}
                          {new Date(p.promo_expiration).toLocaleDateString(
                            "fr-FR",
                          )}
                        </Text>
                      )}

                      <View style={styles.metaItem}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color="#9CA3AF"
                        />
                        <Text style={styles.metaText}>
                          {p.created_at
                            ? new Date(p.created_at).toLocaleDateString(
                                "fr-FR",
                                { day: "numeric", month: "short" },
                              )
                            : "—"}
                        </Text>
                      </View>

                      {/* Actions */}
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/edit/${p.id}`);
                          }}
                          disabled={!canManage}
                        >
                          <Ionicons
                            name="create-outline"
                            size={16}
                            color="#1C2B49"
                          />
                          <Text style={styles.editText}>Modifier</Text>
                        </TouchableOpacity>

                        {/* Bouton promo individuelle */}
                        {canManage && (
                          <TouchableOpacity
                            style={[
                              styles.promoButton,
                              p.has_promo && styles.promoButtonActive,
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              p.has_promo
                                ? handleRemovePromo(p.id)
                                : openPromoSingle(p);
                            }}
                          >
                            <Ionicons
                              name="pricetag-outline"
                              size={16}
                              color={p.has_promo ? "#fff" : "#F6C445"}
                            />
                            <Text
                              style={[
                                styles.promoButtonText,
                                p.has_promo && styles.promoButtonTextActive,
                              ]}
                            >
                              {p.has_promo ? "Retirer" : "Promo"}
                            </Text>
                          </TouchableOpacity>
                        )}

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
                              <Ionicons
                                name="trash-outline"
                                size={16}
                                color="#fff"
                              />
                              <Text style={styles.deleteText}>Supprimer</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}

            <View style={styles.footer}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.footerText}>
                Toutes les annonces chargées
              </Text>
            </View>
          </Animated.View>
        )}
      </Animated.ScrollView>

      {/* FAB */}
      {canManage && products.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("../vendre")}
        >
          <Ionicons name="add" size={28} color="#1C2B49" />
        </TouchableOpacity>
      )}

      {/* Promo Modal */}
      <PromoModal
        visible={promoModal}
        onClose={() => setPromoModal(false)}
        onSave={handleSavePromo}
        product={selectedProduct ?? null}
        loading={promoLoading}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FB" },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 5,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  profileSection: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#F6C445",
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#F6C445",
  },
  avatarInitials: { color: "#1C2B49", fontWeight: "800", fontSize: 18 },
  profileInfo: { marginLeft: 12 },
  greeting: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  userName: { fontSize: 20, fontWeight: "800", color: "#1F2937", marginTop: 2 },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  statsContainer: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#F8F9FB",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statCardHighlight: { backgroundColor: "#D1FAE5" },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  addIcon: { backgroundColor: "#F6C445" },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 2,
  },
  statLabel: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  globalPromoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF3C7",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#F6C445",
  },
  globalPromoText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1C2B49",
    flex: 1,
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },
  loadingContainer: { alignItems: "center", paddingVertical: 80 },
  loaderCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loadingText: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  errorContainer: { alignItems: "center", paddingVertical: 60, gap: 12 },
  errorTitle: { fontSize: 22, fontWeight: "800", color: "#1F2937" },
  errorText: {
    color: "#6B7280",
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryBtn: {
    backgroundColor: "#F6C445",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryText: { color: "#1C2B49", fontWeight: "700", fontSize: 15 },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyTitle: { fontSize: 24, fontWeight: "800", color: "#1F2937" },
  emptyText: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F6C445",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 6,
  },
  ctaText: { color: "#1C2B49", fontWeight: "800", fontSize: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: "800", color: "#1F2937" },
  sectionCount: { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  cardWrapper: { marginBottom: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
  },
  cardImageWrapper: { position: "relative", width: "100%", height: 200 },
  cardImage: { width: "100%", height: "100%", backgroundColor: "#F3F4F6" },
  recentBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  recentText: { color: "#FFF", fontSize: 11, fontWeight: "700" },
  promoBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  promoBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  cardContent: { padding: 16 },
  productTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
    lineHeight: 24,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#F6C445",
    textDecorationLine: "line-through",
  },
  promoPrice: { fontSize: 20, fontWeight: "800", color: "#EF4444" },
  promoExpiry: { fontSize: 12, color: "#9CA3AF", marginBottom: 8 },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  metaText: { fontSize: 13, color: "#9CA3AF", fontWeight: "500" },
  cardActions: { flexDirection: "row", gap: 8 },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    borderRadius: 12,
  },
  editText: { color: "#1C2B49", fontWeight: "700", fontSize: 13 },
  promoButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F6C445",
  },
  promoButtonActive: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
  promoButtonText: { color: "#F6C445", fontWeight: "700", fontSize: 13 },
  promoButtonTextActive: { color: "#fff" },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EF4444",
    paddingVertical: 10,
    borderRadius: 12,
  },
  deleteText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
  },
  footerText: { fontSize: 14, color: "#10B981", fontWeight: "600" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 80,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F6C445",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1F2937",
    flex: 1,
    marginRight: 12,
  },
  label: { fontSize: 14, fontWeight: "600", color: "#6B7280", marginBottom: 8 },
  toggleRow: { marginBottom: 20 },
  toggleOptions: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#F6C445",
  },
  toggleText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  toggleTextActive: { color: "#1C2B49" },
  inputGroup: { marginBottom: 20 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: "#1F2937" },
  inputSuffix: { fontSize: 14, fontWeight: "700", color: "#6B7280" },
  preview: { fontSize: 13, color: "#10B981", fontWeight: "600", marginTop: 8 },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F3F4F6",
    padding: 14,
    borderRadius: 12,
  },
  dateText: { fontSize: 15, color: "#1F2937", fontWeight: "600" },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#6B7280" },
  saveBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#F6C445",
    alignItems: "center",
  },
  saveText: { fontSize: 15, fontWeight: "800", color: "#1C2B49" },
});
