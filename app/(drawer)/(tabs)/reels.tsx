import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, StatusBar, ViewToken, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReelItem } from '@/components/ReelItem';
import { Reel, User } from '@/types';
import { apiClient } from '@/services/api';

const { width, height } = Dimensions.get('window');

export default function ReelsScreen() {
    const insets = useSafeAreaInsets();
    const { id: initialReelId } = useLocalSearchParams<{ id: string }>();
    const [reels, setReels] = useState<Reel[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeReelId, setActiveReelId] = useState<string | null>(null);
    const listRef = useRef<FlatList>(null);

    const loadReels = async () => {
        try {
            setLoading(true);
            const response = await apiClient.getReels(1, 10);
            console.log('[ReelsScreen] Loaded reels:', response.data?.length || 0);
            if (response.data && response.data.length > 0) {
                console.log('[ReelsScreen] First reel URL:', response.data[0].videoUrl);
            }
            setReels(response.data as Reel[]);

            // Handle initial scroll if ID is provided
            if (initialReelId) {
                const index = response.data.findIndex(r => r.id === initialReelId);
                if (index !== -1) {
                    setActiveReelId(initialReelId);
                    setTimeout(() => {
                        listRef.current?.scrollToIndex({ index, animated: false });
                    }, 100);
                } else if (response.data.length > 0) {
                    setActiveReelId(response.data[0].id);
                }
            } else if (response.data.length > 0) {
                setActiveReelId(response.data[0].id);
            }
        } catch (error) {
            console.error('Failed to load reels:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadReels();
        setRefreshing(false);
    };

    useEffect(() => {
        loadReels();
    }, []);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            setActiveReelId(viewableItems[0].item.id);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 80
    }).current;

    const reelHeight = height - (insets.bottom + 49); // 49 is approx tab bar height

    const renderItem = useCallback(({ item }: { item: Reel }) => (
        <ReelItem
            reel={item}
            isVisible={item.id === activeReelId}
            containerHeight={reelHeight}
        />
    ), [activeReelId, reelHeight]);

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <FlatList
                ref={listRef}
                data={reels}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.id || index}-${index}`}
                pagingEnabled={true}
                snapToInterval={reelHeight}
                snapToAlignment="start"
                decelerationRate="fast"
                disableIntervalMomentum={true}
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                removeClippedSubviews={Platform.OS === 'android'} // Better for smooth snapping on Android
                initialNumToRender={2}
                maxToRenderPerBatch={2}
                windowSize={5}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                getItemLayout={(_, index) => ({
                    length: reelHeight,
                    offset: reelHeight * index,
                    index,
                })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    }
});
