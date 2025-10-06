import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';ì
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const SENEGAL_LOCATIONS = [
  { name: "Dakar", lat: 14.6928, lng: -17.4467 },
  { name: "Plateau", lat: 14.6708, lng: -17.4395 },
  { name: "Médina", lat: 14.6765, lng: -17.4515 },
  { name: "Yoff", lat: 14.7539, lng: -17.4731 },
  { name: "Sacré-Coeur", lat: 14.7306, lng: -17.4640 },
  { name: "Almadies", lat: 14.7447, lng: -17.5264 },
  { name: "Ngor", lat: 14.7587, lng: -17.5180 },
  { name: "Ouakam", lat: 14.7289, lng: -17.4922 },
  { name: "Point E", lat: 14.7019, lng: -17.4644 },
  { name: "Mermoz", lat: 14.7089, lng: -17.4558 },
  { name: "Fann", lat: 14.7056, lng: -17.4739 },
  { name: "Liberté", lat: 14.7086, lng: -17.4656 },
  { name: "HLM", lat: 14.7085, lng: -17.4520 },
  { name: "Grand Dakar", lat: 14.7089, lng: -17.4495 },
  { name: "Pikine", lat: 14.7549, lng: -17.3985 },
  { name: "Guédiawaye", lat: 14.7692, lng: -17.4056 },
  { name: "Parcelles Assainies", lat: 14.7642, lng: -17.4314 },
  { name: "Rufisque", lat: 14.7167, lng: -17.2667 },
  { name: "Thiès", lat: 14.7886, lng: -16.9260 },
  { name: "Kaolack", lat: 14.1592, lng: -16.0729 },
  { name: "Saint-Louis", lat: 16.0179, lng: -16.4817 },
  { name: "Mbour", lat: 14.4198, lng: -16.9639 },
  { name: "Diourbel", lat: 14.6574, lng: -16.2335 },
  { name: "Ziguinchor", lat: 12.5681, lng: -16.2717 },
];

const CATEGORIES = ['Mode', 'Électronique', 'Maison', 'Sport', 'Beauté', 'Autres'];

