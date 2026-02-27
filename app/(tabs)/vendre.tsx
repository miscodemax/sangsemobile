import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AuthModal from "../composants/authModal";
import CameraModal from "../composants/cameramodal";

// ─── Catégories ───────────────────────────────────────────────────────────────
const categories = [
  { value: "vetement", label: "Vêtements", icon: "👗", color: "#ec4899" },
  {
    value: "soins_et_astuces",
    label: "Soins & Astuces",
    icon: "💄",
    color: "#f97316",
  },
  { value: "maquillage", label: "Maquillage", icon: "💋", color: "#ef4444" },
  { value: "artisanat", label: "Artisanat", icon: "🎨", color: "#8b5cf6" },
  {
    value: "electronique",
    label: "Électronique",
    icon: "📱",
    color: "#3b82f6",
  },
  { value: "accessoire", label: "Accessoires", icon: "👜", color: "#14b8a6" },
  { value: "chaussure", label: "Chaussures", icon: "👠", color: "#f59e0b" },
];

// ─── Zones de Dakar avec coordonnées réelles ──────────────────────────────────
const DAKAR_ZONES = [
  { name: "Plateau", latitude: 14.6937, longitude: -17.4441 },
  { name: "Médina", latitude: 14.6892, longitude: -17.447 },
  { name: "Grand Dakar", latitude: 14.707, longitude: -17.4431 },
  { name: "Fann", latitude: 14.6923, longitude: -17.4634 },
  { name: "Point E", latitude: 14.6954, longitude: -17.4598 },
  { name: "Mermoz", latitude: 14.7195, longitude: -17.4782 },
  { name: "Sacré-Cœur", latitude: 14.723, longitude: -17.4701 },
  { name: "Almadies", latitude: 14.7453, longitude: -17.5197 },
  { name: "Ngor", latitude: 14.7486, longitude: -17.5134 },
  { name: "Yoff", latitude: 14.753, longitude: -17.4942 },
  { name: "Parcelles Assainies", latitude: 14.7648, longitude: -17.4543 },
  { name: "Guédiawaye", latitude: 14.7742, longitude: -17.4045 },
  { name: "Pikine", latitude: 14.755, longitude: -17.3906 },
  { name: "Thiaroye", latitude: 14.739, longitude: -17.368 },
  { name: "Rufisque", latitude: 14.7155, longitude: -17.2738 },
  { name: "Bargny", latitude: 14.6969, longitude: -17.2303 },
  { name: "Diamniadio", latitude: 14.72, longitude: -17.18 },
  { name: "Sébikotane", latitude: 14.7424, longitude: -17.135 },
  { name: "Mbao", latitude: 14.738, longitude: -17.328 },
  { name: "Keur Massar", latitude: 14.778, longitude: -17.342 },
  { name: "Malika", latitude: 14.79, longitude: -17.365 },
  { name: "Tivaouane Peulh", latitude: 14.805, longitude: -17.38 },
  { name: "Ouakam", latitude: 14.732, longitude: -17.498 },
  { name: "Liberté", latitude: 14.71, longitude: -17.46 },
  { name: "HLM", latitude: 14.705, longitude: -17.452 },
  { name: "Castors", latitude: 14.718, longitude: -17.465 },
];

// ─── Barre de progression ─────────────────────────────────────────────────────
const ProgressBar = ({ progress }: { progress: number }) => {
  const animatedWidth = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: progress,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  }, [progress]);

  const width = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>Progression</Text>
        <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
      </View>
      <View style={styles.progressBarBg}>
        <Animated.View style={[styles.progressBarFill, { width }]} />
      </View>
    </View>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────
