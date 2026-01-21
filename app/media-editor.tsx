import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MediaEditor from '@/components/MediaEditor/MediaEditor';
import { StatusBar } from 'expo-status-bar';

export default function MediaEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    mediaUri: string; 
    mediaType: 'image' | 'video';
    communityId?: string;
    initialType?: 'post' | 'reel';
    filter?: string;
    returnPath?: string;
    initialOverlays?: string;
  }>();

  if (!params.mediaUri) {
    router.back();
    return null;
  }

  const handleSave = (result: { uri: string; metadata: any }) => {
    // Navigate back to the caller with the edited media
    const destination = (params.returnPath as any) || '/create-post';
    
    router.replace({
      pathname: destination,
      params: {
        mediaUri: result.uri,
        mediaType: params.mediaType,
        communityId: params.communityId,
        initialType: params.initialType,
        mediaMetadata: JSON.stringify(result.metadata)
      }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <MediaEditor
        mediaUri={params.mediaUri}
        mediaType={params.mediaType}
        initialFilter={params.filter}
        initialOverlays={params.initialOverlays ? JSON.parse(params.initialOverlays) : undefined}
        onSave={handleSave}
        onCancel={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
