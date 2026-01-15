import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { PremiumHeader } from '@/components/PremiumHeader';
import { apiClient } from '@/services/api';
import { CelebrityCard } from '@/components/CelebrityCard';
import { FilterTabs } from '@/components/FilterTabs';
import { User } from '@/types';

export default function CelebritiesScreen() {
    const insets = useSafeAreaInsets();
    const [celebrities, setCelebrities] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        loadCelebrities();
    }, []);

    const loadCelebrities = async () => {
        try {
            const { data } = await apiClient.getCelebrities();
            setCelebrities(data);
        } catch (error) {
            console.error('Failed to load celebrities:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Extract unique categories
    const categories = useMemo(() => {
        const uniqueCats = new Set<string>();
        celebrities.forEach(c => {
            if (c.category) uniqueCats.add(c.category);
        });
        // Default categories if none found (fallback/seed data expectation)
        if (uniqueCats.size === 0) {
            ['Music', 'Business', 'Tech', 'Politics', 'Sports'].forEach(c => uniqueCats.add(c));
        }
        return Array.from(uniqueCats).sort();
    }, [celebrities]);

    // Filter logic
    const filteredCelebrities = useMemo(() => {
        if (selectedCategory === 'All') return celebrities;
        return celebrities.filter(c => c.category === selectedCategory);
    }, [celebrities, selectedCategory]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No celebrities found in this category.</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader 
                title="VIP Celebrity Chat" 
                subtitle="Connect with Rwanda's top influencers"
                iosIconName="star.fill"
                androidIconName="star"
            />

            <View style={styles.content}>
                <FilterTabs 
                    categories={categories} 
                    selected={selectedCategory} 
                    onSelect={setSelectedCategory} 
                />

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredCelebrities}
                        renderItem={({ item }) => <CelebrityCard user={item} />}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={renderEmpty}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingBottom: 40,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
    },
});
