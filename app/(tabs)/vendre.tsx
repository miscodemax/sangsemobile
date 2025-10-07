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
    Animated,
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

const categories = [
    { value: 'vetement', label: 'Vêtements', icon: '👗', color: '#ec4899' },
    { value: 'soins_et_astuces', label: 'Soins & Astuces', icon: '💄', color: '#f97316' },
    { value: 'maquillage', label: 'Maquillage', icon: '💋', color: '#ef4444' },
    { value: 'artisanat', label: 'Artisanat', icon: '🎨', color: '#8b5cf6' },
    { value: 'electronique', label: 'Électronique', icon: '📱', color: '#3b82f6' },
    { value: 'accessoire', label: 'Accessoires', icon: '👜', color: '#14b8a6' },
    { value: 'chaussure', label: 'Chaussures', icon: '👠', color: '#f59e0b' },
];

// Barre de progression animée
const ProgressBar = ({ progress }: { progress: number }) => {
    const animatedWidth = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.spring(animatedWidth, {
            toValue: progress,
            useNativeDriver: false,
            tension: 50,
            friction: 7,
        }).start();
    }, [progress]);

    const width = animatedWidth.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.progressContainer}>
            <View style={styles.progressInfo}>
                <Text style={styles.progressText}>Progression</Text>
                <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
                <Animated.View style={[styles.progressBarFill, { width }]} />
            </View>
        </View>
    );
};

// Header moderne avec avatar
const ModernHeader = ({ displayName, avatarUrl }: { displayName: string; avatarUrl?: string | null }) => {
    const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <View style={styles.modernHeader}>
            <View>
                <Text style={styles.headerGreeting}>Bonjour 👋</Text>
                <Text style={styles.headerName}>{displayName}</Text>
                <Text style={styles.headerSubtitle}>Vendez en quelques clics</Text>
            </View>
            {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
            ) : (
                <View style={styles.headerAvatarPlaceholder}>
                    <Text style={styles.headerAvatarText}>{initials}</Text>
                </View>
            )}
        </View>
    );
};

