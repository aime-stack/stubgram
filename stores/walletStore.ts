
import { create } from 'zustand';
import { WalletTransaction } from '@/types';
import { apiClient } from '@/services/api';
import { socketService } from '@/services/socket';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';

interface WalletState {
  balance: number;
  transactions: WalletTransaction[];
  isLoading: boolean;
  lastReward: { amount: number; description: string } | null;
  fetchWallet: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  deposit: (amount: number, phoneNumber: string) => Promise<void>;
  withdraw: (amount: number, phoneNumber: string) => Promise<void>;
  initializeSocket: () => void;
  addCoins: (amount: number, description: string, showNotification?: boolean) => void;
  spendCoins: (amount: number, description: string) => boolean;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: 0,
  transactions: [],
  isLoading: false,
  lastReward: null,

  fetchWallet: async () => {
    try {
      set({ isLoading: true });
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;

      // @ts-ignore
      set({ balance: profile?.coins || 0, isLoading: false }); 
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
      set({ isLoading: false });
    }
  },

  fetchTransactions: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: txs, error } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Map to WalletTransaction type
      const mappedTxs: WalletTransaction[] = (txs || []).map(tx => ({
          id: tx.id,
          userId: tx.user_id,
          amount: tx.amount,
          type: tx.amount > 0 ? 'reward' : 'spend', // Simple heuristic
          description: tx.reason,
          status: 'SUCCESS',
          createdAt: tx.created_at
      }));

      set({ transactions: mappedTxs });
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      set({ transactions: [] });
    }
  },

  deposit: async (amount: number, phoneNumber: string) => {
    try {
      set({ isLoading: true });
      await apiClient.deposit(amount, phoneNumber);
      Alert.alert('Success', 'Deposit initiated. Please confirm on your phone.');
      set({ isLoading: false });
    } catch (error: any) {
      Alert.alert('Deposit Failed', error.message || 'Something went wrong');
      set({ isLoading: false });
    }
  },

  withdraw: async (amount: number, phoneNumber: string) => {
    try {
      set({ isLoading: true });
      await apiClient.withdraw(amount, phoneNumber);
      Alert.alert('Success', 'Withdrawal initiated.');
      set({ isLoading: false });
      get().fetchWallet(); // Refresh balance
    } catch (error: any) {
      Alert.alert('Withdrawal Failed', error.message || 'Something went wrong');
      set({ isLoading: false });
    }
  },

  initializeSocket: () => {
    socketService.onWalletUpdate((data) => {
      console.log('Wallet update received in store:', data);
      get().fetchWallet();
      get().fetchTransactions();

      if (data.status === 'SUCCESS') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    });
  },

  addCoins: (amount: number, description: string, showNotification = true) => {
    // Optimistically update or just notify? 
    // V2 Requirement: Backend validation. We should NOT update balance locally 
    // until we fetch it from server. But for UX, we show the notification.
    
    // We do NOT update this.balance here anymore to prevent drift.
    // The socket or next fetch will update it.
    
    console.log(`💰 [Optimistic] +${amount} coins: ${description}`);

    // Haptic feedback for rewards
    if (amount > 0 && showNotification) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Ideally show a toast here
    }
  },

  spendCoins: (amount: number, description: string) => {
    const currentBalance = get().balance;

    if (currentBalance < amount) {
      Alert.alert(
        'Insufficient Balance',
        `You need ${amount} coins but only have ${currentBalance} coins.`,
        [{ text: 'OK' }]
      );
      return false;
    }

    set({ balance: currentBalance - amount });
    console.log(`💸 -${amount} coins: ${description}`);
    return true;
  },
}));
