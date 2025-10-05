import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Image, ScrollView, View } from "react-native";
import { ActivityIndicator, Button, Card, Chip, Text, TextInput } from "react-native-paper";
import AuthModal from "@/app/composants/authModal";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
export default function EditProductScreen() {
    const { id } = useLocalSearchParams(); // Récupère l'ID du produit
    const router = useRouter();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [visible, setVisible] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [category, setCategory] = useState("");
    const [form, setForm] = useState({
        title: "",
        price: "",
        description: "",
        zone: "",
        whatsapp: "",
    });

    const categories = ["Vêtements", "Chaussures", "Accessoires", "Beauté", "Maison", "Électronique"];

    const handleChange = (name: string, value: string) => {
        setForm({ ...form, [name]: value });
    };

    // Récupérer le produit
    const fetchProduct = async () => {
        try {
            const { data, error } = await supabase.from("product").select("*").eq("id", id).single();
            if (error) throw error;
            if (!data) return Alert.alert("Erreur", "Produit introuvable");

            if (user?.id !== data.user_id) {
                Alert.alert("Accès refusé", "Vous ne pouvez modifier que vos produits.");
                router.back();
                return;
            }

            setForm({
                title: data.title,
                price: String(data.price),
                description: data.description || "",
                zone: data.zone || "",
                whatsapp: data.whatsapp_number?.replace("+221", "") || "",
            });
            setImage(data.image_url);
            setCategory(data.category || "");
        } catch (err: any) {
            Alert.alert("Erreur", err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchProduct();
    }, [user]);

    // Sélection image
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    // Upload image Supabase
    const uploadImage = async () => {
        if (!image?.startsWith("file://")) return image; // Déjà hébergée

        const fileExt = image.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;
        const img = await fetch(image);
        const blob = await img.blob();

        const { error } = await supabase.storage.from("product-images").upload(filePath, blob);
        if (error) throw error;

        const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
        return data.publicUrl;
    };

    // Mise à jour
    const handleUpdate = async () => {
        if (!user) {
            setVisible(true);
            return;
        }

        if (!form.title || !form.price || !category) {
            Alert.alert("Erreur", "Veuillez remplir tous les champs requis.");
            return;
        }

        try {
            setUpdating(true);
            const imageUrl = await uploadImage();

            const { error } = await supabase
                .from("product")
                .update({
                    title: form.title,
                    description: form.description,
                    price: parseFloat(form.price),
                    category,
                    zone: form.zone,
                    whatsapp_number: "+221" + form.whatsapp,
                    image_url: imageUrl,
                })
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) throw error;

            Alert.alert("Succès 🎉", "Le produit a été mis à jour !");
            router.back();
        } catch (err: any) {
            Alert.alert("Erreur", err.message);
        } finally {
            setUpdating(false);
        }
    };

    if (!user) return <AuthModal visible={true} onClose={() => setVisible(false)} />;
    if (loading)
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator animating={true} />
            </View>
        );

    return (
        <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "white" }}>
            <Text variant="headlineMedium" style={{ marginBottom: 20 }}>
                ✏️ Modifier le produit
            </Text>

            <TextInput
                label="Titre"
                value={form.title}
                onChangeText={(text) => handleChange("title", text)}
                style={{ marginBottom: 10 }}
            />

            <TextInput
                label="Prix (FCFA)"
                keyboardType="numeric"
                value={form.price}
                onChangeText={(text) => handleChange("price", text)}
                style={{ marginBottom: 10 }}
            />

            <TextInput
                label="Description"
                multiline
                value={form.description}
                onChangeText={(text) => handleChange("description", text)}
                style={{ marginBottom: 10 }}
            />

            <Text variant="titleMedium" style={{ marginVertical: 10 }}>
                Catégorie
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {categories.map((cat) => (
                    <Chip
                        key={cat}
                        selected={category === cat}
                        onPress={() => setCategory(cat)}
                        style={{ marginBottom: 5 }}
                    >
                        {cat}
                    </Chip>
                ))}
            </View>

            <TextInput
                label="Zone"
                value={form.zone}
                onChangeText={(text) => handleChange("zone", text)}
                style={{ marginVertical: 10 }}
            />

            <TextInput
                label="Numéro WhatsApp (sans +221)"
                keyboardType="numeric"
                value={form.whatsapp}
                onChangeText={(text) => handleChange("whatsapp", text)}
                style={{ marginBottom: 10 }}
            />

            <Button
                icon="image"
                mode="outlined"
                onPress={pickImage}
                style={{ marginBottom: 10 }}
            >
                {image ? "Changer l’image" : "Choisir une image"}
            </Button>

            {image && (
                <Card style={{ marginBottom: 15 }}>
                    <Image source={{ uri: image }} style={{ height: 200, borderRadius: 8 }} />
                </Card>
            )}

            {updating ? (
                <ActivityIndicator animating={true} />
            ) : (
                <Button mode="contained" onPress={handleUpdate}>
                    Enregistrer les modifications
                </Button>
            )}

            <AuthModal visible={visible} onClose={() => setVisible(false)} />
        </ScrollView>
    );
}