// Sélecteur de catégorie modernisé
const CategorySelector = ({ categories, selectedCategory, onSelect, error }) => {
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text style={styles.sectionTitle}>Catégorie</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Choisissez la catégorie qui correspond le mieux</Text>

            <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.value;
                    return (
                        <TouchableOpacity
                            key={cat.value}
                            onPress={() => onSelect(cat.value)}
                            activeOpacity={0.7}
                            style={[
                                styles.categoryCard,
                                isSelected && { ...styles.categoryCardSelected, borderColor: cat.color }
                            ]}
                        >
                            <Text style={styles.categoryIcon}>{cat.icon}</Text>
                            <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                                {cat.label}
                            </Text>
                            {isSelected && (
                                <View style={[styles.categoryCheck, { backgroundColor: cat.color }]}>
                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
            {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
        </View>
    );
};

// Image Picker amélioré
const ImagePickerField = ({ images, setImages, error }) => {
    const pickImage = async () => {
        if (images.length >= 5) {
            Alert.alert('Maximum atteint', 'Vous pouvez ajouter jusqu\'à 5 photos.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) {
            setImages([...images, result.assets[0].uri]);
        }
    };

    const takePhoto = async () => {
        if (images.length >= 5) {
            Alert.alert('Maximum atteint', 'Vous pouvez ajouter jusqu\'à 5 photos.');
            return;
        }
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission refusée', 'Autorisez l\'accès à la caméra.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) {
            setImages([...images, result.assets[0].uri]);
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const setAsCover = (index: number) => {
        if (index === 0) return;
        const copy = [...images];
        const [picked] = copy.splice(index, 1);
        copy.unshift(picked);
        setImages(copy);
    };

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={[styles.stepBadge, { backgroundColor: '#ec4899' }]}>
                    <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={styles.sectionTitle}>Vos photos</Text>
            </View>
            <Text style={styles.sectionSubtitle}>💡 La première photo sera votre couverture</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                {images.map((uri, index) => (
                    <View key={index} style={styles.imageWrapper}>
                        <Image source={{ uri }} style={styles.imagePreview} />

                        {/* Badge couverture */}
                        {index === 0 && (
                            <View style={styles.coverBadge}>
                                <Text style={styles.coverBadgeText}>Couverture</Text>
                            </View>
                        )}

                        {/* Numéro */}
                        <View style={styles.imageNumber}>
                            <Text style={styles.imageNumberText}>{index + 1}</Text>
                        </View>

                        {/* Boutons */}
                        <View style={styles.imageActions}>
                            {index !== 0 && (
                                <TouchableOpacity
                                    style={styles.setCoverBtn}
                                    onPress={() => setAsCover(index)}
                                >
                                    <Text style={styles.setCoverText}>Couverture</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.removeImageBtn}
                                onPress={() => removeImage(index)}
                            >
                                <Ionicons name="trash-outline" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                {/* Boutons d'ajout */}
                {images.length < 5 && (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                            <View style={styles.addImageIcon}>
                                <Ionicons name="images-outline" size={28} color="#f59e0b" />
                            </View>
                            <Text style={styles.addImageText}>Galerie</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.addImageBtn} onPress={takePhoto}>
                            <View style={styles.addImageIcon}>
                                <Ionicons name="camera-outline" size={28} color="#f59e0b" />
                            </View>
                            <Text style={styles.addImageText}>Photo</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <Text style={styles.helperText}>📷 {images.length}/5 photos • Formats: JPG, PNG</Text>
            {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
        </View>
    );
};

// Champ de formulaire moderne
const ModernFormField = ({ label, required, helper, error, children }) => (
    <View style={styles.formField}>
        <Text style={styles.fieldLabel}>
            {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        {helper && <Text style={styles.fieldHelper}>{helper}</Text>}
        {children}
        {error && <Text style={styles.errorText}>⚠️ {error}</Text>}
    </View>
);

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
    const [profile, setProfile] = useState<{ display_name?: string | null; avatar_url?: string | null } | null>(null);

    useEffect(() => { if (!user) setAuthVisible(true); }, [user]);

    useEffect(() => {
        if (!user) return;
        let mounted = true;
        (async () => {
            try {
                const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).maybeSingle();
                if (mounted && data) setProfile(data);
            } catch (e) { }
        })();
        return () => { mounted = false; };
    }, [user]);

    const handleInputChange = (name: string, value: string) => {
        if (name === 'price') {
            const numeric = value.replace(/[^0-9]/g, '');
            setForm(prev => ({ ...prev, [name]: numeric }));
        } else if (name === 'whatsappNumber') {
            setForm(prev => ({ ...prev, [name]: value.replace(/[^0-9]/g, '') }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    };

    const prettyPrice = (priceStr: string) => {
        if (!priceStr) return '';
        return priceStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    const calculateProgress = () => {
        let progress = 0;
        if (images.length > 0) progress += 25;
        if (form.category) progress += 25;
        if (form.title) progress += 15;
        if (form.price) progress += 15;
        if (form.description) progress += 10;
        if (form.whatsappNumber) progress += 10;
        return progress;
    };

    const validateForm = () => {
        let newErrors: any = {};
        if (!form.title.trim()) newErrors.title = 'Le titre est obligatoire';
        if (!form.price.trim()) newErrors.price = 'Le prix est obligatoire';
        if (!form.category) newErrors.category = 'Choisissez une catégorie';
        if (images.length === 0) newErrors.images = 'Ajoutez au moins une photo';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const uploadImages = async (imagesToUpload: string[], userId: string) => {
        const uploadedUrls: string[] = [];
        for (const [index, uri] of imagesToUpload.entries()) {
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
        if (!validateForm() || !user?.id) return;

        setLoading(true);
        try {
            const uploadedUrls = await uploadImages(images, user.id);
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
                await supabase.from('product_images')
                    .insert(otherImages.map(url => ({ product_id: product.id, image_url: url })));
            }

            Alert.alert('🎉 Succès !', 'Votre article est maintenant en ligne', [
                { text: 'OK', onPress: () => router.replace(`/product/${product.id}`) }
            ]);
        } catch (err: any) {
            Alert.alert('Erreur', err.message || 'Impossible de publier l\'article');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <AuthModal visible={authVisible} onClose={() => setAuthVisible(false)} />;

    const displayName = profile?.display_name || user.user_metadata?.display_name || user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'utilisateur');
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;
    const isFormValid = images.length > 0 && form.category && form.title && form.price;

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#FAFAFA" barStyle="dark-content" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <ModernHeader displayName={displayName} avatarUrl={avatarUrl} />

                    <ProgressBar progress={calculateProgress()} />

                    <View style={styles.card}>
                        <ImagePickerField images={images} setImages={setImages} error={errors.images} />

                        <View style={styles.divider} />

                        <CategorySelector
                            categories={categories}
                            selectedCategory={form.category}
                            onSelect={cat => handleInputChange('category', cat)}
                            error={errors.category}
                        />

                        <View style={styles.divider} />

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.stepBadge, { backgroundColor: '#10b981' }]}>
                                    <Text style={styles.stepBadgeText}>3</Text>
                                </View>
                                <Text style={styles.sectionTitle}>Détails</Text>
                            </View>

                            <ModernFormField label="Titre" required error={errors.title} helper="Soyez précis et descriptif">
                                <TextInput
                                    style={styles.input}
                                    placeholder="Ex: Sac en cuir marron, état neuf"
                                    placeholderTextColor="#9ca3af"
                                    value={form.title}
                                    onChangeText={t => handleInputChange('title', t)}
                                />
                            </ModernFormField>

                            <ModernFormField label="Prix (FCFA)" required error={errors.price}>
                                <View style={styles.priceInput}>
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        placeholder="5 000"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="numeric"
                                        value={prettyPrice(form.price)}
                                        onChangeText={p => handleInputChange('price', p)}
                                    />
                                    <Text style={styles.priceCurrency}>FCFA</Text>
                                </View>
                            </ModernFormField>

                            <ModernFormField label="Description" helper="État, taille, défauts éventuels...">
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Décrivez votre article en détail..."
                                    placeholderTextColor="#9ca3af"
                                    multiline
                                    maxLength={800}
                                    value={form.description}
                                    onChangeText={t => handleInputChange('description', t)}
                                />
                                <Text style={styles.charCount}>{form.description.length}/800</Text>
                            </ModernFormField>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.stepBadge, { backgroundColor: '#f59e0b' }]}>
                                    <Text style={styles.stepBadgeText}>4</Text>
                                </View>
                                <Text style={styles.sectionTitle}>Contact</Text>
                            </View>

                            <ModernFormField label="Numéro WhatsApp" helper="Pour que les acheteurs vous contactent">
                                <View style={styles.phoneInput}>
                                    <Text style={styles.phonePrefix}>+221</Text>
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        placeholder="77 123 45 67"
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="phone-pad"
                                        maxLength={9}
                                        value={form.whatsappNumber}
                                        onChangeText={t => handleInputChange('whatsappNumber', t)}
                                    />
                                </View>
                            </ModernFormField>
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, (!isFormValid || loading) && styles.submitBtnDisabled]}
                            onPress={handleSubmit}
                            disabled={!isFormValid || loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#1f2937" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.submitBtnText}>Publier l'article</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#1f2937" />
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.tips}>
                            <Text style={styles.tipsTitle}>💡 Conseils pour vendre vite</Text>
                            <Text style={styles.tipItem}>• Photos nettes avec bonne lumière</Text>
                            <Text style={styles.tipItem}>• Prix réaliste = vente 3x plus rapide</Text>
                            <Text style={styles.tipItem}>• Mentionnez tous les défauts</Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // --- Conteneurs principaux ---
    safeArea: {
        flex: 1,
        backgroundColor: '#FAFAFA'
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100
    },
    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2
    },

    // --- Header ---
    modernHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    headerGreeting: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4
    },
    headerName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 4
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#9ca3af'
    },
    headerAvatar: {
        width: 56,
        height: 56,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#f59e0b'
    },
    headerAvatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#fef3c7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerAvatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f59e0b'
    },

    // --- Barre de progression ---
    progressContainer: {
        marginBottom: 16,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    progressText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280'
    },
    progressPercent: {
        fontSize: 13,
        fontWeight: '700',
        color: '#f59e0b'
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#f59e0b',
        borderRadius: 8
    },

    // --- Structure des sections ---
    section: {
        marginBottom: 24
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12
    },
    stepBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepBadgeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800'
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827'
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#6b7280',
        marginBottom: 16
    },
    divider: {
        height: 1,
        backgroundColor: '#f3f4f6',
        marginVertical: 24
    },

    // --- Sélecteur de Photos ---
    imageScroll: {
        marginBottom: 12
    },
    imageWrapper: {
        width: 120,
        height: 120,
        borderRadius: 16,
        marginRight: 12,
        position: 'relative',
        overflow: 'hidden', // Pour s'assurer que les enfants respectent le borderRadius
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        borderRadius: 16
    },
    coverBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: '#f59e0b',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    coverBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700'
    },
    imageNumber: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.7)',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageNumberText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700'
    },
    imageActions: { // Note: l'opacité à 0 suggère une interaction pour le faire apparaître
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        opacity: 0, // Mettre à 1 pour le voir, ou gérer via un état au "press"
    },
    setCoverBtn: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    setCoverText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#111827'
    },
    removeImageBtn: {
        backgroundColor: '#ef4444',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addImageBtn: {
        width: 120,
        height: 120,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#f59e0b',
        backgroundColor: '#fffbeb',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    addImageIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addImageText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#92400e'
    },
    helperText: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 8,
        textAlign: 'center',
    },

    // --- Sélecteur de Catégorie ---
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },
    categoryCard: {
        width: '48%', // Un peu moins de 50% pour gérer le gap
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#e5e7eb',
        backgroundColor: '#fafafa',
        alignItems: 'center',
        gap: 8,
    },
    categoryCardSelected: {
        backgroundColor: '#fffbeb',
        borderWidth: 2,
    },
    categoryIcon: {
        fontSize: 32
    },
    categoryLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6b7280',
        textAlign: 'center'
    },
    categoryLabelSelected: {
        color: '#111827'
    },
    categoryCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // --- Champs de formulaire ---
    formField: {
        marginBottom: 20
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 8
    },
    required: {
        color: '#ef4444'
    },
    fieldHelper: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 8
    },
    input: {
        backgroundColor: '#fafafa',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#111827',
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
        paddingTop: 14
    },
    charCount: {
        fontSize: 11,
        color: '#9ca3af',
        textAlign: 'right',
        marginTop: 4
    },
    priceInput: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    priceCurrency: {
        fontSize: 15,
        fontWeight: '700',
        color: '#6b7280'
    },
    phoneInput: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fafafa',
        borderWidth: 2,
        borderColor: '#e5e7eb',
        borderRadius: 12,
    },
    phonePrefix: {
        fontSize: 15,
        fontWeight: '700',
        color: '#6b7280',
        paddingLeft: 16,
    },

    // --- Bouton de soumission ---
    submitBtn: {
        backgroundColor: '#f59e0b',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
        marginTop: 24,
        gap: 8,
    },
    submitBtnDisabled: {
        backgroundColor: '#f3f4f6',
        opacity: 0.8,
    },
    submitBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1f2937',
    },

    // --- Section Conseils ---
    tips: {
        marginTop: 32,
        padding: 16,
        backgroundColor: '#f0f9ff', // Un bleu très clair pour se démarquer
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0f2fe',
    },
    tipsTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0369a1',
        marginBottom: 8,
    },
    tipItem: {
        fontSize: 13,
        color: '#075985',
        lineHeight: 20,
    },

    // --- Message d'erreur ---
    errorText: {
        color: '#ef4444',
        fontSize: 12,
        marginTop: 6,
        fontWeight: '500',
    },
});