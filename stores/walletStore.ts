
import { create } from 'zustand';
import { WalletTransaction } from '@/types';
import { apiClient } from '@/services/api';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

interface WalletState {
  balance: number;
  transactions: WalletTransaction[];
  isLoading: boolean;
  lastReward: { amount: number; description: string } | null;
  fetchWallet: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
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
      const response = await apiClient.getWallet();
      set({ balance: response.data.balance, isLoading: false });
      console.log('Wallet fetched:', response.data.balance);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
      // Set default balance if no wallet exists
      set({ balance: 100, isLoading: false });
    }
  },

  fetchTransactions: async () => {
    try {
      const response = await apiClient.getTransactions();
      const responseData = response?.data as { data?: WalletTransaction[] } | undefined;
      const data = responseData?.data || [];
      set({ transactions: data });
      console.log('Transactions fetched:', data.length);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      set({ transactions: [] });
    }
  },

  addCoins: (amount: number, description: string, showNotification = true) => {
    const currentBalance = get().balance;
    const newBalance = currentBalance + amount;

    set({
      balance: newBalance,
      lastReward: { amount, description },
    });

    console.log(`💰 +${amount} coins: ${description} (Balance: ${newBalance})`);

    // Haptic feedback for rewards
    if (amount > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
