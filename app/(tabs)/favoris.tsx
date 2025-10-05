import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import ProductCard from '../composants/productCard';
import AuthModal from '../composants/authModal';

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

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowAuthModal(true);
      setLoading(false);
      return;
    }
    fetchFavorites();
  }, [user]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      // Récupère les likes
      const { data: likes, error: likesError } = await supabase
        .from('product_like')
        .select('product_id')
        .eq('user_id', user.id);

      if (likesError) throw likesError;

      const productIds = likes?.map((like) => like.product_id) || [];

      // Récupère les produits likés
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

  const handleRemoveFavorite = async (productId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('product_like')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId);

      setFavorites((prev) => prev.filter((item) => item.id !== productId));
    } catch (error) {
      console.error('Erreur suppression favori:', error);
    }
  };

  if (!user) {
    return (
      <>
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View style={styles.emptyContainer}>
            <View style={styles.emptyCircle}>
              <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Vos favoris vous attendent</Text>
            <Text style={styles.emptyText}>
              Connectez-vous pour sauvegarder vos articles préférés et les retrouver facilement
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => setShowAuthModal(true)}
            >
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
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Favoris</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>0</Text>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyCircle}>
            <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>Aucun favori pour le moment</Text>
          <Text style={styles.emptyText}>
            Explorez notre catalogue et ajoutez vos coups de cœur en cliquant sur le ❤️
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/')}
          >
            <Ionicons name="compass" size={20} color="#1C2B49" />
            <Text style={styles.exploreButtonText}>Explorer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Favoris</Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{favorites.length}</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              {favorites.length} article{favorites.length > 1 ? 's' : ''} sauvegardé{favorites.length > 1 ? 's' : ''}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.productWrapper}>
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
            />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveFavorite(item.id)}
            >
              <Ionicons name="close" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#F6C445']}
            tintColor="#F6C445"
          />
        }
        showsVerticalScrollIndicator={false}
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
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerBadge: {
    backgroundColor: '#F6C445',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C2B49',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
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
    backgroundColor: '#F6C445',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C2B49',
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6C445',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C2B49',
  },
});