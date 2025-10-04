import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import ProductCard from "../composants/productCard";
import { supabase } from "../../lib/supabaseClient";



type Product = {
  id: number;
  title: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  seller?: string;
  location?: string;
  condition?: string;
};

const CATEGORIES = [
  { id: "all", name: "Tout", icon: "apps", gradient: ["#FACC15", "#FDE047"] },
  { id: "fashion", name: "Mode", icon: "shirt", gradient: ["#F59E0B", "#FBBF24"] },
  { id: "electronics", name: "Électronique", icon: "phone-portrait", gradient: ["#EAB308", "#FCD34D"] },
  { id: "home", name: "Maison", icon: "home", gradient: ["#F59E0B", "#FDE047"] },
  { id: "beauty", name: "Beauté", icon: "sparkles", gradient: ["#FACC15", "#FEF3C7"] },
  { id: "sports", name: "Sport", icon: "football", gradient: ["#F59E0B", "#FBBF24"] },
];

export default function HomeScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");


  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    const { data, error } = await supabase.from("product").select("*");

    if (error) {
      console.error(error);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <View style={styles.loaderContent}>
          <View style={styles.loaderCircle}>
            <ActivityIndicator size="large" color="#FACC15" />
          </View>
          <Text style={styles.loaderText}>Chargement...</Text>
          <Text style={styles.loaderSubtext}>Découvrez les meilleures offres</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header Premium */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Bonjour 👋</Text>
            <Text style={styles.subtitle}>Que cherchez-vous ?</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications" size={24} color="#292524" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="person-circle" size={28} color="#FACC15" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barre de recherche Premium */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={22} color="#78716C" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un article..."
              placeholderTextColor="#A8A29E"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#A8A29E" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options" size={22} color="#292524" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Vendez facilement 🚀</Text>
              <Text style={styles.heroSubtitle}>
                Transformez vos articles en cash en quelques clics
              </Text>
              <TouchableOpacity style={styles.heroButton}>
                <Text style={styles.heroButtonText}>Commencer à vendre</Text>
                <Ionicons name="arrow-forward" size={18} color="#292524" />
              </TouchableOpacity>
            </View>
            <View style={styles.heroImageContainer}>
              <View style={styles.heroCircle1} />
              <View style={styles.heroCircle2} />
              <Ionicons name="bag-add" size={64} color="#FACC15" />
            </View>
          </View>
        </View>

        {/* Catégories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Catégories</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Tout voir</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.id && styles.categoryCardActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.categoryIconContainer,
                    selectedCategory === category.id && styles.categoryIconActive,
                  ]}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={26}
                    color={selectedCategory === category.id ? "#292524" : "#78716C"}
                  />
                </View>
                <Text
                  style={[
                    styles.categoryName,
                    selectedCategory === category.id && styles.categoryNameActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Statistiques rapides */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="pricetag" size={20} color="#FACC15" />
            </View>
            <Text style={styles.statNumber}>{filteredProducts.length}</Text>
            <Text style={styles.statLabel}>Articles</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={20} color="#FACC15" />
            </View>
            <Text style={styles.statNumber}>2.4K</Text>
            <Text style={styles.statLabel}>Vendeurs</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="heart" size={20} color="#FACC15" />
            </View>
            <Text style={styles.statNumber}>890</Text>
            <Text style={styles.statLabel}>Favoris</Text>
          </View>
        </View>

        {/* Section Produits */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Nouveautés</Text>
              <Text style={styles.sectionSubtitle}>
                {filteredProducts.length} article{filteredProducts.length > 1 ? "s" : ""} disponible{filteredProducts.length > 1 ? "s" : ""}
              </Text>
            </View>
            <TouchableOpacity style={styles.sortButton}>
              <Ionicons name="swap-vertical" size={18} color="#292524" />
              <Text style={styles.sortText}>Trier</Text>
            </TouchableOpacity>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyCircle}>
                <Ionicons name="search" size={48} color="#E7E5E4" />
              </View>
              <Text style={styles.emptyTitle}>Aucun résultat</Text>
              <Text style={styles.emptySubtitle}>
                Essayez de modifier vos critères de recherche
              </Text>
              <TouchableOpacity style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Réinitialiser</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.productsContainer}>
              {filteredProducts.map((product) => (
                <View key={product.id} style={styles.productWrapper}>
                  <ProductCard
                    id={product.id}
                    title={product.title}
                    price={product.price}
                    image_url={product.image_url}
                    seller={product.seller}
                    location={product.location}
                    condition={product.condition}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bouton flottant pour vendre */}
      <TouchableOpacity style={styles.floatingButton} activeOpacity={0.9}>
        <Ionicons name="add" size={28} color="#292524" />
        <Text style={styles.floatingButtonText}>Vendre</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF9",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: "#292524",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#78716C",
    marginTop: 4,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#fff",
  },
  searchWrapper: {
    flexDirection: "row",
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F4",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#292524",
    fontWeight: "500",
  },
  filterButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#FACC15",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#FEF3C7",
    borderRadius: 24,
    overflow: "hidden",
  },
  heroContent: {
    flexDirection: "row",
    padding: 24,
    alignItems: "center",
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#292524",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#57534E",
    marginBottom: 16,
    lineHeight: 20,
    fontWeight: "500",
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FACC15",
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  heroButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#292524",
  },
  heroImageContainer: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heroCircle1: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FACC15",
    opacity: 0.2,
  },
  heroCircle2: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FACC15",
    opacity: 0.3,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#292524",
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#78716C",
    marginTop: 2,
    fontWeight: "500",
  },
  seeAllText: {
    fontSize: 14,
    color: "#F59E0B",
    fontWeight: "600",
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    alignItems: "center",
    marginRight: 4,
  },
  categoryIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#F5F5F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  categoryIconActive: {
    backgroundColor: "#FACC15",
  },
  categoryName: {
    fontSize: 13,
    color: "#78716C",
    fontWeight: "600",
  },
  categoryNameActive: {
    color: "#292524",
    fontWeight: "700",
  },
  categoryCardActive: {
    transform: [{ scale: 1.05 }],
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#292524",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#78716C",
    fontWeight: "500",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F4",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  sortText: {
    fontSize: 13,
    color: "#292524",
    fontWeight: "600",
  },
  productsContainer: {
    paddingHorizontal: 20,
  },
  productWrapper: {
    marginBottom: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F5F5F4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#292524",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#78716C",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#292524",
  },
  floatingButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#FACC15",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#292524",
    letterSpacing: 0.5,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: "#FAFAF9",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderContent: {
    alignItems: "center",
  },
  loaderCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  loaderText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#292524",
    marginBottom: 4,
  },
  loaderSubtext: {
    fontSize: 14,
    color: "#78716C",
    fontWeight: "500",
  },
});