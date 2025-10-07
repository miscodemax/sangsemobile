// app/_layout.js

import { SendbirdUIKitContainer } from '@sendbird/uikit-react-native';
// 👇 1. On importe MMKV au lieu de AsyncStorage
import { MMKV } from 'react-native-mmkv';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/context/authContext';
import { useColorScheme } from '@/hooks/useColorScheme';

// 👇 2. On crée une instance de MMKV
const mmkv = new MMKV();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <SendbirdUIKitContainer
      appId={'REMPLACE_PAR_TON_APP_ID_SENDBIRD'}
      chatOptions={{
        // 👇 3. On utilise l'instance de mmkv ici
        localCacheStorage: mmkv,
        onInitialized: () => {
          console.log('✅ SDK Sendbird initialisé');
        },
      }}
    >
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
            <Stack.Screen name="chat" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </SendbirdUIKitContainer>
  );
}