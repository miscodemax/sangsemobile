import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface Props {
    images: string[];
    setImages: (images: string[]) => void;
    error?: string;
}

export default function ImagePickerField({ images, setImages, error }: Props) {
    const pickImage = async () => {
        if (images.length >= 5) {
            Alert.alert('Limite atteinte', 'Vous pouvez ajouter jusqu’à 5 images.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 4], base64: false, quality: 0.7 });
        if (!result.canceled) {
            setImages([...images, result.assets[0].uri]);
        }
    };

    return (
        <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>Photos *</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12, marginTop: -4 }}>La première photo sera la couverture.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 4 }}>
                {images.map((uri, i) => (
                    <View key={i} style={{ position: 'relative', marginRight: 12 }}>
                        <Image source={{ uri }} style={{ width: 100, height: 100, borderRadius: 12 }} />
                        <TouchableOpacity style={{ position: 'absolute', top: -8, right: -8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 15, padding: 2 }} onPress={() => setImages(images.filter((_, j) => j !== i))}>
                            <Ionicons name="close-circle" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>
                ))}
                {images.length < 5 && (
                    <TouchableOpacity style={{ width: 100, height: 100, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderStyle: 'dashed', borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' }} onPress={pickImage}>
                        <Ionicons name="camera-outline" size={32} color="#6B7280" />
                        <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4, fontWeight: '500' }}>Ajouter ({images.length}/5)</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
            {error && <Text style={{ color: '#EF4444', fontSize: 13, marginTop: 6 }}>{error}</Text>}
        </View>
    );
}
