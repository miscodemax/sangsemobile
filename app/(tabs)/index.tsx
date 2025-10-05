import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
  View
} from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import ProductCard from '../composants/productCard';

interface Product {
  id: string;
  name: string;
  title: string;
  description?: string;
  price: number;
  image?: string;
  image_url?: string;
  category?: string;
  created_at: string;
  product_like?: { count: number }[];
}

const PRICE_RANGES = [
  { id: 'all', label: 'Tous', min: 0, max: Infinity },
  { id: 'low', label: '< 10k', min: 0, max: 10000 },
  { id: 'medium', label: '10k - 50k', min: 10000, max: 50000 },
  { id: 'high', label: '50k - 100k', min: 50000, max: 100000 },
  { id: 'premium', label: '> 100k', min: 100000, max: Infinity },
];

const CATEGORIES = [
  { id: 'all', name: 'Tout', icon: 'apps' },
  { id: 'Mode', name: 'Mode', icon: 'shirt' },
  { id: 'Électronique', name: 'Tech', icon: 'phone-portrait' },
  { id: 'Maison', name: 'Maison', icon: 'home' },
  { id: 'Sport', name: 'Sport', icon: 'football' },
];

const ITEMS_PER_PAGE = 10;

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const scrollY = new Animated.Value(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('product')
        .select(`
          *,
          product_like(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erreur:', error);
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
    const matchesSearch =
      !searchQuery ||
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;

    const priceRange = PRICE_RANGES.find((r) => r.id === selectedPriceRange);
    const matchesPrice =
      !priceRange || (product.price >= priceRange.min && product.price <= priceRange.max);

    return matchesSearch && matchesCategory && matchesPrice;
  });

  const displayedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedPriceRange('all');
    setShowFilters(false);
  };

  const loadMore = () => {
    setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredProducts.length));
  };

  const hasActiveFilters = selectedCategory !== 'all' || selectedPriceRange !== 'all' || searchQuery;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loaderCircle}>
          <ActivityIndicator size="large" color="#F6C445" />
        </View>
        <Text style={styles.loadingText}>Chargement...</Text>
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
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={24} color="#1F2937" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

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
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="options" size={22} color="#1F2937" />
            {hasActiveFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        <Text style={styles.productCount}>
          {filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''}
        </Text>
      </Animated.View>

      {showFilters && (
        <View style={styles.filtersPanel}>
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
                  <Ionicons
                    name={category.icon as any}
                    size={16}
                    color={selectedCategory === category.id ? '#1C2B49' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategory === category.id && styles.filterChipTextActive,
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
                      selectedPriceRange === range.id && styles.filterChipTextActive,
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
              <Text style={styles.clearButtonText}>Effacer</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <Animated.FlatList
        data={displayedProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.productWrapper}>
            {index < 3 && !hasActiveFilters && (
              <View style={styles.topBadge}>
                <Ionicons name="star" size={10} color="#FFF" />
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
                ? 'Modifiez vos filtres'
                : 'Pas encore de produits'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.emptyButton} onPress={clearFilters}>
                <Text style={styles.emptyButtonText}>Réinitialiser</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
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
            colors={['#F6C445']}
            tintColor="#F6C445"
          />
        }
        columnWrapperStyle={styles.row}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      />

      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.push('/')}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={24} color="#1C2B49" />
        <Text style={styles.floatingButtonText}>Vendre</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
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
  listContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    position: 'relative',
  },
  logo: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -1,
  },
  logoSangse: {
    color: '#1F2937',
  },
  logoShop: {
    color: '#F6C445',
  },
  logoDot: {
    position: 'absolute',
    right: -8,
    top: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  notificationText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  searchWrapper: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F6C445',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#FFD700',
  },
  filterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  productCount: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filtersPanel: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    shadowColor: '#000',
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
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 14,
    gap: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  productWrapper: {
    width: '48%',
    position: 'relative',
  },
  topBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F6C445',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyCircle: {
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
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#F6C445',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C2B49',
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6C445',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C2B49',
  },
  loadMoreInfo: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 12,
    fontWeight: '500',
  },
  endContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  endText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 60,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6C445',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C2B49',
  },
});