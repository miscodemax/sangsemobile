import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, Image, ScrollView, View } from "react-native";
import { ActivityIndicator, Button, Card, Chip, Text, TextInput } from "react-native-paper";
import AuthModal from "../composants/authModal"; // ton modal d’auth

export default function VendreScreen() {
    const { user } = useAuth();
    const [visible, setVisible] = useState(false); // pour AuthModal
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [category, setCategory] = useState("");
    const [form, setForm] = useState({
        title: "",
        price: "",
        description: "",
        zone: "",
        whatsapp: "",
    });

    const categories = [
        "Vêtements",
        "Chaussures",
        "Accessoires",
        "Beauté",
        "Maison",
        "Électronique",
    ];

    const handleChange = (name: string, value: string) => {
        setForm({ ...form, [name]: value });
    };

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

    // Upload vers Supabase Storage
    const uploadImage = async () => {
        if (!image) return null;
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

    const handleSubmit = async () => {
        if (!user) {
            setVisible(true);
            return;
        }

        if (!form.title || !form.price || !form.description || !category) {
            Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires.");
            return;
        }

        setLoading(true);
        try {
            const imageUrl = image ? await uploadImage() : null;

            const { error } = await supabase.from("product").insert({
                title: form.title,
                description: form.description,
                price: parseFloat(form.price),
                category,
                zone: form.zone || "Dakar",
                whatsapp_number: "+221" + form.whatsapp,
                image_url: imageUrl,
                user_id: user?.id,
            });

            if (error) throw error;

            Alert.alert("Succès 🎉", "Ton produit a été ajouté !");
            setForm({
                title: "",
                price: "",
                description: "",
                zone: "",
                whatsapp: "",
            });
            setImage(null);
            setCategory("");
        } catch (err: any) {
            Alert.alert("Erreur", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={{ flex: 1, padding: 20, backgroundColor: "white" }}>
            <Text variant="headlineMedium" style={{ marginBottom: 20 }}>
                🛍️ Vendre un produit
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

            {/* Image */}
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

            {loading ? (
                <ActivityIndicator animating={true} />
            ) : (
                <Button mode="contained" onPress={handleSubmit}>
                    Publier le produit
                </Button>
            )}

            {/* Modal Auth */}
            <AuthModal visible={visible} onClose={() => setVisible(false)} />
        </ScrollView>
    );
}
