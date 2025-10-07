import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface Category {
    value: string;
    label: string;
    icon: string;
}

interface Props {
    categories: Category[];
    selectedCategory: string;
    onSelect: (value: string) => void;
    error?: string;
}

export default function CategorySelector({ categories, selectedCategory, onSelect, error }: Props) {
    return (
        <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>Catégorie *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
                {categories.map(cat => (
                    <TouchableOpacity
                        key={cat.value}
                        onPress={() => onSelect(cat.value)}
                        style={{
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 12,
                            backgroundColor: selectedCategory === cat.value ? '#FFFBEB' : '#F9FAFB',
                            borderColor: selectedCategory === cat.value ? '#F6C445' : '#E5E7EB',
                            borderWidth: selectedCategory === cat.value ? 1.5 : 1,
                            marginRight: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                        <Text style={{ fontWeight: '600', color: '#1F2937' }}>{cat.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
            {error && <Text style={{ color: '#EF4444', fontSize: 13, marginTop: 6 }}>{error}</Text>}
        </View>
    );
}
