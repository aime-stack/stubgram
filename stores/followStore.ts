import { create } from 'zustand';

interface FollowState {
  // Set of user IDs that represent who the current user is following
  followedUserIds: Set<string>;
  
  // Actions
  isFollowing: (userId: string) => boolean;
  follow: (userId: string) => void;
  unfollow: (userId: string) => void;
  setFollowingStatus: (userId: string, isFollowing: boolean) => void;
  initializeFollowing: (userIds: string[]) => void;
}

export const useFollowStore = create<FollowState>((set, get) => ({
  followedUserIds: new Set(),

  isFollowing: (userId: string) => {
    return get().followedUserIds.has(userId);
  },

  follow: (userId: string) => {
    set((state) => {
      const newSet = new Set(state.followedUserIds);
      newSet.add(userId);
      return { followedUserIds: newSet };
    });
  },

  unfollow: (userId: string) => {
    set((state) => {
      const newSet = new Set(state.followedUserIds);
      newSet.delete(userId);
      return { followedUserIds: newSet };
    });
  },

  setFollowingStatus: (userId: string, isFollowing: boolean) => {
    if (isFollowing) {
      get().follow(userId);
    } else {
      get().unfollow(userId);
    }
  },

  initializeFollowing: (userIds: string[]) => {
    set({ followedUserIds: new Set(userIds) });
  },
}));
