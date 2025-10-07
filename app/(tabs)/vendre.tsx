import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import AuthModal from '../composants/authModal';

// Liste des catégories avec des icônes améliorées
const categories = [
    { value: 'vetement', label: 'Vêtements', icon: '👗' },
    { value: 'soins_et_astuces', label: 'Soins & Astuces', icon: '💄' },
    { value: 'maquillage', label: 'Maquillage', icon: '💋' },
    { value: 'artisanat', label: 'Artisanat', icon: '🎨' },
    { value: 'electronique', label: 'Électronique', icon: '📱' },
    { value: 'accessoire', label: 'Accessoires', icon: '👜' },
    { value: 'chaussure', label: 'Chaussures', icon: '👠' },
];

// Composant de champ de texte générique amélioré
const FormField = ({ label, error, children, isOptional = false }) => (
    <View style={styles.sectionContainer}>
        <Text style={styles.label}>{label} {!isOptional && <Text style={styles.required}>*</Text>}</Text>
        {children}
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

// Sélecteur de catégorie avec un design amélioré
const CategorySelector = ({ categories, selectedCategory, onSelect, error }) => (
    <View style={styles.sectionContainer}>
        <Text style={styles.label}>Catégorie <Text style={styles.required}>*</Text></Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
            {categories.map((cat) => (
                <TouchableOpacity
                    key={cat.value}
                    onPress={() => onSelect(cat.value)}
                    activeOpacity={0.8}
                    style={[styles.categoryCard, selectedCategory === cat.value && styles.categorySelected]}
                >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={styles.categoryText}>{cat.label}</Text>
                    {selectedCategory === cat.value && <Ionicons name="checkmark-circle" size={18} color="#F59E0B" style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
            ))}
        </ScrollView>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

// Picker d'images avec un design amélioré
const ImagePickerField = ({ images, setImages, error }) => {
    const pickImageFromLibrary = async () => {
        if (images.length >= 5) {
            Alert.alert('Limite atteinte', 'Vous pouvez ajouter jusqu\'à 5 images.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [4, 4],
            base64: false,
            quality: 0.8,
        });
        if (!result.canceled) {
            setImages([...images, result.assets[0].uri]);
        }
    };

    const takePhoto = async () => {
        if (images.length >= 5) {
            Alert.alert('Limite atteinte', 'Vous pouvez ajouter jusqu\'à 5 images.');
            return;
        }
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission refusée', 'Autorisez la caméra pour prendre une photo.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 4],
            quality: 0.8,
        });
        if (!result.canceled) {
            setImages([...images, result.assets[0].uri]);
        }
    };

    const setAsCover = (index: number) => {
        if (index === 0) return;
        const copy = [...images];
        const [picked] = copy.splice(index, 1);
        copy.unshift(picked);
        setImages(copy);
    };

    return (
        <View style={styles.sectionContainer}>
            <Text style={styles.label}>Photos <Text style={styles.required}>*</Text></Text>
            <Text style={styles.helperText}>La première photo sera la couverture. Astuce: bonne lumière = meilleures ventes.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroller}>
                {images.map((uri, i) => (
                    <View key={i} style={styles.imageContainer}>
                        <Image source={{ uri }} style={[styles.image, i === 0 && styles.coverImage]} />
                        <TouchableOpacity style={styles.removeBtn} onPress={() => setImages(images.filter((_, j) => j !== i))}>
                            <Ionicons name="close-circle" size={24} color="#374151" />
                        </TouchableOpacity>
                        {i !== 0 && (
                            <TouchableOpacity style={styles.coverBtn} onPress={() => setAsCover(i)}>
                                <Text style={styles.coverBtnText}>Couverture</Text>
                            </TouchableOpacity>
                        )}
                        {i === 0 && <View style={styles.coverBadge}><Text style={styles.coverBadgeText}>Couverture</Text></View>}
                    </View>
                ))}
                {images.length < 5 && (
                    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                        <TouchableOpacity style={styles.addImage} onPress={pickImageFromLibrary}>
                            <Ionicons name="image-outline" size={28} color="#6B7280" />
                            <Text style={styles.addText}>Galerie</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.addImage, { backgroundColor: '#fff8ef' }]} onPress={takePhoto}>
                            <Ionicons name="camera-outline" size={28} color="#6B7280" />
                            <Text style={styles.addText}>Appareil</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

// Composant Header moderne et spacieux
const TopHeader = ({ displayName, avatarUrl }) => {
    const initials = (displayName || '').split(' ')[0];
    return (
        <View style={styles.headerContainer}>
            <View style={styles.headerInner}>
                <View>
                    <Text style={styles.greeting}>Salut,</Text>
                    <Text style={styles.displayName}>{displayName || 'ami'}</Text>
                </View>
                <View style={styles.headerRight}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitials}>{initials || 'U'}</Text>
                        </View>
                    )}
                </View>
            </View>
            <Text style={styles.headerSubtitle}>Poster un article devrait être rapide et agréable — commençons !</Text>
        </View>
    );
};