const ModernHeader = ({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string | null;
}) => {
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={styles.modernHeader}>
      <View>
        <Text style={styles.headerGreeting}>Bonjour 👋</Text>
        <Text style={styles.headerName}>{displayName}</Text>
        <Text style={styles.headerSubtitle}>Vendez en quelques clics</Text>
      </View>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
      ) : (
        <View style={styles.headerAvatarPlaceholder}>
          <Text style={styles.headerAvatarText}>{initials}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Catégorie Selector ───────────────────────────────────────────────────────
const CategorySelector = ({
  categories,
  selectedCategory,
  onSelect,
  error,
}: any) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>2</Text>
      </View>
      <Text style={styles.sectionTitle}>Catégorie</Text>
    </View>
    <Text style={styles.sectionSubtitle}>
      Choisissez la catégorie qui correspond le mieux
    </Text>
    <View style={styles.categoryGrid}>
      {categories.map((cat: any) => {
        const isSelected = selectedCategory === cat.value;
        return (
          <TouchableOpacity
            key={cat.value}
            onPress={() => onSelect(cat.value)}
            activeOpacity={0.7}
            style={[
              styles.categoryCard,
              isSelected && {
                ...styles.categoryCardSelected,
                borderColor: cat.color,
              },
            ]}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryLabel,
                isSelected && styles.categoryLabelSelected,
              ]}
            >
              {cat.label}
            </Text>
            {isSelected && (
              <View
                style={[styles.categoryCheck, { backgroundColor: cat.color }]}
              >
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
    {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
  </View>
);

// ─── Image Picker ─────────────────────────────────────────────────────────────
const ImagePickerField = ({ images, setImages, error, styles }: any) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert("Maximum atteint", "5 photos max.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setImages([...images, result.assets[0].uri]);
  };

  const takePhoto = () => {
    if (images.length >= 5) {
      Alert.alert("Maximum atteint", "5 photos max.");
      return;
    }
    setIsCameraOpen(true);
  };

  const handlePictureTaken = (uri: string) => {
    setImages([...images, uri]);
    setIsCameraOpen(false);
  };

  const removeImage = (index: number) =>
    setImages(images.filter((_: any, i: number) => i !== index));

  const setAsCover = (index: number) => {
    if (index === 0) return;
    const copy = [...images];
    const [picked] = copy.splice(index, 1);
    copy.unshift(picked);
    setImages(copy);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.stepBadge, { backgroundColor: "#ec4899" }]}>
          <Text style={styles.stepBadgeText}>1</Text>
        </View>
        <Text style={styles.sectionTitle}>Photos</Text>
      </View>
      <Text style={styles.sectionSubtitle}>
        Ajoutez jusqu'à 5 photos (la 1ère = couverture)
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.imageScroll}
      >
        {images.map((uri: string, index: number) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri }} style={styles.imagePreview} />
            {index === 0 && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>Cover</Text>
              </View>
            )}
            <View style={styles.imageNumber}>
              <Text style={styles.imageNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.imageActionsOverlay}>
              {index !== 0 && (
                <TouchableOpacity
                  style={styles.setCoverBtn}
                  onPress={() => setAsCover(index)}
                >
                  <Text style={styles.setCoverText}>Cover</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => removeImage(index)}
              >
                <Ionicons name="trash" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {images.length < 5 && (
          <View style={styles.addImageButtons}>
            <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
              <View style={styles.addImageIcon}>
                <Ionicons name="images" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.addImageText}>Galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addImageBtn, { marginLeft: 8 }]}
              onPress={takePhoto}
            >
              <View style={styles.addImageIcon}>
                <Ionicons name="camera" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.addImageText}>Caméra</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      {error && <Text style={styles.errorText}>⚠️ {error}</Text>}

      <Modal
        visible={isCameraOpen}
        animationType="slide"
        onRequestClose={() => setIsCameraOpen(false)}
      >
        <CameraModal
          onClose={() => setIsCameraOpen(false)}
          onPictureTaken={handlePictureTaken}
        />
      </Modal>
    </View>
  );
};

