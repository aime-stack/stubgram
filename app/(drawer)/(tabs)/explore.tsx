import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/services/api';

/*
  Explore Screen:
  1. Search Bar
  2. Trending Topics (Horizontal Scroll)
  3. "For You" Grid (Random/Algorithm posts)
*/

export default function ExploreScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [trendingPoints, setTrendingPoints] = useState<any[]>([]);
    const [explorePosts, setExplorePosts] = useState<any[]>([]);

    useEffect(() => {
        loadTrending();
        loadExplorePosts();
    }, []);

    const loadTrending = async () => {
        const { data, error } = await supabase
            .from('trending_topics')
            .select('*')
            .order('count', { ascending: false })
            .limit(10);
        
        if (data) setTrendingPoints(data);
    };

    const loadExplorePosts = async () => {
        // For MVP, just get recent media posts
        try {
           const { data } = await apiClient.getFeed(undefined, 10);
           // Filter for media posts only for the grid
           const mediaPosts = data.filter((p: any) => p.type === 'image' || p.type === 'video' || p.type === 'reel');
           setExplorePosts(mediaPosts);
        } catch (e) {
            console.log('Failed to load explore feed', e);
        }
    };

    const renderTrendingItem = ({ item }: { item: any }) => (
        <TouchableOpacity style={styles.trendChip}>
            <Text style={styles.trendHash}>#</Text>
            <View>
                <Text style={styles.trendName}>{item.topic.replace('#', '')}</Text>
                <Text style={styles.trendCount}>{item.count} posts</Text>
            </View>
        </TouchableOpacity>
    );

    const renderGridItem = ({ item }: { item: any }) => (
         <TouchableOpacity 
            style={styles.gridItem}
            onPress={() => router.push({ pathname: '/(drawer)/(tabs)/reels', params: { id: item.id } } as any)}
         >
             <Image 
                source={{ uri: item.thumbnailUrl || item.mediaUrl }} 
                style={styles.gridImage} 
             />
             {item.type === 'video' || item.type === 'reel' ? (
                 <View style={styles.playIcon}>
                     <IconSymbol ios_icon_name="play.fill" android_material_icon_name="play-arrow" size={20} color="#FFF" />
                 </View>
             ) : null}
         </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
                    <TextInput 
                        placeholder="Search" 
                        placeholderTextColor={colors.textSecondary}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Trending Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Trending Now</Text>
                    <IconSymbol ios_icon_name="chart.line.uptrend.xyaxis" android_material_icon_name="trending-up" size={20} color={colors.primary} />
                </View>
                
                <FlatList
                    data={trendingPoints}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={renderTrendingItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.trendingList}
                />

                {/* Explore Grid */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Explore</Text>
                </View>
                
                <View style={styles.gridContainer}>
                    {explorePosts.map((item, index) => (
                        <View key={item.id} style={styles.gridItemContainer}>
                            {renderGridItem({ item })}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchContainer: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        height: 40,
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        fontSize: 16,
    },
    scrollContent: {
        paddingBottom: 80,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        marginTop: spacing.lg,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
    },
    trendingList: {
        paddingHorizontal: spacing.md,
        gap: spacing.md,
    },
    trendChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.sm,
        paddingRight: spacing.md,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    trendHash: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 0, 80, 0.1)', // Brand tint
        color: colors.primary,
        textAlign: 'center',
        textAlignVertical: 'center',
        lineHeight: 32, // For iOS centering roughly
        fontWeight: 'bold',
        fontSize: 16,
        overflow: 'hidden', 
        // Note: lineHeight centering is tricky on all platforms, usually View w/ justifyContent is better but Text is fine for MVP
    },
    trendName: {
        fontWeight: '700',
        color: colors.text,
        fontSize: 14,
    },
    trendCount: {
        color: colors.textSecondary,
        fontSize: 12,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 1,
    },
    gridItemContainer: {
        width: '33.33%',
        aspectRatio: 1,
        padding: 1,
    },
    gridItem: {
        flex: 1,
        backgroundColor: colors.card,
    },
    gridImage: {
        width: '100%',
        height: '100%',
    },
    playIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
        padding: 4,
    },
});
