import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Custom storage adapter - uses SecureStore on native, AsyncStorage on web
const createStorageAdapter = () => {
    // On web, SecureStore is not available, so we fall back to AsyncStorage
    if (Platform.OS === 'web') {
        return {
            getItem: async (key: string) => {
                return AsyncStorage.getItem(key);
            },
            setItem: async (key: string, value: string) => {
                await AsyncStorage.setItem(key, value);
            },
            removeItem: async (key: string) => {
                await AsyncStorage.removeItem(key);
            },
        };
    }

    // On native platforms, use SecureStore
    return {
        getItem: async (key: string) => {
            try {
                const secureValue = await SecureStore.getItemAsync(key);
                if (secureValue) return secureValue;
            } catch (error) {
                console.warn('SecureStore getItem error:', error);
            }
            // Fallback to AsyncStorage (for large values or if SecureStore fails)
            try {
                return await AsyncStorage.getItem(key);
            } catch (error) {
                return null;
            }
        },
        setItem: async (key: string, value: string) => {
            try {
                // SecureStore has a 2048 byte limit, use AsyncStorage for large values
                if (value.length > 2000) {
                    await AsyncStorage.setItem(key, value);
                } else {
                    await SecureStore.setItemAsync(key, value);
                }
            } catch (error) {
                console.warn('SecureStore setItem error, falling back to AsyncStorage:', error);
                await AsyncStorage.setItem(key, value);
            }
        },
        removeItem: async (key: string) => {
            try {
                await SecureStore.deleteItemAsync(key);
            } catch (error) {
                console.warn('SecureStore removeItem error:', error);
            }
            // Also remove from AsyncStorage in case it was stored there
            try {
                await AsyncStorage.removeItem(key);
            } catch (error) {
                // Ignore
            }
        },
    };
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('Supabase Config:', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey?.length,
    keyStart: supabaseAnonKey?.substring(0, 5)
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing from environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: createStorageAdapter(),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