// ─── Form Field ───────────────────────────────────────────────────────────────
const ModernFormField = ({ label, required, helper, error, children }: any) => (
  <View style={styles.formField}>
    <Text style={styles.fieldLabel}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    {helper && <Text style={styles.fieldHelper}>{helper}</Text>}
    {children}
    {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SellScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [authVisible, setAuthVisible] = useState(false);
  const [form, setForm] = useState({
    title: "",
    price: "",
    description: "",
    whatsappNumber: "",
    category: "",
    hasWholesale: false,
    wholesalePrice: "",
    minWholesaleQty: "",
    zone: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [errors, setErrors] = useState<any>({});
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<{
    display_name?: string | null;
    avatar_url?: string | null;
  } | null>(null);

  // Localisation
  const [locationMode, setLocationMode] = useState<"auto" | "manual">("auto");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);

  useEffect(() => {
    if (!user) setAuthVisible(true);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (mounted && data) setProfile(data);
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Géoloc automatique au chargement
  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    setLocationLoading(true);
    setLocationDetected(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationMode("manual");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setForm((prev) => ({
        ...prev,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        zone: "",
      }));
      setLocationDetected(true);
    } catch {
      setLocationMode("manual");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleInputChange = (name: string, value: string | boolean) => {
    if (name === "price" || name === "wholesalePrice") {
      setForm((prev) => ({
        ...prev,
        [name]: String(value).replace(/[^0-9]/g, ""),
      }));
    } else if (name === "whatsappNumber" || name === "minWholesaleQty") {
      setForm((prev) => ({
        ...prev,
        [name]: String(value).replace(/[^0-9]/g, ""),
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors((prev: any) => ({ ...prev, [name]: null }));
  };

  const prettyPrice = (priceStr: string) => {
    if (!priceStr) return "";
    return priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const calculateProgress = () => {
    let progress = 0;
    if (images.length > 0) progress += 20;
    if (form.category) progress += 20;
    if (form.title) progress += 15;
    if (form.price) progress += 15;
    if (form.description) progress += 10;
    if (form.whatsappNumber) progress += 5;
    if (form.latitude || form.zone) progress += 5;
    if (form.hasWholesale && form.wholesalePrice && form.minWholesaleQty)
      progress += 10;
    return progress;
  };

  const validateForm = () => {
    let newErrors: any = {};
    if (!form.title.trim()) newErrors.title = "Le titre est obligatoire";
    if (!form.price.trim()) newErrors.price = "Le prix est obligatoire";
    if (!form.category) newErrors.category = "Choisissez une catégorie";
    if (images.length === 0) newErrors.images = "Ajoutez au moins une photo";
    if (locationMode === "manual" && !form.zone)
      newErrors.zone = "Choisissez un quartier";
    if (form.hasWholesale) {
      if (!form.wholesalePrice.trim())
        newErrors.wholesalePrice = "Prix de gros obligatoire";
      if (!form.minWholesaleQty.trim())
        newErrors.minWholesaleQty = "Quantité minimale obligatoire";
      if (
        form.wholesalePrice &&
        form.price &&
        parseFloat(form.wholesalePrice) >= parseFloat(form.price)
      ) {
        newErrors.wholesalePrice =
          "Le prix de gros doit être inférieur au prix unitaire";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadImages = async (imagesToUpload: string[], userId: string) => {
    const uploadedUrls: string[] = [];
    for (const [index, uri] of imagesToUpload.entries()) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });
      const fileName = `${userId}-${Date.now()}-${index}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("product")
        .upload(fileName, decode(base64), { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("product").getPublicUrl(fileName);
      uploadedUrls.push(data.publicUrl);
    }
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!validateForm() || !user?.id) return;
    setLoading(true);
    try {
      const uploadedUrls = await uploadImages(images, user.id);
      const mainImage = uploadedUrls[0];
      const otherImages = uploadedUrls.slice(1);

      // Trouver les coordonnées de la zone si mode manuel
      const selectedZone = DAKAR_ZONES.find((z) => z.name === form.zone);

      const productData: any = {
        title: form.title,
        price: parseFloat(form.price),
        category: form.category,
        description: form.description,
        user_id: user.id,
        image_url: mainImage,
        whatsapp_number: form.whatsappNumber
          ? "+221" + form.whatsappNumber
          : null,
        has_wholesale: form.hasWholesale,
        wholesale_price:
          form.hasWholesale && form.wholesalePrice
            ? parseFloat(form.wholesalePrice)
            : null,
        min_wholesale_qty:
          form.hasWholesale && form.minWholesaleQty
            ? parseInt(form.minWholesaleQty)
            : null,
        latitude:
          locationMode === "auto"
            ? form.latitude
            : (selectedZone?.latitude ?? null),
        longitude:
          locationMode === "auto"
            ? form.longitude
            : (selectedZone?.longitude ?? null),
        zone: locationMode === "manual" ? form.zone : null,
      };

      const { data: product, error: productError } = await supabase
        .from("product")
        .insert(productData)
        .select()
        .single();
      if (productError) throw productError;

      if (otherImages.length > 0) {
        await supabase.from("product_images").insert(
          otherImages.map((url) => ({
            product_id: product.id,
            image_url: url,
          })),
        );
      }

      Alert.alert("🎉 Succès !", "Votre article est maintenant en ligne", [
        { text: "OK", onPress: () => router.replace(`/product/${product.id}`) },
      ]);
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Impossible de publier l'article");
    } finally {
      setLoading(false);
    }
  };

  if (!user)
    return (
      <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />
    );

  const displayName =
    profile?.display_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "utilisateur";
  const avatarUrl =
    profile?.avatar_url || user.user_metadata?.avatar_url || null;
  const isFormValid =
    images.length > 0 &&
    form.category &&
    form.title &&
    form.price &&
    (locationMode === "auto" ? locationDetected : !!form.zone) &&
    (!form.hasWholesale || (form.wholesalePrice && form.minWholesaleQty));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FAFAFA" barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ModernHeader displayName={displayName} avatarUrl={avatarUrl} />
          <ProgressBar progress={calculateProgress()} />

          <View style={styles.card}>
            {/* ── Photos ── */}
            <ImagePickerField
              images={images}
              setImages={setImages}
              error={errors.images}
              styles={styles}
            />
            <View style={styles.divider} />

            {/* ── Catégorie ── */}
            <CategorySelector
              categories={categories}
              selectedCategory={form.category}
              onSelect={(cat: string) => handleInputChange("category", cat)}
              error={errors.category}
            />
            <View style={styles.divider} />

            {/* ── Détails & Prix ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View
                  style={[styles.stepBadge, { backgroundColor: "#10b981" }]}
                >
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <Text style={styles.sectionTitle}>Détails & Prix</Text>
              </View>

              <ModernFormField
                label="Titre"
                required
                error={errors.title}
                helper="Soyez précis et descriptif"
              >
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Sac en cuir marron, état neuf"
                  placeholderTextColor="#9ca3af"
                  value={form.title}
                  onChangeText={(t) => handleInputChange("title", t)}
                />
              </ModernFormField>

              <ModernFormField
                label="Prix unitaire (FCFA)"
                required
                error={errors.price}
              >
                <View style={styles.priceInput}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="5 000"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={prettyPrice(form.price)}
                    onChangeText={(p) => handleInputChange("price", p)}
                  />
                  <Text style={styles.priceCurrency}>FCFA</Text>
                </View>
              </ModernFormField>

              {/* Prix de gros */}
              <View style={styles.wholesaleSection}>
                <View style={styles.wholesaleHeader}>
                  <View>
                    <Text style={styles.wholesaleTitle}>🏪 Prix de gros</Text>
                    <Text style={styles.wholesaleSubtitle}>
                      Activez pour vendre en grande quantité
                    </Text>
                  </View>
                  <Switch
                    value={form.hasWholesale}
                    onValueChange={(val) =>
                      handleInputChange("hasWholesale", val)
                    }
                    trackColor={{ false: "#e5e7eb", true: "#86efac" }}
                    thumbColor={form.hasWholesale ? "#10b981" : "#f3f4f6"}
                  />
                </View>
                {form.hasWholesale && (
                  <View style={styles.wholesaleFields}>
                    <ModernFormField
                      label="Prix de gros unitaire (FCFA)"
                      required
                      error={errors.wholesalePrice}
                      helper="Doit être inférieur au prix unitaire"
                    >
                      <View style={styles.priceInput}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="3 500"
                          placeholderTextColor="#9ca3af"
                          keyboardType="numeric"
                          value={prettyPrice(form.wholesalePrice)}
                          onChangeText={(p) =>
                            handleInputChange("wholesalePrice", p)
                          }
                        />
                        <Text style={styles.priceCurrency}>FCFA</Text>
                      </View>
                    </ModernFormField>
                    <ModernFormField
                      label="Quantité minimale"
                      required
                      error={errors.minWholesaleQty}
                      helper="Nombre minimum d'articles à commander"
                    >
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: 10"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        value={form.minWholesaleQty}
                        onChangeText={(q) =>
                          handleInputChange("minWholesaleQty", q)
                        }
                      />
                    </ModernFormField>
                    {form.price &&
                      form.wholesalePrice &&
                      form.minWholesaleQty && (
                        <View style={styles.wholesalePreview}>
                          <Text style={styles.wholesalePreviewText}>
                            💰 Économie:{" "}
                            {prettyPrice(
                              String(
                                (parseFloat(form.price) -
                                  parseFloat(form.wholesalePrice)) *
                                  parseInt(form.minWholesaleQty),
                              ),
                            )}{" "}
                            FCFA pour {form.minWholesaleQty} articles
                          </Text>
                        </View>
                      )}
                  </View>
                )}
              </View>

              <ModernFormField
                label="Description"
                helper="État, taille, défauts éventuels..."
              >
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Décrivez votre article en détail..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  maxLength={800}
                  value={form.description}
                  onChangeText={(t) => handleInputChange("description", t)}
                />
                <Text style={styles.charCount}>
                  {form.description.length}/800
                </Text>
              </ModernFormField>
            </View>

            <View style={styles.divider} />

            {/* ── Contact ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View
                  style={[styles.stepBadge, { backgroundColor: "#f59e0b" }]}
                >
                  <Text style={styles.stepBadgeText}>4</Text>
                </View>
                <Text style={styles.sectionTitle}>Contact</Text>
              </View>
              <ModernFormField
                label="Numéro WhatsApp"
                helper="Pour que les acheteurs vous contactent"
              >
                <View style={styles.phoneInput}>
                  <Text style={styles.phonePrefix}>+221</Text>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="77 123 45 67"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    maxLength={9}
                    value={form.whatsappNumber}
                    onChangeText={(t) => handleInputChange("whatsappNumber", t)}
                  />
                </View>
              </ModernFormField>
            </View>

            <View style={styles.divider} />

            {/* ── Localisation ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View
                  style={[styles.stepBadge, { backgroundColor: "#6C63FF" }]}
                >
                  <Text style={styles.stepBadgeText}>5</Text>
                </View>
                <Text style={styles.sectionTitle}>Localisation</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Pour que les acheteurs proches vous trouvent facilement
              </Text>

              {/* Toggle auto / manuel */}
              <View style={styles.locationToggle}>
                <TouchableOpacity
                  style={[
                    styles.locationToggleBtn,
                    locationMode === "auto" && styles.locationToggleBtnActive,
                  ]}
                  onPress={() => {
                    setLocationMode("auto");
                    getLocation();
                  }}
                >
                  <Ionicons
                    name="navigate"
                    size={16}
                    color={locationMode === "auto" ? "#fff" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.locationToggleText,
                      locationMode === "auto" &&
                        styles.locationToggleTextActive,
                    ]}
                  >
                    Ma position
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.locationToggleBtn,
                    locationMode === "manual" && styles.locationToggleBtnActive,
                  ]}
                  onPress={() => setLocationMode("manual")}
                >
                  <Ionicons
                    name="map"
                    size={16}
                    color={locationMode === "manual" ? "#fff" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.locationToggleText,
                      locationMode === "manual" &&
                        styles.locationToggleTextActive,
                    ]}
                  >
                    Choisir un quartier
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Mode auto */}
              {locationMode === "auto" && (
                <View style={styles.locationStatus}>
                  {locationLoading ? (
                    <View style={styles.locationRow}>
                      <ActivityIndicator size="small" color="#6C63FF" />
                      <Text style={styles.locationLoadingText}>
                        Détection en cours...
                      </Text>
                    </View>
                  ) : locationDetected ? (
                    <View style={styles.locationSuccess}>
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#10B981"
                      />
                      <Text style={styles.locationSuccessText}>
                        Position détectée avec succès ✅
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.locationError}>
                      <Ionicons name="alert-circle" size={22} color="#EF4444" />
                      <Text style={styles.locationErrorText}>
                        Position non disponible
                      </Text>
                      <TouchableOpacity
                        style={styles.locationRetry}
                        onPress={getLocation}
                      >
                        <Ionicons name="refresh" size={14} color="#6C63FF" />
                        <Text style={styles.locationRetryText}>Réessayer</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {/* Mode manuel */}
              {locationMode === "manual" && (
                <>
                  <View style={styles.zonesGrid}>
                    {DAKAR_ZONES.map((zone) => (
                      <TouchableOpacity
                        key={zone.name}
                        style={[
                          styles.zoneChip,
                          form.zone === zone.name && styles.zoneChipActive,
                        ]}
                        onPress={() =>
                          setForm((prev) => ({
                            ...prev,
                            zone: zone.name,
                            latitude: null,
                            longitude: null,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.zoneChipText,
                            form.zone === zone.name &&
                              styles.zoneChipTextActive,
                          ]}
                        >
                          {zone.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.zone && (
                    <Text style={styles.errorText}>⚠️ {errors.zone}</Text>
                  )}
                </>
              )}
            </View>

            {/* ── Submit ── */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!isFormValid || loading) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#1f2937" size="small" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Publier l'article</Text>
                  <Ionicons name="arrow-forward" size={20} color="#1f2937" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.tips}>
              <Text style={styles.tipsTitle}>💡 Conseils pour vendre vite</Text>
              <Text style={styles.tipItem}>
                • Photos nettes avec bonne lumière
              </Text>
              <Text style={styles.tipItem}>
                • Prix réaliste = vente 3x plus rapide
              </Text>
              <Text style={styles.tipItem}>• Mentionnez tous les défauts</Text>
              {form.hasWholesale && (
                <Text style={styles.tipItem}>
                  • Prix de gros attractif pour volumes
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFAFA" },
  scrollContent: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    elevation: 2,
  },
  modernHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 2,
  },
  headerGreeting: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  headerName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  headerSubtitle: { fontSize: 13, color: "#9ca3af" },
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "#f59e0b",
  },
  headerAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarText: { fontSize: 18, fontWeight: "700", color: "#f59e0b" },
  progressContainer: {
    marginBottom: 16,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  progressPercent: { fontSize: 13, fontWeight: "700", color: "#f59e0b" },
  progressBarBg: {
    height: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#f59e0b",
    borderRadius: 8,
  },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  stepBadgeText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  sectionSubtitle: { fontSize: 13, color: "#6b7280", marginBottom: 16 },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 24 },
  imageScroll: { marginBottom: 12 },
  imageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginRight: 12,
    position: "relative",
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%", borderRadius: 16 },
  coverBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  coverBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  imageNumber: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  imageNumberText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  imageActionsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  setCoverBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  setCoverText: { fontSize: 11, fontWeight: "600", color: "#111827" },
  removeImageBtn: {
    backgroundColor: "#ef4444",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  addImageButtons: { flexDirection: "row" },
  addImageBtn: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#f59e0b",
    backgroundColor: "#fffbeb",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  addImageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  addImageText: { fontSize: 12, fontWeight: "600", color: "#92400e" },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryCard: {
    width: "48%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#fafafa",
    alignItems: "center",
    gap: 8,
  },
  categoryCardSelected: { backgroundColor: "#fffbeb", borderWidth: 2 },
  categoryIcon: { fontSize: 32 },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
  },
  categoryLabelSelected: { color: "#111827" },
  categoryCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  formField: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  required: { color: "#ef4444" },
  fieldHelper: { fontSize: 12, color: "#6b7280", marginBottom: 8 },
  input: {
    backgroundColor: "#fafafa",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
  },
  textArea: { height: 120, textAlignVertical: "top", paddingTop: 14 },
  charCount: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "right",
    marginTop: 4,
  },
  priceInput: { flexDirection: "row", alignItems: "center", gap: 12 },
  priceCurrency: { fontSize: 15, fontWeight: "700", color: "#6b7280" },
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fafafa",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderRadius: 12,
  },
  phonePrefix: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6b7280",
    paddingLeft: 16,
  },
  wholesaleSection: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#bbf7d0",
  },
  wholesaleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  wholesaleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 4,
  },
  wholesaleSubtitle: { fontSize: 12, color: "#15803d" },
  wholesaleFields: { gap: 16, paddingTop: 8 },
  wholesalePreview: {
    backgroundColor: "#dcfce7",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#86efac",
    marginTop: 8,
  },
  wholesalePreviewText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
    textAlign: "center",
  },

  // Localisation
  locationToggle: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  locationToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 9,
  },
  locationToggleBtnActive: { backgroundColor: "#6C63FF" },
  locationToggleText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  locationToggleTextActive: { color: "#fff" },
  locationStatus: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  locationLoadingText: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  locationSuccess: { flexDirection: "row", alignItems: "center", gap: 8 },
  locationSuccessText: { fontSize: 14, fontWeight: "600", color: "#10B981" },
  locationError: { alignItems: "center", gap: 8 },
  locationErrorText: { fontSize: 14, color: "#EF4444", fontWeight: "500" },
  locationRetry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  locationRetryText: { fontSize: 13, fontWeight: "600", color: "#6C63FF" },
  zonesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  zoneChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  zoneChipActive: { backgroundColor: "#EEF2FF", borderColor: "#6C63FF" },
  zoneChipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  zoneChipTextActive: { color: "#6C63FF", fontWeight: "700" },

  submitBtn: {
    backgroundColor: "#f59e0b",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    marginTop: 24,
    gap: 8,
  },
  submitBtnDisabled: { backgroundColor: "#f3f4f6", opacity: 0.8 },
  submitBtnText: { fontSize: 16, fontWeight: "800", color: "#1f2937" },
  tips: {
    marginTop: 32,
    padding: 16,
    backgroundColor: "#f0f9ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0f2fe",
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0369a1",
    marginBottom: 8,
  },
  tipItem: { fontSize: 13, color: "#075985", lineHeight: 20 },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
});
