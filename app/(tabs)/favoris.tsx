import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import AuthModal from '../composants/authModal';
import ProductCard from '../composants/productCard';

interface Product {
  id: string;
  name: string;
  title: string;
  price: number;
  image?: string;
  image_url?: string;
  category?: string;
  created_at: string;
  location?: string;
}

const CATEGORIES_MAP: { [key: string]: { name: string; icon: string; color: string } } = {
  vetement: { name: 'Vêtements', icon: '👗', color: '#EC4899' },
  soins_et_astuces: { name: 'Soins', icon: '💄', color: '#8B5CF6' },
  maquillage: { name: 'Maquillage', icon: '💋', color: '#EF4444' },
  artisanat: { name: 'Artisanat', icon: '🎨', color: '#F59E0B' },
  electronique: { name: 'Électronique', icon: '📱', color: '#3B82F6' },
  accessoire: { name: 'Accessoires', icon: '👜', color: '#10B981' },
  chaussure: { name: 'Chaussures', icon: '👠', color: '#6366F1' },
};

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) {
      setShowAuthModal(true);
      setLoading(false);
      return;
    }
    fetchFavorites();
  }, [user]);

  useEffect(() => {
    if (favorites.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [favorites]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const { data: likes, error: likesError } = await supabase
        .from('product_like')
        .select('product_id')
        .eq('user_id', user.id);

      if (likesError) throw likesError;

      const productIds = likes?.map((like) => like.product_id) || [];

      let products: Product[] = [];
      if (productIds.length > 0) {
        const { data, error: productsError } = await supabase
          .from('product')
          .select('*')
          .in('id', productIds)
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;
        products = data || [];
      }

      setFavorites(products);
    } catch (error) {
      console.error('Erreur favoris:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleRemoveFavorite = async (productId: string, productTitle?: string) => {
    if (!user) return;

    Alert.alert(
      'Retirer des favoris',
      `Voulez-vous retirer "${productTitle || 'cet article'}" de vos favoris ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(productId);

            // Optimistic update
            const previousFavorites = [...favorites];
            setFavorites((prev) => prev.filter((item) => item.id !== productId));

            try {
              const { error } = await supabase
                .from('product_like')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', productId);

              if (error) throw error;
            } catch (error) {
              console.error('Erreur suppression favori:', error);
              setFavorites(previousFavorites); // Rollback
              Alert.alert('Erreur', 'Impossible de retirer cet article des favoris');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const categories = Array.from(new Set(favorites.map(f => f.category).filter(Boolean)));
  const filteredFavorites = selectedCategory === 'all'
    ? favorites
    : favorites.filter(f => f.category === selectedCategory);

  const headerScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  if (!user) {
    return (
      <>
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <View style={styles.heartIcon}>
                <Ionicons name="heart-outline" size={72} color="#F6C445" />
              </View>
            </View>
            <Text style={styles.emptyTitle}>Vos favoris vous attendent</Text>
            <Text style={styles.emptyText}>
              Connectez-vous pour sauvegarder vos articles préférés et les retrouver facilement à tout moment
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => setShowAuthModal(true)}
            >
              <Ionicons name="log-in" size={20} color="#1C2B49" />
              <Text style={styles.loginButtonText}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>
        <AuthModal visible={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loaderCircle}>
          <ActivityIndicator size="large" color="#F6C445" />
        </View>
        <Text style={styles.loadingText}>Chargement de vos favoris...</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />

        <View style={styles.headerEmpty}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Mes Favoris</Text>
            <View style={styles.headerBadge}>
              <Ionicons name="heart" size={16} color="#EF4444" />
              <Text style={styles.headerBadgeText}>0</Text>
            </View>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIllustration}>
            <View style={styles.heartIcon}>
              <Ionicons name="heart-outline" size={72} color="#D1D5DB" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>Aucun favori pour le moment</Text>
          <Text style={styles.emptyText}>
            Parcourez nos produits et ajoutez vos coups de cœur en tapant sur le ❤️
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/')}
          >
            <Ionicons name="compass" size={22} color="#1C2B49" />
            <Text style={styles.exploreButtonText}>Découvrir les produits</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FB" />

      <Animated.FlatList
        data={filteredFavorites}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={
          <Animated.View style={[styles.headerContainer, { transform: [{ scale: headerScale }] }]}>
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>Mes Favoris</Text>
              <View style={styles.headerBadge}>
                <Ionicons name="heart" size={16} color="#EF4444" />
                <Text style={styles.headerBadgeText}>{favorites.length}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="bookmark" size={18} color="#6B7280" />
                <Text style={styles.statText}>
                  {favorites.length} sauvegardé{favorites.length > 1 ? 's' : ''}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="pricetag" size={18} color="#6B7280" />
                <Text style={styles.statText}>
                  {categories.length} catégorie{categories.length > 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {categories.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Filtrer par catégorie</Text>
                <View style={styles.categoriesRow}>
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      selectedCategory === 'all' && styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory('all')}
                  >
                    <Text style={[
                      styles.categoryChipText,
                      selectedCategory === 'all' && styles.categoryChipTextActive,
                    ]}>
                      Tout
                    </Text>
                  </TouchableOpacity>

                  {categories.map((cat) => {
                    const catInfo = CATEGORIES_MAP[cat || ''] || { name: cat, icon: '📦', color: '#6B7280' };
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          selectedCategory === cat && styles.categoryChipActive,
                        ]}
                        onPress={() => setSelectedCategory(cat || 'all')}
                      >
                        <Text style={styles.categoryEmoji}>{catInfo.icon}</Text>
                        <Text style={[
                          styles.categoryChipText,
                          selectedCategory === cat && styles.categoryChipTextActive,
                        ]}>
                          {catInfo.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {selectedCategory !== 'all' && (
              <TouchableOpacity
                style={styles.clearFilter}
                onPress={() => setSelectedCategory('all')}
              >
                <Ionicons name="close-circle" size={16} color="#EF4444" />
                <Text style={styles.clearFilterText}>Effacer le filtre</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            style={[
              styles.productWrapper,
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
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveFavorite(item.id, item.title || item.name)}
              disabled={removingId === item.id}
            >
              {removingId === item.id ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="heart" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          selectedCategory !== 'all' ? (
            <View style={styles.emptyFilterContainer}>
              <Ionicons name="funnel-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyFilterTitle}>Aucun résultat</Text>
              <Text style={styles.emptyFilterText}>
                Aucun favori dans cette catégorie
              </Text>
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={() => setSelectedCategory('all')}
              >
                <Text style={styles.clearFilterButtonText}>Voir tout</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ListFooterComponent={
          filteredFavorites.length > 0 ? (
            <View style={styles.footer}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.footerText}>Tous vos favoris sont affichés</Text>
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
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />
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
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  headerEmpty: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterSection: {
    marginTop: 8,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#F6C445',
  },
  categoryEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#1C2B49',
    fontWeight: '700',
  },
  clearFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  clearFilterText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
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
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIllustration: {
    marginBottom: 32,
  },
  heartIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F6C445',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C2B49',
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6C445',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C2B49',
  },
  emptyFilterContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyFilterTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyFilterText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  clearFilterButton: {
    backgroundColor: '#F6C445',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  clearFilterButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C2B49',
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
});