// lib/supabaseClient.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from "@supabase/supabase-js";
import Constants from 'expo-constants';
import * as WebBrowser from "expo-web-browser";
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage, // Fonctionne sur web ET mobile depuis la v1.17.0
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web', // Important !
    },
});