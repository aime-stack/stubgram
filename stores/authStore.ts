
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { withPremiumMetadata } from '@/utils/premium';
import { useFollowStore } from './followStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      console.log('Logging in user:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        console.log('Login successful, user:', data.user.id);
        // Set authenticated immediately
        set({ isAuthenticated: true, isLoading: false });
        // Then load full profile (don't await to avoid blocking navigation)
        get().loadUser().catch(err => console.error('Profile load error:', err));
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  register: async (email: string, password: string, username: string) => {
    try {
      console.log('Registering user:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) throw error;

      // Note: If email confirmation is enabled, the user won't be logged in yet.
      console.log('Registration successful', data);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      console.log('Logging out user');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },

  loadUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }

      // Fetch profile from 'profiles' table which mirrors auth.users
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "Row not found" - might happen if trigger didn't run yet
        console.error('Error loading profile:', error);
      }

      // Map Supabase user + Profile to our User type
      const appUser: User = withPremiumMetadata(
        {
          id: session.user.id,
          email: session.user.email!,
          username: profile?.username || session.user.user_metadata?.username || 'User',
          full_name: profile?.full_name || '',
          avatar: profile?.avatar_url || '',
          phone: '',
          coverPhoto: '',
          bio: profile?.bio || '',
          isVerified: profile?.is_verified || false,
          isCelebrity: profile?.is_celebrity || false,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: session.user.created_at,
          accountType: profile?.account_type || 'regular',
          account_type: profile?.account_type || 'regular',
        },
        profile?.account_type
      );

      set({ user: appUser, isAuthenticated: true, isLoading: false });

      // Hydrate Follow Store
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', session.user.id);
      
      if (follows) {
          const followingIds = follows.map(f => f.following_id);
          useFollowStore.getState().initializeFollowing(followingIds);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  updateUser: (data: Partial<User>) => {
    const currentUser = get().user;
    if (currentUser) {
      set({ user: { ...currentUser, ...data } });
    }
  },
}));
