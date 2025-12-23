
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, typography, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiClient } from '@/services/api';
import { useWalletStore } from '@/stores/walletStore';
import * as Haptics from 'expo-haptics';

type StoryType = 'image' | 'video' | 'text';

const BACKGROUND_COLORS = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FFEAA7',
    '#DDA0DD',
    '#98D8C8',
    '#F7DC6F',
];

export default function CreateStoryScreen() {
    const router = useRouter();
    const { addCoins } = useWalletStore();
    const [storyType, setStoryType] = useState<StoryType>('image');
    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [textContent, setTextContent] = useState('');
    const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_COLORS[0]);
    const [isLoading, setIsLoading] = useState(false);

    const handlePickImage = async (useCamera: boolean) => {
        try {
            let result;

            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission needed', 'Camera permission is required to take photos');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: storyType === 'video' ? ['videos'] : ['images'],
                    allowsEditing: true,
                    aspect: [9, 16],
                    quality: 0.8,
                    videoMaxDuration: 30,
                });
            } else {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: storyType === 'video' ? ['videos'] : ['images'],
                    allowsEditing: true,
                    aspect: [9, 16],
                    quality: 0.8,
                    videoMaxDuration: 30,
                });
            }

            if (!result.canceled && result.assets[0]) {
                setMediaUri(result.assets[0].uri);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
        } catch (error) {
            console.error('Failed to pick media:', error);
            Alert.alert('Error', 'Failed to pick media');
        }
    };

    const handleCreateStory = async () => {
        if (storyType === 'text' && !textContent.trim()) {
            Alert.alert('Error', 'Please add some text');
            return;
        }
        if ((storyType === 'image' || storyType === 'video') && !mediaUri) {
            Alert.alert('Error', 'Please select an image or video');
            return;
        }

        setIsLoading(true);
        try {
            await apiClient.createStory({
                type: storyType,
                mediaUri: mediaUri || undefined,
                content: storyType === 'text' ? textContent.trim() : undefined,
                backgroundColor: storyType === 'text' ? backgroundColor : undefined,
            });

            // Reward user with coins
            addCoins(5, 'Created a story');

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Story created! +5 🪙', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error) {
            console.error('Failed to create story:', error);
            Alert.alert('Error', 'Failed to create story. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: 'Create Story',
                    headerShown: true,
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={handleCreateStory}
                            disabled={isLoading}
                            style={styles.shareButton}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={styles.shareButtonText}>Share</Text>
                            )}
                        </TouchableOpacity>
                    ),
                }}
            />

            {/* Story Type Selector */}
            <View style={styles.typeSelector}>
                {(['image', 'video', 'text'] as StoryType[]).map((type) => (
                    <TouchableOpacity
                        key={type}
                        style={[
                            styles.typeButton,
                            storyType === type && styles.typeButtonActive,
                        ]}
                        onPress={() => {
                            setStoryType(type);
                            setMediaUri(null);
                            setTextContent('');
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                    >
                        <Text
                            style={[
                                styles.typeButtonText,
                                storyType === type && styles.typeButtonTextActive,
                            ]}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content Area */}
            <View style={styles.content}>
                {storyType === 'text' ? (
                    <View style={[styles.textPreview, { backgroundColor }]}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Type your story..."
                            placeholderTextColor="rgba(255,255,255,0.7)"
                            value={textContent}
                            onChangeText={setTextContent}
                            multiline
                            maxLength={200}
                            autoFocus
                        />
                    </View>
                ) : mediaUri ? (
                    <View style={styles.mediaPreview}>
                        <Image source={{ uri: mediaUri }} style={styles.mediaImage} />
                        <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => setMediaUri(null)}
                        >
                            <IconSymbol
                                ios_icon_name="xmark.circle.fill"
                                android_material_icon_name="cancel"
                                size={32}
                                color={colors.error}
                            />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.pickMediaContainer}>
                        <IconSymbol
                            ios_icon_name={storyType === 'video' ? 'video.fill' : 'camera.fill'}
                            android_material_icon_name={storyType === 'video' ? 'videocam' : 'photo-camera'}
                            size={64}
                            color={colors.textSecondary}
                        />
                        <Text style={styles.pickMediaTitle}>
                            Add {storyType === 'video' ? 'Video' : 'Photo'}
                        </Text>
                        <Text style={styles.pickMediaSubtitle}>
                            Take a new {storyType} or choose from gallery
                        </Text>
                    </View>
                )}
            </View>

            {/* Background Colors (for text stories) */}
            {storyType === 'text' && (
                <View style={styles.colorPicker}>
                    {BACKGROUND_COLORS.map((color) => (
                        <TouchableOpacity
                            key={color}
                            style={[
                                styles.colorOption,
                                { backgroundColor: color },
                                backgroundColor === color && styles.colorOptionSelected,
                            ]}
                            onPress={() => setBackgroundColor(color)}
                        />
                    ))}
                </View>
            )}

            {/* Action Buttons (for image/video) */}
            {(storyType === 'image' || storyType === 'video') && !mediaUri && (
                <View style={styles.buttons}>
                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => handlePickImage(true)}
                    >
                        <IconSymbol
                            ios_icon_name="camera.fill"
                            android_material_icon_name="photo-camera"
                            size={24}
                            color="#FFFFFF"
                        />
                        <Text style={styles.buttonText}>Take {storyType === 'video' ? 'Video' : 'Photo'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.secondaryButton]}
                        onPress={() => handlePickImage(false)}
                    >
                        <IconSymbol
                            ios_icon_name="photo.fill"
                            android_material_icon_name="photo-library"
                            size={24}
                            color={colors.primary}
                        />
                        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                            Choose from Gallery
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    shareButton: {
        paddingHorizontal: spacing.md,
    },
    shareButtonText: {
        ...typography.body,
        color: colors.primary,
        fontWeight: '600',
    },
    typeSelector: {
        flexDirection: 'row',
        padding: spacing.md,
        gap: spacing.sm,
    },
    typeButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: borderRadius.md,
        backgroundColor: colors.card,
    },
    typeButtonActive: {
        backgroundColor: colors.primary,
    },
    typeButtonText: {
        ...typography.body,
        color: colors.text,
        fontWeight: '500',
    },
    typeButtonTextActive: {
        color: '#FFFFFF',
    },
    content: {
        flex: 1,
        margin: spacing.md,
    },
    textPreview: {
        flex: 1,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textInput: {
        ...typography.h2,
        color: '#FFFFFF',
        textAlign: 'center',
        width: '100%',
    },
    mediaPreview: {
        flex: 1,
        position: 'relative',
    },
    mediaImage: {
        flex: 1,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.border,
    },
    removeButton: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
    },
    pickMediaContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickMediaTitle: {
        ...typography.h2,
        color: colors.text,
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    pickMediaSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    colorPicker: {
        flexDirection: 'row',
        padding: spacing.md,
        gap: spacing.sm,
        justifyContent: 'center',
    },
    colorOption: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    colorOptionSelected: {
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    buttons: {
        padding: spacing.md,
        gap: spacing.md,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        gap: spacing.sm,
    },
    buttonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.primary,
    },
    secondaryButtonText: {
        color: colors.primary,
    },
});