// Composant principal avec des améliorations esthétiques
export default function SellScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [authVisible, setAuthVisible] = useState(false);
    const [form, setForm] = useState({
        title: '',
        price: '',
        description: '',
        whatsappNumber: '',
        category: '',
    });
    const [errors, setErrors] = useState({});
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFormValid, setIsFormValid] = useState(false);
    const [profile, setProfile] = useState<{ display_name?: string | null; avatar_url?: string | null } | null>(null);
    const [descCount, setDescCount] = useState(0);

    useEffect(() => { if (!user) setAuthVisible(true); }, [user]);
    useEffect(() => validateForm(), [form, images]);
    useEffect(() => {
        if (!user) return;
        // Try to read a profiles table to get a nicer display name / avatar if available
        let mounted = true;
        (async () => {
            try {
                const { data, error } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle();
                if (error) {
                    // silent fallback
                    return;
                }
                if (mounted && data) setProfile({ display_name: data.display_name, avatar_url: data.avatar_url });
            } catch (e) {
                // ignore
            }
        })();
        return () => { mounted = false; };
    }, [user]);

    useEffect(() => { setDescCount(form.description.length); }, [form.description]);

    const handleInputChange = (name: string, value: string) => {
        if (name === 'price') {
            // keep a clean numeric-only value in state but display formatted form
            const numeric = value.replace(/[^0-9]/g, '');
            setForm(prev => ({ ...prev, [name]: numeric }));
        } else if (name === 'whatsappNumber') {
            setForm(prev => ({ ...prev, [name]: value.replace(/[^0-9]/g, '') }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const prettyPrice = (priceStr: string) => {
        if (!priceStr) return '';
        return priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    const validateForm = () => {
        let newErrors: any = {};
        if (!form.title.trim()) newErrors.title = 'Le titre est obligatoire.';
        if (!form.price.trim()) newErrors.price = 'Le prix est obligatoire.';
        if (form.price && Number.isNaN(Number(form.price))) newErrors.price = 'Prix invalide.';
        if (!form.category) newErrors.category = 'La catégorie est obligatoire.';
        if (images.length === 0) newErrors.images = 'Ajoutez au moins une photo.';
        setErrors(newErrors);
        setIsFormValid(Object.keys(newErrors).length === 0);
    };

    // Fonction pour télécharger les images (optimisée, basée sur lecture base64)
    const uploadImages = async (imagesToUpload: string[], userId: string, onProgress?: (p: number) => void) => {
        const uploadedUrls: string[] = [];
        for (const [index, uri] of imagesToUpload.entries()) {
            if (onProgress) onProgress(Math.round((index / imagesToUpload.length) * 100));
            // read file as base64
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            const fileName = `${userId}-${Date.now()}-${index}.jpg`;
            const { error: uploadError } = await supabase.storage.from('product').upload(fileName, decode(base64), { contentType: 'image/jpeg' });
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('product').getPublicUrl(fileName);
            uploadedUrls.push(data.publicUrl);
            if (onProgress) onProgress(Math.round(((index + 1) / imagesToUpload.length) * 100));
        }
        return uploadedUrls;
    };

    const handleSubmit = async () => {
        Keyboard.dismiss();
        validateForm();
        if (!isFormValid || !user?.id) return;
        setLoading(true);
        try {
            // Small UX: confirm summary before uploading (quick check)
            const mainPreview = images[0] || '';
            // Upload
            let lastProgress = 0;
            const uploadedUrls = await uploadImages(images, user.id, (p) => {
                // only update if enough changed
                if (p - lastProgress >= 10) {
                    lastProgress = p;
                    // you could show a toast or set to state to render progress (omitted for brevity)
                }
            });
            const mainImage = uploadedUrls[0];
            const otherImages = uploadedUrls.slice(1);
            const { data: product, error: productError } = await supabase
                .from('product')
                .insert({
                    title: form.title,
                    price: parseFloat(form.price),
                    category: form.category,
                    description: form.description,
                    user_id: user.id,
                    image_url: mainImage,
                    whatsapp_number: form.whatsappNumber ? '+221' + form.whatsappNumber : null,
                })
                .select()
                .single();
            if (productError) throw productError;
            if (otherImages.length > 0) {
                const { error: imgError } = await supabase.from('product_images')
                    .insert(otherImages.map(url => ({ product_id: product.id, image_url: url })));
                if (imgError) throw imgError;
            }
            // success -> navigate to product
            // small UX: reset form quickly so user doesn't see stale data if they navigate back
            setForm({ title: '', price: '', description: '', whatsappNumber: '', category: '' });
            setImages([]);
            router.replace(`/product/${product.id}`);
        } catch (err: any) {
            console.error(err);
            setErrors({ submit: err.message || 'Erreur lors de la publication.' });
        } finally { setLoading(false); }
    };

    if (!user) return <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />;

    const displayName = profile?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name || user.user_metadata?.displayName || (user.email ? user.email.split('@')[0] : 'utilisateur');
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#FFFDF8" barStyle="dark-content" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <TopHeader displayName={displayName} avatarUrl={avatarUrl} />
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>✨ Vendre un article</Text>
                        <Text style={styles.sectionSubtitle}>Quelques étapes simples pour publier rapidement.</Text>

                        <ImagePickerField images={images} setImages={setImages} error={errors.images} />

                        <FormField label="Titre" error={errors.title}>
                            <TextInput
                                style={[styles.input, errors.title && styles.inputError]}
                                placeholder="Ex : Sac en cuir presque neuf"
                                value={form.title}
                                onChangeText={t => handleInputChange('title', t)}
                            />
                        </FormField>

                        <CategorySelector categories={categories} selectedCategory={form.category} onSelect={cat => handleInputChange('category', cat)} error={errors.category} />

                        <FormField label="Prix (FCFA)" error={errors.price}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Text style={styles.currency}>FCFA</Text>
                                <TextInput
                                    style={[styles.input, { flex: 1 }, errors.price && styles.inputError]}
                                    placeholder="5 000"
                                    keyboardType="numeric"
                                    value={prettyPrice(form.price)}
                                    onChangeText={p => handleInputChange('price', p)}
                                />
                            </View>
                        </FormField>

                        <FormField label="Description" isOptional>
                            <TextInput
                                style={[styles.input, { height: 120, textAlignVertical: 'top', paddingTop: 14 }]}
                                placeholder="Décrivez votre article: état, taille, défauts éventuels..."
                                multiline
                                maxLength={800}
                                value={form.description}
                                onChangeText={t => handleInputChange('description', t)}
                            />
                            <Text style={styles.helperText}>{descCount}/800</Text>
                        </FormField>

                        <FormField label="Numéro WhatsApp" isOptional>
                            <View style={styles.phoneContainer}>
                                <Text style={styles.prefix}>+221</Text>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                    placeholder="77 123 45 67"
                                    keyboardType="phone-pad"
                                    maxLength={9}
                                    value={form.whatsappNumber}
                                    onChangeText={t => handleInputChange('whatsappNumber', t)}
                                />
                            </View>
                        </FormField>

                        {errors.submit && <Text style={[styles.errorText, { textAlign: 'center', marginTop: 16 }]}>{errors.submit}</Text>}

                        <TouchableOpacity style={[styles.submit, (!isFormValid || loading) && styles.submitDisabled]} onPress={handleSubmit} disabled={!isFormValid || loading}>
                            {loading ? <ActivityIndicator color="#1C2B49" /> : <Text style={styles.submitText}>Mettre en vente</Text>}
                        </TouchableOpacity>

                        <View style={styles.tips}>
                            <Text style={styles.tipTitle}>Conseils rapides</Text>
                            <Text style={styles.tipItem}>• 3 photos minimum: face, détail, défaut si présent</Text>
                            <Text style={styles.tipItem}>• Prix réaliste = vente plus rapide</Text>
                            <Text style={styles.tipItem}>• Soyez honnête sur l'état</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Styles améliorés pour une meilleure apparence
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFDF8' },
    scrollContent: { padding: 20, paddingBottom: 120 },
    headerContainer: { marginBottom: 16, backgroundColor: '#FFF', padding: 16, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    greeting: { color: '#6B7280', fontSize: 14 },
    displayName: { fontSize: 20, fontWeight: '700', color: '#0f1724' },
    headerRight: { marginLeft: 12 },
    avatar: { width: 50, height: 50, borderRadius: 12 },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    avatarInitials: { color: '#1C2B49', fontWeight: '700' },
    headerSubtitle: { marginTop: 8, color: '#6B7280', fontSize: 13 },

    card: { backgroundColor: '#FFF', padding: 16, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

    sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1C2B49' },
    sectionSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6, marginBottom: 12 },

    sectionContainer: { marginBottom: 18 },
    label: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
    required: { color: '#EF4444' },
    helperText: { fontSize: 13, color: '#6B7280', marginBottom: 12, marginTop: -4 },
    input: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, height: 52, fontSize: 16, borderColor: '#E5E7EB', borderWidth: 1 },
    inputError: { borderColor: '#EF4444' },
    errorText: { color: '#EF4444', fontSize: 13, marginTop: 6 },
    imageScroller: { paddingVertical: 4 },
    addImage: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderStyle: 'dashed', borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
    addText: { fontSize: 13, color: '#6B7280', marginTop: 6, fontWeight: '500' },
    imageContainer: { position: 'relative', marginRight: 12 },
    image: { width: 100, height: 100, borderRadius: 12 },
    coverImage: { borderWidth: 2, borderColor: '#F59E0B' },
    removeBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 15, padding: 2 },
    coverBtn: { position: 'absolute', bottom: -8, left: 0, right: 0, alignItems: 'center', paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.04)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
    coverBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
    coverBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    coverBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    categoryCard: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1, marginRight: 10, flexDirection: 'row', alignItems: 'center' as const },
    categorySelected: { backgroundColor: '#FFFBEB', borderColor: '#F6C445', borderWidth: 1.5 },
    categoryIcon: { fontSize: 20 },
    categoryText: { fontWeight: '600', color: '#1F2937', marginLeft: 8 },

    phoneContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    prefix: { fontWeight: '600', color: '#1C2B49', fontSize: 16 },
    submit: { backgroundColor: '#F6C445', borderRadius: 12, justifyContent: 'center', alignItems: 'center', height: 52, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    submitDisabled: { backgroundColor: '#FDE68A', opacity: 0.9 },
    submitText: { fontWeight: 'bold', color: '#1C2B49', fontSize: 16 },

    currency: { fontWeight: '700', color: '#1C2B49' },

    tips: { marginTop: 18, backgroundColor: '#F8FAFF', padding: 12, borderRadius: 12 },
    tipTitle: { fontWeight: '700', color: '#0F1724', marginBottom: 6 },
    tipItem: { color: '#374151', fontSize: 13, marginBottom: 4 },
});