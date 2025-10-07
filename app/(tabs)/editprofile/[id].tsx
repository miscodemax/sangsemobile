import AuthModal from '@/app/composants/authModal';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const AVATAR_BUCKET = 'avatars'; // nom du bucket dans Supabase

export default function EditProfileScreen() {
    const router = useRouter();
    const params: any = useLocalSearchParams();
    const id = params?.id;

    const { user } = useAuth();
    const mountedRef = useRef(true);

    const [showAuthModal, setShowAuthModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Form state
    const [displayName, setDisplayName] = useState(''); // username
    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [waveNumber, setWaveNumber] = useState(''); // nouveau champ Wave
    const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        if (!user) setShowAuthModal(true);
        else setShowAuthModal(false);
    }, [user]);

    useEffect(() => {
        if (!id) return;
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('username, full_name, bio, avatar_url, wave_number')
                    .eq('id', id)
                    .maybeSingle();
                if (error) throw error;
                if (!mounted) return;
                setDisplayName(data?.username || '');
                setFullName(data?.full_name || '');
                setBio(data?.bio || '');
                setAvatarUrl(data?.avatar_url || null);
                setWaveNumber(data?.wave_number || '');
                setLocalAvatarUri(null);
            } catch (err: any) {
                console.error('fetch profile', err);
                Alert.alert('Erreur', 'Impossible de charger le profil.');
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [id]);

    const isOwner = useMemo(() => !!(user && id && user.id === id), [user, id]);

    const pickAvatar = useCallback(async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission refusée', 'Autorisez l\'accès à la galerie.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) return;
        setLocalAvatarUri(result.assets[0].uri);
    }, []);

    const takePhoto = useCallback(async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission refusée', 'Autorisez la caméra.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) return;
        setLocalAvatarUri(result.assets[0].uri);
    }, []);

    const validate = useCallback(() => {
        const e: Record<string, string> = {};
        if (!displayName.trim()) e.displayName = 'Le nom d\'utilisateur est requis.';
        if (displayName.length > 50) e.displayName = 'Le nom est trop long (max 50 caractères).';
        if (fullName.length > 100) e.fullName = 'Le nom complet est trop long (max 100 caractères).';
        if (bio.length > 1000) e.bio = 'La bio est trop longue (max 1000 caractères).';
        if (waveNumber.length > 20) e.waveNumber = 'Numéro Wave trop long (max 20 caractères).';
        setErrors(e);
        return Object.keys(e).length === 0;
    }, [displayName, fullName, bio, waveNumber]);

    const uploadAvatarIfNeeded = useCallback(async (userId: string) => {
        const uri = localAvatarUri;
        if (!uri || uri.startsWith('http')) return avatarUrl;

        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        const fileName = `${userId}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(fileName, decode(base64), {
            contentType: 'image/jpeg',
        });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(fileName);
        return data.publicUrl;
    }, [localAvatarUri, avatarUrl]);

    const handleSave = useCallback(async () => {
        Keyboard.dismiss();
        if (!isOwner) {
            Alert.alert('Accès refusé', 'Seul le propriétaire peut modifier ce profil.');
            return;
        }
        if (!validate()) return;

        setSaving(true);
        setErrors({});
        try {
            const userId = user!.id;
            let newAvatarPublicUrl = avatarUrl;

            if (localAvatarUri && !localAvatarUri.startsWith('http')) {
                newAvatarPublicUrl = await uploadAvatarIfNeeded(userId);
            }

            const updatePayload: any = {
                username: displayName,
                full_name: fullName || null,
                bio: bio || null,
                avatar_url: newAvatarPublicUrl || null,
                wave_number: waveNumber || null, // ajouté
            };

            const { error: updateError } = await supabase.from('profiles').update(updatePayload).eq('id', userId);
            if (updateError) throw updateError;

            router.replace(`/profile/${userId}`);
        } catch (err: any) {
            console.error('save profile', err);
            const message = err?.message || 'Erreur lors de la sauvegarde.';
            Alert.alert('Erreur', message);
            setErrors(prev => ({ ...prev, submit: message }));
        } finally {
            if (mountedRef.current) setSaving(false);
        }
    }, [isOwner, validate, user, localAvatarUri, uploadAvatarIfNeeded, displayName, fullName, bio, avatarUrl, waveNumber, router]);

    const handleRemoveAvatar = useCallback(() => {
        setLocalAvatarUri(null);
        setAvatarUrl(null);
    }, []);

    if (!user) return <AuthModal visible={showAuthModal} onClose={() => setShowAuthModal(false)} />;

    if (loading) return (
        <SafeAreaView style={styles.center}>
            <ActivityIndicator size="large" color="#F6C445" />
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar backgroundColor="#FFFDF8" barStyle="dark-content" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.pageTitle}>Modifier le profil</Text>

                    <View style={styles.card}>
                        <Text style={styles.label}>Photo de profil</Text>
                        <View style={styles.avatarRow}>
                            <View style={styles.previewWrapper}>
                                {localAvatarUri ? (
                                    <Image source={{ uri: localAvatarUri }} style={styles.avatarPreview} />
                                ) : avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={styles.avatarPreview} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarInitials}>{(displayName || user.email || 'U').slice(0, 2).toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.avatarActions}>
                                <TouchableOpacity style={styles.outlinedBtn} onPress={pickAvatar}>
                                    <Ionicons name="image-outline" size={18} color="#1C2B49" />
                                    <Text style={styles.outlinedBtnText}>Galerie</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.outlinedBtn} onPress={takePhoto}>
                                    <Ionicons name="camera-outline" size={18} color="#1C2B49" />
                                    <Text style={styles.outlinedBtnText}>Prendre</Text>
                                </TouchableOpacity>

                                {(localAvatarUri || avatarUrl) && (
                                    <TouchableOpacity style={[styles.outlinedBtn, { borderColor: '#EF4444' }]} onPress={handleRemoveAvatar}>
                                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                        <Text style={[styles.outlinedBtnText, { color: '#EF4444' }]}>Supprimer</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.label}>Nom d'utilisateur</Text>
                        <TextInput
                            style={[styles.input, errors.displayName && styles.inputError]}
                            placeholder="Ex: Pauline_nearby"
                            value={displayName}
                            onChangeText={setDisplayName}
                            maxLength={50}
                        />
                        {errors.displayName && <Text style={styles.errText}>{errors.displayName}</Text>}

                        <Text style={[styles.label, { marginTop: 14 }]}>Nom complet (optionnel)</Text>
                        <TextInput
                            style={[styles.input, errors.fullName && styles.inputError]}
                            placeholder="Ex: Pauline Dupont"
                            value={fullName}
                            onChangeText={setFullName}
                            maxLength={100}
                        />
                        {errors.fullName && <Text style={styles.errText}>{errors.fullName}</Text>}

                        <Text style={[styles.label, { marginTop: 14 }]}>Bio</Text>
                        <TextInput
                            style={[styles.textarea, errors.bio && styles.inputError]}
                            placeholder="Parle un peu de toi..."
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            numberOfLines={5}
                            maxLength={1000}
                        />
                        <Text style={styles.helperText}>{bio.length}/1000</Text>
                        {errors.bio && <Text style={styles.errText}>{errors.bio}</Text>}

                        <Text style={[styles.label, { marginTop: 14 }]}>Numéro Wave</Text>
                        <TextInput
                            style={[styles.input, errors.waveNumber && styles.inputError]}
                            placeholder="Ex: 77XX12345"
                            value={waveNumber}
                            onChangeText={setWaveNumber}
                            maxLength={20}
                        />
                        {errors.waveNumber && <Text style={styles.errText}>{errors.waveNumber}</Text>}
                    </View>

                    {errors.submit && <Text style={[styles.errText, { textAlign: 'center' }]}>{errors.submit}</Text>}

                    <TouchableOpacity
                        style={[styles.saveBtn, (!isOwner || saving) && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={!isOwner || saving}
                    >
                        {saving ? <ActivityIndicator color="#0F1724" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
                    </TouchableOpacity>

                    {!isOwner && (
                        <Text style={{ textAlign: 'center', marginTop: 12, color: '#6B7280' }}>
                            Vous ne pouvez modifier ce profil que si vous êtes connecté en tant que propriétaire.
                        </Text>
                    )}

                    <View style={{ height: 60 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFDF8' },
    container: { padding: 20, paddingBottom: 120, paddingTop: 50 },
    pageTitle: { fontSize: 22, fontWeight: '800', color: '#0F1724', marginBottom: 12, textAlign: 'center' },

    card: { backgroundColor: '#FFF', padding: 14, borderRadius: 12, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },

    label: { fontSize: 14, fontWeight: '700', color: '#1C2B49', marginBottom: 8 },
    input: { backgroundColor: '#F8FAFB', borderRadius: 10, paddingHorizontal: 12, height: 48, fontSize: 15, borderWidth: 1, borderColor: '#F0F2F5' },
    textarea: { backgroundColor: '#F8FAFB', borderRadius: 10, paddingHorizontal: 12, paddingTop: 12, fontSize: 15, borderWidth: 1, borderColor: '#F0F2F5' },
    helperText: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },

    avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    previewWrapper: { width: 96, height: 96, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    avatarPreview: { width: 96, height: 96, borderRadius: 14 },
    avatarPlaceholder: { width: 96, height: 96, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    avatarInitials: { color: '#1C2B49', fontWeight: '800' },

    avatarActions: { flex: 1, marginLeft: 10, justifyContent: 'center' },
    outlinedBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E6E9EE', backgroundColor: '#fff', marginBottom: 8 },
    outlinedBtnText: { marginLeft: 8, color: '#1C2B49', fontWeight: '700' },

    errText: { color: '#EF4444', marginTop: 6 },
    inputError: { borderColor: '#FECACA' },

    saveBtn: { backgroundColor: '#F6C445', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginHorizontal: 20 },
    saveBtnDisabled: { opacity: 0.7, backgroundColor: '#FDE68A' },
    saveBtnText: { fontWeight: '800', color: '#0F1724', fontSize: 16 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
