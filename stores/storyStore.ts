import { create } from 'zustand';
import { apiClient } from '@/services/api';
import { Story, User } from '@/types';

export interface StoryGroup {
  user: User;
  stories: Story[];
  hasUnseen: boolean;
  latestCreatedAt: string;
}

interface StoryState {
  storyGroups: StoryGroup[];
  isLoading: boolean;
  error: string | null;
  
  fetchStories: () => Promise<void>;
  markAsViewed: (storyId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  storyGroups: [],
  isLoading: false,
  error: null,

  fetchStories: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await apiClient.getStoriesFeed();
      set({ storyGroups: data, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch stories:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  markAsViewed: async (storyId: string) => {
    // Optimistically update state
    set(state => {
      const newGroups = state.storyGroups.map(group => {
        const storyIndex = group.stories.findIndex(s => s.id === storyId);
        if (storyIndex === -1) return group;

        const updatedStories = [...group.stories];
        updatedStories[storyIndex] = { ...updatedStories[storyIndex], isViewed: true };
        
        const hasUnseen = updatedStories.some(s => !s.isViewed);
        
        return {
          ...group,
          stories: updatedStories,
          hasUnseen
        };
      });
      
      return { storyGroups: newGroups };
    });

    // Call API in background
    try {
      await apiClient.markStoryAsViewed(storyId);
    } catch (error) {
      console.error('Failed to sync viewed state:', error);
    }
  },

  refresh: async () => {
    await get().fetchStories();
  },
}));