export default function SellScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: '',
    price: '',
    description: '',
    whatsappNumber: '',
    category: '',
    zone: '',
    latitude: 0,
    longitude: 0,
  });

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Limite atteinte', 'Vous pouvez ajouter maximum 5 images');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder aux photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const selectZone = (location: typeof SENEGAL_LOCATIONS[0]) => {
    setForm({
      ...form,
      zone: location.name,
      latitude: location.lat,
      longitude: location.lng,
    });
    setShowZoneModal(false);
  };

  const selectCategory = (category: string) => {
    setForm({ ...form, category });
    setShowCategoryModal(false);
  };

  const uploadImages = async (productId: string) => {
    const uploadPromises = images.map(async (imageUri, index) => {
      try {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        const fileName = `${productId}_${Date.now()}_${index}.jpg`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, decode(base64), {
            contentType: 'image/jpeg',
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        await supabase.from('product_images').insert({
          product_id: productId,
          image_url: publicUrlData.publicUrl,
        });
      } catch (error) {
        console.error('Erreur upload image:', error);
      }
    });

    await Promise.all(uploadPromises);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour vendre');
      return;
    }

    if (!form.title || !form.price || !form.zone || !form.category) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (images.length === 0) {
      Alert.alert('Erreur', 'Ajoutez au moins une photo de votre produit');
      return;
    }

    const fullNumber = '+221' + form.whatsappNumber.trim();
    if (form.whatsappNumber && !/^\+221\d{9}$/.test(fullNumber)) {
      Alert.alert('Erreur', 'Numéro WhatsApp invalide (ex: 771234567)');
      return;
    }

    setLoading(true);

    try {
      const { data: productData, error: productError } = await supabase
        .from('product')
        .insert({
          title: form.title.trim(),
          name: form.title.trim(),
          price: parseFloat(form.price),
          description: form.description.trim(),
          user_id: user.id,
          whatsapp_number: form.whatsappNumber ? fullNumber : null,
          category: form.category,
          zone: form.zone,
          latitude: form.latitude,
          longitude: form.longitude,
        })
        .select()
        .single();

      if (productError) throw productError;

      await uploadImages(productData.id);

      Alert.alert(
        'Succès',
        'Votre produit a été publié avec succès !',
        [
          {
            text: 'OK',
            onPress: () => router.push('/'),
          },
        ]
      );

      setForm({
        title: '',
        price: '',
        description: '',
        whatsappNumber: '',
        category: '',
        zone: '',
        latitude: 0,
        longitude: 0,
      });
      setImages([]);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendre un article</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos *</Text>
          <Text style={styles.sectionSubtitle}>Ajoutez jusqu'à 5 photos</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Ionicons name="camera" size={32} color="#6B7280" />
              <Text style={styles.addImageText}>Ajouter</Text>
            </TouchableOpacity>

            {images.map((uri, index) => (
              <View key={index} style={styles.imagePreview}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Titre */}
        <View style={styles.section}>
          <Text style={styles.label}>Titre *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: iPhone 13 Pro Max"
            value={form.title}
            onChangeText={(text) => setForm({ ...form, title: text })}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Catégorie */}
        <View style={styles.section}>
          <Text style={styles.label}>Catégorie *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={[styles.selectText, !form.category && styles.placeholder]}>
              {form.category || 'Sélectionner une catégorie'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Prix */}
        <View style={styles.section}>
          <Text style={styles.label}>Prix (FCFA) *</Text>
          <View style={styles.priceInput}>
            <TextInput
              style={styles.input}
              placeholder="10000"
              value={form.price}
              onChangeText={(text) => setForm({ ...form, price: text.replace(/[^0-9]/g, '') })}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.currencyText}>FCFA</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Décrivez votre article (état, taille, couleur...)"
            value={form.description}
            onChangeText={(text) => setForm({ ...form, description: text })}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Zone */}
        <View style={styles.section}>
          <Text style={styles.label}>Localisation *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowZoneModal(true)}
          >
            <View style={styles.selectContent}>
              <Ionicons name="location" size={20} color={form.zone ? "#F6C445" : "#6B7280"} />
              <Text style={[styles.selectText, !form.zone && styles.placeholder]}>
                {form.zone || 'Sélectionner votre zone'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* WhatsApp */}
        <View style={styles.section}>
          <Text style={styles.label}>WhatsApp (optionnel)</Text>
          <View style={styles.phoneContainer}>
            <View style={styles.phonePrefix}>
              <Text style={styles.phonePrefixText}>+221</Text>
            </View>
            <TextInput
              style={[styles.input, styles.phoneInput]}
              placeholder="771234567"
              value={form.whatsappNumber}
              onChangeText={(text) => setForm({ ...form, whatsappNumber: text.replace(/[^0-9]/g, '') })}
              keyboardType="phone-pad"
              maxLength={9}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Bouton publier */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#1C2B49" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#1C2B49" />
              <Text style={styles.submitButtonText}>Publier</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Catégories */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Catégorie</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.modalItem,
                    form.category === category && styles.modalItemActive,
                  ]}
                  onPress={() => selectCategory(category)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      form.category === category && styles.modalItemTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                  {form.category === category && (
                    <Ionicons name="checkmark" size={20} color="#F6C445" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Zones */}
      <Modal visible={showZoneModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Localisation</Text>
              <TouchableOpacity onPress={() => setShowZoneModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {SENEGAL_LOCATIONS.map((location) => (
                <TouchableOpacity
                  key={location.name}
                  style={[
                    styles.modalItem,
                    form.zone === location.name && styles.modalItemActive,
                  ]}
                  onPress={() => selectZone(location)}
                >
                  <View style={styles.locationItem}>
                    <Ionicons
                      name="location"
                      size={18}
                      color={form.zone === location.name ? "#F6C445" : "#6B7280"}
                    />
                    <Text
                      style={[
                        styles.modalItemText,
                        form.zone === location.name && styles.modalItemTextActive,
                      ]}
                    >
                      {location.name}
                    </Text>
                  </View>
                  {form.zone === location.name && (
                    <Ionicons name="checkmark" size={20} color="#F6C445" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  priceInput: {
    position: 'relative',
  },
  currencyText: {
    position: 'absolute',
    right: 16,
    top: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  phoneContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  phonePrefix: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phonePrefixText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  phoneInput: {
    flex: 1,
  },
  selectButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectText: {
    fontSize: 15,
    color: '#1F2937',
  },
  placeholder: {
    color: '#9CA3AF',
  },
  imagesScroll: {
    flexDirection: 'row',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addImageText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '500',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginRight: 12,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButton: {
    backgroundColor: '#F6C445',
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C2B49',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemActive: {
    backgroundColor: '#FEF3C7',
  },
  modalItemText: {
    fontSize: 15,
    color: '#1F2937',
  },
  modalItemTextActive: {
    fontWeight: '600',
    color: '#1F2937',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});