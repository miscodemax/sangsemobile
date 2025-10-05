import AuthModal from "./authModal"; // ✅ ton modal d'authentification
import { useAuth } from "@/context/authContext"; // ✅ utilise ton AuthContext
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabaseClient";
import React, { useState } from "react";
import {
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

interface Product {
    id: string | number;
    name?: string;
    title?: string;
    description?: string;
    price: number;
    image?: string;
    image_url?: string;
    category?: string;
    created_at?: string;
    seller?: string;
    location?: string;
    condition?: string;
    product_like?: { count: number }[];
}

interface ProductCardProps {
    product: Product;
    onPress: () => void;
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
    const { user } = useAuth(); // ✅ récupère l'utilisateur connecté
    const [liked, setLiked] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const productName = product.name || product.title || "Sans titre";
    const productImage = product.image || product.image_url;
    const likesCount = product.product_like?.[0]?.count || 0;

    const formatPrice = (price: number) => {
        if (price >= 1000000) return `${(price / 1000000).toFixed(1)}M`;
        if (price >= 1000) return `${(price / 1000).toFixed(0)}k`;
        return `${price}`;
    };

    const getTimeAgo = (dateString?: string) => {
        if (!dateString) return "";
        const now = new Date();
        const created = new Date(dateString);
        const diff = Math.floor((now.getTime() - created.getTime()) / 1000);
        if (diff < 3600) return "Nouveau";
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}j`;
        return `${Math.floor(diff / 604800)}sem`;
    };

    const handleLike = async (e: any) => {
        e.stopPropagation();

        // 🧠 Vérifie la connexion via le contexte
        if (!user) {
            setShowAuthModal(true); // ✅ Ouvre le AuthModal
            return;
        }

        // ❤️ Toggle du like
        const newLiked = !liked;
        setLiked(newLiked);

        try {
            if (newLiked) {
                const { error } = await supabase.from("product_like").insert([
                    {
                        product_id: product.id,
                        user_id: user.id,
                    },
                ]);
                if (error) console.error("Erreur like:", error);
            } else {
                const { error } = await supabase
                    .from("product_like")
                    .delete()
                    .eq("product_id", product.id)
                    .eq("user_id", user.id);
                if (error) console.error("Erreur unlike:", error);
            }
        } catch (err) {
            console.error("Erreur requête like:", err);
        }
    };

    const isNew = product.created_at && getTimeAgo(product.created_at) === "Nouveau";

    return (
        <>
            {/* --- 🛍️ Carte du produit --- */}
            <TouchableOpacity
                style={styles.card}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={styles.imageContainer}>
                    {imageError || !productImage ? (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name="image-outline" size={32} color="#D1D5DB" />
                        </View>
                    ) : (
                        <Image
                            source={{ uri: productImage }}
                            style={styles.image}
                            resizeMode="cover"
                            onError={() => setImageError(true)}
                        />
                    )}

                    {isNew && (
                        <View style={styles.newBadge}>
                            <Ionicons name="flash" size={10} color="#FFF" />
                            <Text style={styles.newText}>New</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.likeButton}
                        onPress={handleLike}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={liked ? "heart" : "heart-outline"}
                            size={18}
                            color={liked ? "#EF4444" : "#FFF"}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <Text style={styles.name} numberOfLines={2}>
                        {productName}
                    </Text>

                    <View style={styles.footer}>
                        <View style={styles.priceRow}>
                            <Text style={styles.price}>{formatPrice(product.price)}</Text>
                            <Text style={styles.currency}>FCFA</Text>
                        </View>

                        {likesCount > 0 && (
                            <View style={styles.likesContainer}>
                                <Ionicons name="heart" size={10} color="#EF4444" />
                                <Text style={styles.likesCount}>{likesCount}</Text>
                            </View>
                        )}
                    </View>

                    {product.location && (
                        <View style={styles.locationRow}>
                            <Ionicons name="location" size={10} color="#9CA3AF" />
                            <Text style={styles.location} numberOfLines={1}>
                                {product.location}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            {/* --- 🔐 Modal d’authentification intégré --- */}
            <AuthModal
                visible={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    imageContainer: {
        width: "100%",
        height: CARD_WIDTH * 1.15,
        position: "relative",
        backgroundColor: "#F9FAFB",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    imagePlaceholder: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
    },
    newBadge: {
        position: "absolute",
        top: 10,
        left: 10,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#10B981",
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 3,
    },
    newText: {
        fontSize: 9,
        fontWeight: "800",
        color: "#FFF",
        textTransform: "uppercase",
    },
    likeButton: {
        position: "absolute",
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    content: { padding: 12 },
    name: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 8,
        lineHeight: 18,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 6,
    },
    priceRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    price: { fontSize: 18, fontWeight: "800", color: "#F6C445" },
    currency: { fontSize: 11, fontWeight: "600", color: "#F6C445" },
    likesContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        backgroundColor: "#FEE2E2",
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 12,
    },
    likesCount: { fontSize: 10, color: "#EF4444", fontWeight: "700" },
    locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
    location: { fontSize: 10, color: "#9CA3AF", fontWeight: "500", flex: 1 },
});
