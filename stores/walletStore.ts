
import { create } from 'zustand';
import { WalletTransaction } from '@/types';
import { apiClient } from '@/services/api';
import { socketService } from '@/services/socket';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

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
      const data = response.data.data || [];
      set({ transactions: data });
      console.log('Transactions fetched:', data.length);
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
