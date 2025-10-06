import React from "react";
import { Alert, Platform } from "react-native";
import { Button, Input, YStack, Spinner } from "tamagui";
import CategorySelector from "./categorySelector";
import { uploadImage, insertProduct } from "@/lib/supabaseUploader";
import { useAuth } from "@/context/authContext";

type Props = {
  form: any;
  setForm: (f: any) => void;
  image: string | null;
  setImage: (uri: string | null) => void;
  category: string | null;
  setCategory: (value: string) => void;
  onSuccess?: () => void;
};

export default function ProductForm({ form, setForm, image, setImage, category, setCategory, onSuccess }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handleChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async () => {
    if (!user) return Alert.alert("Erreur", "Tu dois être connecté !");
    if (!form.title || !form.price || !form.description || !category) return Alert.alert("Erreur", "Tous les champs obligatoires doivent être remplis.");

    setLoading(true);
    try {
      const imageUrl = image ? await uploadImage(image) : null;
      await insertProduct({
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        category,
        zone: form.zone || "Dakar",
        whatsapp_number: "+221" + form.whatsapp,
        image_url: imageUrl,
        user_id: user.id,
      });
      Alert.alert("Succès 🎉", "Ton produit a été ajouté !");
      setForm({ title: "", price: "", description: "", zone: "", whatsapp: "" });
      setImage(null);
      setCategory(null);
      onSuccess?.();
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack space>
      <Input placeholder="Titre" value={form.title} onChangeText={(t) => handleChange("title", t)} />
      <Input placeholder="Prix (FCFA)" keyboardType="numeric" value={form.price} onChangeText={(t) => handleChange("price", t)} />
      <Input placeholder="Description" multiline value={form.description} onChangeText={(t) => handleChange("description", t)} />
      <CategorySelector selected={category} onSelect={setCategory} />
      <Input placeholder="Zone" value={form.zone} onChangeText={(t) => handleChange("zone", t)} />
      <Input placeholder="Numéro WhatsApp (sans +221)" keyboardType="numeric" value={form.whatsapp} onChangeText={(t) => handleChange("whatsapp", t)} />

      <Button onPress={handleSubmit} disabled={loading} style={{ position: "absolute", right: 20, bottom: Platform.OS === "ios" ? 30 : 20 }}>
        {loading ? <Spinner /> : "Publier"}
      </Button>
    </YStack>
  );
}
