// app/chat.js

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 👇 1. On importe la fonction pour CRÉER le composant de chat
import { createGroupChannelFragment } from '@sendbird/uikit-react-native';

// 👇 2. On crée notre propre composant de chat juste ici
const GroupChannelFragment = createGroupChannelFragment();

export default function Chat() {
    const router = useRouter();
    const { channelUrl } = useLocalSearchParams();

    if (!channelUrl) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#F6C445" />
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1 }}>
            {/* 👇 3. On utilise notre composant "Fragment" créé juste au-dessus */}
            <GroupChannelFragment
                channelUrl={String(channelUrl)}
                onPressHeaderLeft={() => {
                    // Pour le bouton "Retour"
                    router.back();
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
});