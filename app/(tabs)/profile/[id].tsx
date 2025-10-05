"use client";

import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
// Importation des icônes
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import AuthModal from "../../composants/authModal";
import ProductCard from "../../composants/productCard";

// Dimensions pour la grille (inchangé)
const { width } = Dimensions.get('window');
const GRID_PADDING = 10;
const ITEM_MARGIN = 5;
const NUM_COLUMNS = 2;
const itemSize = (width - (GRID_PADDING * 2) - (ITEM_MARGIN * (NUM_COLUMNS - 1))) / NUM_COLUMNS;

// Couleur principale (inchangée)
const SAFFRON_YELLOW = '#FFB347';

// --- Types ---
type Profile = {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    bio: string;
    created_at: string; // Ajout pour la date d'inscription
};

type Product = {
    id: string;
    title: string;
    price: number;
    image_url: string;
};

type SortOption = 'newest' | 'price_asc' | 'price_desc';
// --- Fin des types ---


// ✨ NOUVEAU: Helper pour formater la date d'inscription
const formatJoinDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    return `Membre depuis ${date.toLocaleDateString('fr-FR', options)}`;
};

// ✨ NOUVEAU: Composant visuel pour les étoiles
const StarRating = ({ rating, count }: { rating: number; count: number }) => (
    <View style={styles.starContainer}>
        {[...Array(5)].map((_, index) => (
            <Ionicons
                key={index}
                name={index < Math.round(rating) ? "star" : "star-outline"}
                size={18}
                color={SAFFRON_YELLOW}
            />
        ))}
        {count > 0 && <Text style={styles.ratingCountText}>({count})</Text>}
    </View>
);


export default function ProfilePage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [sortOption, setSortOption] = useState<SortOption>('newest');

    // États pour l'évaluation et la bio
    const [rating, setRating] = useState<number>(0);
    const [ratingCount, setRatingCount] = useState<number>(0);
    const [isBioExpanded, setIsBioExpanded] = useState(false);

    // Modal si non connecté (inchangé)
    useEffect(() => {
        if (!user) setShowAuthModal(true);
        else setShowAuthModal(false);
    }, [user]);

    // ✨ AMÉLIORÉ: Récupère le profil avec la date de création
    useEffect(() => {
        if (!id || !user) return;

        const fetchData = async () => {
            setLoading(true);

            // 1. Fetch Profile (avec created_at)
            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("*, created_at") // Ajout de created_at
                .eq("id", id)
                .single();
            if (profileError) console.log("Erreur profil:", profileError.message);
            setProfile(profileData);

            // 2. Fetch Products (inchangé)
            const { data: productsData, error: productsError } = await supabase
                .from("product")
                .select("id, title, price, image_url")
                .eq("user_id", id);
            if (productsError) console.log("Erreur produits:", productsError.message);
            setProducts(productsData || []);

            // 3. Fetch Ratings (inchangé, mais la logique reste solide)
            const { data: ratingsData, error: ratingsError } = await supabase
                .from("ratings_sellers")
                .select("rating")
                .eq("seller_id", id);
            if (ratingsError) {
                console.log("Erreur évaluations:", ratingsError.message);
            } else if (ratingsData) {
                const validRatings = ratingsData.map(r => r.rating).filter(r => r !== null && r >= 1 && r <= 5) as number[];
                const count = validRatings.length;
                const avg = count > 0 ? validRatings.reduce((a, b) => a + b, 0) / count : 0;
                setRating(avg);
                setRatingCount(count);
            }

            setLoading(false);
        };

        fetchData();
    }, [id, user]);

    // Logique de tri (inchangée)
    const sortedProducts = React.useMemo(() => {
        const list = [...products];
        if (sortOption === 'price_asc') return list.sort((a, b) => a.price - b.price);
        if (sortOption === 'price_desc') return list.sort((a, b) => b.price - a.price);
        return list; // 'newest' est l'ordre par défaut de la DB
    }, [products, sortOption]);

    // ✨ NOUVEAU: Fonction pour basculer l'affichage de la bio
    const toggleBio = useCallback(() => {
        setIsBioExpanded(prev => !prev);
    }, []);

    // ✨ REFAIT: Composant d'En-tête de la liste
    const ListHeader = () => (
        <View style={styles.profileHeaderContainer}>
            {/* Section 1: Info Vendeur */}
            <View style={styles.userInfoSection}>
                <Image
                    source={{ uri: profile?.avatar_url || 'https://placehold.co/100x100/F5F5F5/888?text=Profile' }}
                    style={styles.avatar}
                />
                <View style={styles.userInfoText}>
                    <Text style={styles.username}>{profile?.username}</Text>
                    {profile?.full_name && <Text style={styles.fullName}>{profile.full_name}</Text>}
                    {profile?.created_at && <Text style={styles.joinDate}>{formatJoinDate(profile.created_at)}</Text>}
                </View>
            </View>

            {/* Section 2: Bio Extensible */}
            {profile?.bio && (
                <View style={styles.bioContainer}>
                    <Text style={styles.bioText} numberOfLines={isBioExpanded ? undefined : 3}>
                        {profile.bio}
                    </Text>
                    {profile.bio.length > 100 && ( // Affiche le bouton si le texte est long
                        <TouchableOpacity onPress={toggleBio}>
                            <Text style={styles.readMoreText}>{isBioExpanded ? "Voir moins" : "Voir plus"}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Section 3: Boutons d'Action */}
            <View style={styles.actionsContainer}>
                <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]}>
                    <Text style={styles.actionButtonTextPrimary}>Suivre</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]}>
                    <Text style={styles.actionButtonTextSecondary}>Contacter</Text>
                </TouchableOpacity>
            </View>


            {/* Section 4: Statistiques avec icônes */}
            <View style={styles.statsBar}>
                <View style={styles.statBox}>
                    <Ionicons name="pricetag-outline" size={22} color="#555" />
                    <Text style={styles.statNumber}>{products.length}</Text>
                    <Text style={styles.statLabel}>Articles</Text>
                </View>
                <View style={styles.statSeparator} />
                <View style={styles.statBox}>
                    <Ionicons name="star-outline" size={22} color="#555" />
                    <StarRating rating={rating} count={ratingCount} />
                    <Text style={styles.statLabel}>{ratingCount > 0 ? `${rating.toFixed(1)} / 5` : 'Aucun avis'}</Text>
                </View>
            </View>

            {/* Section 5: Options de Tri (style légèrement ajusté) */}
            <View style={styles.sortContainer}>
                <Text style={styles.sortTitle}>ARTICLES ({products.length})</Text>
                {/* Le composant SortButton et sa logique sont inchangés et restent en dehors */}
            </View>

            {products.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                        {profile?.username} n'a pas encore d'articles en vente.
                    </Text>
                </View>
            )}
        </View>
    );

    // Affichages de chargement et d'erreur (inchangés)
    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={SAFFRON_YELLOW} /></View>;
    }
    if (!profile) {
        return <View style={styles.center}><Text style={styles.errorText}>Ce profil est introuvable.</Text></View>;
    }

    return (
        <>
            <AuthModal visible={showAuthModal} onClose={() => router.replace('/')} />
            <FlatList
                data={sortedProducts}
                keyExtractor={(item) => item.id}
                numColumns={NUM_COLUMNS}
                ListHeaderComponent={ListHeader}
                renderItem={({ item }) => (
                    <View style={styles.productCardWrapper}>
                        <ProductCard
                            product={item}
                            onPress={() => router.push(`/product/${item.id}`)}
                        />
                    </View>
                )}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.row}
                // Ajout d'un footer pour les options de tri
                ListFooterComponent={
                    <View style={styles.sortOptionsContainer}>
                        <SortButton label="Nouveautés" option="newest" current={sortOption} onPress={setSortOption} />
                        <SortButton label="Prix +" option="price_asc" current={sortOption} onPress={setSortOption} />
                        <SortButton label="Prix -" option="price_desc" current={sortOption} onPress={setSortOption} />
                    </View>
                }
            />
        </>
    );
}

