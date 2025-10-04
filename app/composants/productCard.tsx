import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Animated,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type ProductCardProps = {
    id: number;
    title: string;
    price: number;
    image_url?: string;
    seller?: string;
    location?: string;
    isLiked?: boolean;
    condition?: string;
};

export default function ProductCard({
    id,
    title,
    price,
    image_url,
    seller = "Vendeur",
    location = "Dakar",
    isLiked = false,
    condition = "Comme neuf",
}: ProductCardProps) {
    const router = useRouter();
    const [liked, setLiked] = useState(isLiked);
    const [scaleValue] = useState(new Animated.Value(1));

    const handlePressIn = () => {
        Animated.spring(scaleValue, {
            toValue: 0.97,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleValue, {
            toValue: 1,
            friction: 3,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const handleLike = () => {
        setLiked(!liked);
        Animated.sequence([
            Animated.timing(scaleValue, {
                toValue: 1.1,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(scaleValue, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
        ]).start();
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ scale: scaleValue }],
                },
            ]}
        >
            <TouchableOpacity
                activeOpacity={1}
                onPress={() => router.push(`/product/${id}`)}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                {/* Image du produit */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{
                            uri:
                                image_url ||
                                "https://via.placeholder.com/400x400.png?text=Produit",
                        }}
                        style={styles.image}
                        resizeMode="cover"
                    />

                    {/* Badge condition */}
                    <View style={styles.conditionBadge}>
                        <Text style={styles.conditionText}>{condition}</Text>
                    </View>

                    {/* Bouton favori */}
                    <TouchableOpacity
                        style={styles.likeButton}
                        onPress={handleLike}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={liked ? "heart" : "heart-outline"}
                            size={22}
                            color={liked ? "#EF4444" : "#fff"}
                        />
                    </TouchableOpacity>

                    {/* Overlay gradient */}
                    <View style={styles.imageOverlay} />
                </View>

                {/* Informations produit */}
                <View style={styles.infoContainer}>
                    {/* Titre */}
                    <Text style={styles.title} numberOfLines={2}>
                        {title}
                    </Text>

                    {/* Prix */}
                    <View style={styles.priceContainer}>
                        <Text style={styles.price}>{price.toLocaleString()} FCFA</Text>
                        <View style={styles.priceBadge}>
                            <Ionicons name="flash" size={14} color="#FACC15" />
                        </View>
                    </View>

                    {/* Informations vendeur et localisation */}
                    <View style={styles.metaContainer}>
                        <View style={styles.sellerInfo}>
                            <View style={styles.avatar}>
                                <Ionicons name="person" size={12} color="#78716C" />
                            </View>
                            <Text style={styles.sellerName} numberOfLines={1}>
                                {seller}
                            </Text>
                        </View>

                        <View style={styles.locationInfo}>
                            <Ionicons name="location-sharp" size={12} color="#78716C" />
                            <Text style={styles.locationText}>{location}</Text>
                        </View>
                    </View>

                    {/* Indicateur de popularité */}
                    <View style={styles.popularityContainer}>
                        <View style={styles.viewsInfo}>
                            <Ionicons name="eye-outline" size={14} color="#78716C" />
                            <Text style={styles.viewsText}>234</Text>
                        </View>
                        <View style={styles.likesInfo}>
                            <Ionicons name="heart-outline" size={14} color="#78716C" />
                            <Text style={styles.likesText}>12</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#fff",
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        marginBottom: 16,
    },
    imageContainer: {
        position: "relative",
        width: "100%",
        height: 220,
        backgroundColor: "#F5F5F4",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    imageOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        backgroundColor: "transparent",
    },
    conditionBadge: {
        position: "absolute",
        top: 12,
        left: 12,
        backgroundColor: "#FACC15",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    conditionText: {
        color: "#292524",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.3,
    },
    likeButton: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(10px)",
    },
    infoContainer: {
        padding: 16,
    },
    title: {
        fontSize: 15,
        fontWeight: "600",
        color: "#292524",
        lineHeight: 20,
        marginBottom: 10,
        letterSpacing: -0.2,
    },
    priceContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 8,
    },
    price: {
        fontSize: 20,
        fontWeight: "800",
        color: "#292524",
        letterSpacing: -0.5,
    },
    priceBadge: {
        backgroundColor: "#FEF3C7",
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    metaContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: "#F5F5F4",
    },
    sellerInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
        marginRight: 8,
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#FEF3C7",
        alignItems: "center",
        justifyContent: "center",
    },
    sellerName: {
        fontSize: 13,
        color: "#57534E",
        fontWeight: "500",
        flex: 1,
    },
    locationInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    locationText: {
        fontSize: 12,
        color: "#78716C",
        fontWeight: "500",
    },
    popularityContainer: {
        flexDirection: "row",
        gap: 16,
    },
    viewsInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    viewsText: {
        fontSize: 12,
        color: "#78716C",
        fontWeight: "500",
    },
    likesInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    likesText: {
        fontSize: 12,
        color: "#78716C",
        fontWeight: "500",
    },
});