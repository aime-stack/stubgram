
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/services/api';
import { supabase } from '@/lib/supabase';

export default function EditProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, updateUser } = useAuthStore();

    const [isSaving, setIsSaving] = useState(false);
    const [username, setUsername] = useState(user?.username || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [coverUri, setCoverUri] = useState<string | null>(null); // Placeholder for future cover image support

    const handlePickImage = async (type: 'avatar' | 'cover') => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: type === 'avatar' ? [1, 1] : [3, 1],
                quality: 0.8,
            });

            if (!result.canceled) {
                if (type === 'avatar') {
                    setAvatarUri(result.assets[0].uri);
                } else {
                    setCoverUri(result.assets[0].uri);
                }
            }
        } catch (error) {
            console.error('Failed to pick image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let avatarUrl = user?.avatar;
            let coverUrl = user?.coverPhoto; // Keep existing cover if not changed

            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                Alert.alert('Error', 'You must be logged in to update your profile');
                return;
            }

            // Upload new avatar if changed
            if (avatarUri) {
                avatarUrl = await apiClient.uploadMedia(
                    avatarUri,
                    'avatars',
                    `${authUser.id}/avatar_${Date.now()}`
                );
            }

            // Upload new cover image if changed
            if (coverUri) {
                // Ensure authUser id is used properly
                coverUrl = await apiClient.uploadMedia(
                    coverUri,
                    'avatars', // Using avatars bucket for cover too, or specific 'covers' bucket if available. Stick to what works.
                    `${authUser.id}/cover_${Date.now()}`
                );
            }

            // Update user profile
            const updatedUser = await apiClient.updateProfile({
                username,
                bio,
                avatar: avatarUrl,
                coverPhoto: coverUrl,
            });

            updateUser(updatedUser);
            router.back();
            Alert.alert("Success", "Profile updated successfully!");

        } catch (error) {
            console.error('Failed to update profile:', error);
            Alert.alert('Error', 'Failed to update profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveButton}>
                    {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Cover Image Area */}
                <TouchableOpacity onPress={() => handlePickImage('cover')} style={styles.coverImageContainer}>
                    <Image
                        source={{ uri: coverUri || user?.coverPhoto || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800' }}
                        style={styles.coverImage}
                    />
                    <View style={styles.cameraOverlay}>
                        <IconSymbol ios_icon_name="camera" android_material_icon_name="camera-alt" size={24} color="#FFF" />
                    </View>
                </TouchableOpacity>

                {/* Avatar Area */}
                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={() => handlePickImage('avatar')}>
                        <Image
                            source={{ uri: avatarUri || user?.avatar || 'https://via.placeholder.com/100' }}
                            style={styles.avatar}
                        />
                        <View style={styles.avatarCameraOverlay}>
                            <IconSymbol ios_icon_name="camera" android_material_icon_name="camera-alt" size={20} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Name"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Bio</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Add a bio to your profile"
                            placeholderTextColor={colors.textSecondary}
                            multiline
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Location</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Location"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Website</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Website"
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    cancelButton: {
        padding: spacing.sm,
    },
    cancelText: {
        ...typography.body,
        color: colors.text,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.text,
    },
    saveButton: {
        padding: spacing.sm,
        backgroundColor: colors.text, // Black button like Twitter
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.lg,
    },
    saveText: {
        ...typography.body,
        fontWeight: '700',
        color: colors.background,
    },
    content: {
        // paddingBottom: 50,
    },
    coverImageContainer: {
        height: 150,
        backgroundColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
        opacity: 0.6,
    },
    cameraOverlay: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 8,
        borderRadius: 20,
    },
    avatarContainer: {
        marginTop: -40,
        marginLeft: spacing.md,
        marginBottom: spacing.md,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: colors.background,
    },
    avatarCameraOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -10 }, { translateY: -10 }],
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 6,
        borderRadius: 15,
    },
    form: {
        padding: spacing.md,
        gap: spacing.lg,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    label: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    input: {
        ...typography.body,
        color: colors.text,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: spacing.sm,
    },
    textArea: {
        minHeight: 60,
        textAlignVertical: 'top',
    },
});