// Le composant SortButton reste nécessaire
const SortButton = ({ label, option, current, onPress }: { label: string, option: SortOption, current: SortOption, onPress: (opt: SortOption) => void }) => (
    <TouchableOpacity
        style={[styles.sortButton, current === option && styles.sortButtonActive]}
        onPress={() => onPress(option)}
    >
        <Text style={[styles.sortButtonText, current === option && styles.sortButtonTextActive]}>
            {label}
        </Text>
    </TouchableOpacity>
);

// ✨ STYLES REFAITS ET AJOUTÉS
const styles = StyleSheet.create({
    // --- Styles généraux ---
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#f9f9f9' },
    errorText: { fontSize: 16, color: '#333' },
    listContent: { paddingBottom: 120, backgroundColor: '#F9F9F9' },

    // --- En-tête de Profil ---
    profileHeaderContainer: {
        backgroundColor: '#FFFFFF',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    userInfoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginRight: 20,
        borderWidth: 3,
        borderColor: '#f0f0f0',
    },
    userInfoText: {
        flex: 1,
    },
    username: {
        fontSize: 22,
        fontWeight: "bold",
        color: '#333',
    },
    fullName: {
        fontSize: 14,
        color: "#999",
        marginTop: 2,
    },
    joinDate: {
        fontSize: 13,
        color: '#aaa',
        marginTop: 5,
    },

    // --- Section Bio ---
    bioContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    bioText: {
        fontSize: 14,
        color: "#555",
        lineHeight: 21,
    },
    readMoreText: {
        color: SAFFRON_YELLOW,
        fontWeight: 'bold',
        marginTop: 5,
    },

    // --- Section Actions ---
    actionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonPrimary: {
        backgroundColor: SAFFRON_YELLOW,
        marginRight: 10,
    },
    actionButtonTextPrimary: {
        color: '#333',
        fontWeight: '700',
        fontSize: 15,
    },
    actionButtonSecondary: {
        backgroundColor: '#F0F0F0',
    },
    actionButtonTextSecondary: {
        color: '#444',
        fontWeight: '600',
        fontSize: 15,
    },

    // --- Barres de Statistiques ---
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
        gap: 5, // Ajoute un espace entre les éléments
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 12,
        color: '#999',
    },
    statSeparator: {
        width: 1,
        backgroundColor: '#F0F0F0',
    },
    starContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ratingCountText: {
        fontSize: 12,
        color: '#999',
        marginLeft: 5,
    },

    // --- Section Tri et Titre ---
    sortContainer: {
        paddingHorizontal: GRID_PADDING,
        paddingTop: 15,
        backgroundColor: '#F9F9F9',
    },
    sortTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#777',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    sortOptionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: GRID_PADDING,
        gap: 10,
        backgroundColor: '#F9F9F9'
    },
    sortButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    sortButtonActive: {
        backgroundColor: SAFFRON_YELLOW,
        borderColor: SAFFRON_YELLOW,
    },
    sortButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    sortButtonTextActive: {
        color: '#333',
        fontWeight: '700',
    },

    // --- Grille de produits ---
    row: { justifyContent: 'flex-start', paddingHorizontal: GRID_PADDING, gap: ITEM_MARGIN },
    productCardWrapper: { width: itemSize, marginBottom: 10 },
    emptyState: { padding: 40, alignItems: 'center', backgroundColor: '#FFFFFF' },
    emptyStateText: { fontSize: 16, color: '#888' },
});