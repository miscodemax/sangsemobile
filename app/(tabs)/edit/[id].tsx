import AuthModal from '@/app/composants/authModal';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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

// Même liste de catégories que sur la page vendre
const categories = [
    { value: 'vetement', label: 'Vêtements', icon: '👗' },
    { value: 'soins_et_astuces', label: 'Soins & Astuces', icon: '💄' },
    { value: 'maquillage', label: 'Maquillage', icon: '💋' },
    { value: 'artisanat', label: 'Artisanat', icon: '🎨' },
    { value: 'electronique', label: 'Électronique', icon: '📱' },
    { value: 'accessoire', label: 'Accessoires', icon: '👜' },
    { value: 'chaussure', label: 'Chaussures', icon: '👠' },
];

const FormField = ({ label, error, children, isOptional = false }: any) => (
    <View style={styles.sectionContainer}>
        <Text style={styles.label}>
            {label} {!isOptional && <Text style={styles.required}>*</Text>}
        </Text>
        {children}
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

const CategorySelector = ({ categories, selectedCategory, onSelect, error }: any) => (
    <View style={styles.sectionContainer}>
        <Text style={styles.label}>
            Catégorie <Text style={styles.required}>*</Text>
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
            {categories.map((cat: any) => (
                <TouchableOpacity
                    key={cat.value}
                    onPress={() => onSelect(cat.value)}
                    activeOpacity={0.8}
                    style={[styles.categoryCard, selectedCategory === cat.value && styles.categorySelected]}
                >
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={styles.categoryText}>{cat.label}</Text>
                    {selectedCategory === cat.value && (
                        <Ionicons name="checkmark-circle" size={18} color="#F59E0B" style={{ marginLeft: 8 }} />
                    )}
                </TouchableOpacity>
            ))}
        </ScrollView>
        {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

// Réutilise l'UI d'ajout d'image mais adaptée à l'édition.
// images: array d'URI (peuvent être des URLs publiques ou des URI locales)
const ImagePickerField = ({ images, setImages, error }: any) => {
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
            <Text style={styles.label}>
                Photos <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.helperText}>La première photo sera la couverture. Vous pouvez ajouter jusqu'à 5 images.</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroller}>
                {images.map((uri: string, i: number) => (
                    <View key={i} style={styles.imageContainer}>
                        <Image source={{ uri }} style={[styles.image, i === 0 && styles.coverImage]} />
                        <TouchableOpacity style={styles.removeBtn} onPress={() => setImages(images.filter((_: any, j: number) => j !== i))}>
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

const TopHeader = ({ displayName, avatarUrl }: any) => {
    const initials = (displayName || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
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
            <Text style={styles.headerSubtitle}>Modifie ton annonce — les changements sont appliqués instantanément.</Text>
        </View>
    );
};

export default function EditScreen() {
    const router = useRouter();
    const params: any = useLocalSearchParams();
    const productId = params?.id || (router?.params as any)?.id;
    const { user } = useAuth();
    const [authVisible, setAuthVisible] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<any>({});
    const [profile, setProfile] = useState<any>(null);

    const [form, setForm] = useState({
        title: '',
        price: '',
        description: '',
        whatsappNumber: '',
        category: '',
    });
    // images: URIs (could be public URLs from storage or local filesystem URIs)
    const [images, setImages] = useState<string[]>([]);
    const [descCount, setDescCount] = useState(0);
    const [originalOtherImages, setOriginalOtherImages] = useState<string[]>([]); // for comparison

    // derived state: isFormValid computed from form + images (memoized)
    const validationResult = useMemo(() => {
        const newErrors: any = {};
        if (!form.title.trim()) newErrors.title = 'Le titre est obligatoire.';
        if (!form.price.trim()) newErrors.price = 'Le prix est obligatoire.';
        if (form.price && Number.isNaN(Number(form.price))) newErrors.price = 'Prix invalide.';
        if (!form.category) newErrors.category = 'La catégorie est obligatoire.';
        if (images.length === 0) newErrors.images = 'Ajoutez au moins une photo.';
        return { errors: newErrors, isValid: Object.keys(newErrors).length === 0 };
    }, [form, images]);

    // Keep a controlled effect to sync displayed errors (but don't run validation during render)
    useEffect(() => {
        setErrors(prev => {
            // avoid unnecessary setState if identical (shallow compare keys & values)
            const prevKeys = Object.keys(prev || {});
            const newKeys = Object.keys(validationResult.errors);
            if (prevKeys.length === newKeys.length && prevKeys.every(k => prev[k] === validationResult.errors[k])) {
                return prev;
            }
            return validationResult.errors;
        });
    }, [validationResult]);

    useEffect(() => {
        if (!user) setAuthVisible(true);
    }, [user]);

    useEffect(() => {
        if (!user) return;
        let mounted = true;
        (async () => {
            try {
                const { data, error } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle();
                if (!error && data && mounted) setProfile(data);
            } catch (e) {
                // ignore
            }
        })();
        return () => {
            mounted = false;
        };
    }, [user]);

    useEffect(() => {
        // load product
        if (!productId) {
            setLoading(false);
            return;
        }
        let mounted = true;
        (async () => {
            try {
                const { data: product, error } = await supabase.from('product').select('*').eq('id', productId).single();
                if (error) throw error;
                if (!mounted) return;
                // load other images
                const { data: otherImgs, error: imgsErr } = await supabase.from('product_images').select('image_url').eq('product_id', productId);
                if (imgsErr) throw imgsErr;
                const otherUrls = Array.isArray(otherImgs) ? otherImgs.map((r: any) => r.image_url) : [];
                setOriginalOtherImages(otherUrls);
                const initialImages: string[] = [];
                if (product.image_url) initialImages.push(product.image_url);
                initialImages.push(...otherUrls);
                setImages(initialImages);
                setForm({
                    title: product.title || '',
                    price: product.price ? String(product.price) : '',
                    description: product.description || '',
                    whatsappNumber: product.whatsapp_number ? product.whatsapp_number.replace(/^\+221/, '') : '',
                    category: product.category || '',
                });
                setDescCount((product.description || '').length);
            } catch (err: any) {
                console.error('Load product error', err);
                Alert.alert('Erreur', 'Impossible de charger le produit.');
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [productId, user]);

    useEffect(() => {
        setDescCount(form.description.length);
    }, [form.description]);

    const handleInputChange = (name: string, value: string) => {
        if (name === 'price') {
            const numeric = value.replace(/[^0-9]/g, '');
            setForm(prev => ({ ...prev, [name]: numeric }));
        } else if (name === 'whatsappNumber') {
            setForm(prev => ({ ...prev, [name]: value.replace(/[^0-9]/g, '') }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    // Upload seulement les images locales (non http)
    const uploadNewImages = async (uris: string[], userId: string) => {
        const uploadedUrls: string[] = [];
        for (const [index, uri] of uris.entries()) {
            if (uri.startsWith('http')) {
                uploadedUrls.push(uri); // déjà uploadé
                continue;
            }
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
            const fileName = `${userId}-${Date.now()}-${index}.jpg`;
            const { error: uploadError } = await supabase.storage.from('product').upload(fileName, decode(base64), { contentType: 'image/jpeg' });
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('product').getPublicUrl(fileName);
            uploadedUrls.push(data.publicUrl);
        }
        return uploadedUrls;
    };

    const handleSubmit = async () => {
        Keyboard.dismiss();
        // Use memoized validation result instead of calling a setter during render
        if (!validationResult.isValid || !user?.id) {
            // ensure errors are visible
            setErrors(validationResult.errors);
            return;
        }

        setSubmitting(true);
        try {
            // Upload any new images and keep existing public URLs
            const processedUrls = await uploadNewImages(images, user.id);
            const mainImage = processedUrls[0];
            const otherImages = processedUrls.slice(1);

            // Update product
            const { data: updated, error: updateErr } = await supabase
                .from('product')
                .update({
                    title: form.title,
                    price: parseFloat(form.price),
                    category: form.category,
                    description: form.description,
                    image_url: mainImage,
                    whatsapp_number: form.whatsappNumber ? '+221' + form.whatsappNumber : null,
                })
                .eq('id', productId)
                .select()
                .single();
            if (updateErr) throw updateErr;

            // Replace other images: delete old rows and insert new ones (simple approach)
            const { error: delErr } = await supabase.from('product_images').delete().eq('product_id', productId);
            if (delErr) throw delErr;
            if (otherImages.length > 0) {
                const payload = otherImages.map((url) => ({ product_id: productId, image_url: url }));
                const { error: insErr } = await supabase.from('product_images').insert(payload);
                if (insErr) throw insErr;
            }

            // Redirect to product page
            router.replace(`/product/${productId}`);
        } catch (err: any) {
            console.error('Update error', err);
            const message = err?.message || 'Erreur lors de la mise à jour.';
            setErrors(prev => ({ ...prev, submit: message }));
            Alert.alert('Erreur', message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) return <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />;

    const displayName = profile?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'utilisateur';
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#FFFDF8" barStyle="dark-content" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <TopHeader displayName={displayName} avatarUrl={avatarUrl} />
                    <View style={styles.card}>
                        {loading ? (
                            <View style={{ padding: 32, alignItems: 'center' }}>
                                <ActivityIndicator />
                                <Text style={{ marginTop: 12, color: '#6B7280' }}>Chargement de l'annonce...</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.sectionTitle}>Modifier l'annonce</Text>
                                <Text style={styles.sectionSubtitle}>Fais les modifications et enregistre — tes acheteurs verront les changements.</Text>

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
                                            value={form.price.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                                            onChangeText={p => handleInputChange('price', p)}
                                        />
                                    </View>
                                </FormField>

                                <FormField label="Description" isOptional>
                                    <TextInput
                                        style={[styles.input, { height: 120, textAlignVertical: 'top', paddingTop: 14 }]}
                                        placeholder="Décrivez l'état, les défauts éventuels..."
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

                                <TouchableOpacity style={[styles.submit, (!validationResult.isValid || submitting) && styles.submitDisabled]} onPress={handleSubmit} disabled={!validationResult.isValid || submitting}>
                                    {submitting ? <ActivityIndicator color="#1C2B49" /> : <Text style={styles.submitText}>Enregistrer les modifications</Text>}
                                </TouchableOpacity>

                                <View style={styles.tips}>
                                    <Text style={styles.tipTitle}>Conseils</Text>
                                    <Text style={styles.tipItem}>• Si tu veux remplacer une image, supprime-la puis ajoute-en une nouvelle.</Text>
                                    <Text style={styles.tipItem}>• La photo de couverture est la première image.</Text>
                                </View>
                            </>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Styles similaires à la page vendre pour cohérence
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