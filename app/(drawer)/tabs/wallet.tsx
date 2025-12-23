
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useWalletStore } from '@/stores/walletStore';
import { WalletTransaction } from '@/types';

export default function WalletScreen() {
  const { balance, transactions, isLoading, fetchWallet, fetchTransactions } = useWalletStore();
  const [selectedTab, setSelectedTab] = useState<'all' | 'rewards' | 'payments'>('all');

  const loadWalletData = useCallback(async () => {
    await Promise.all([fetchWallet(), fetchTransactions()]);
  }, [fetchWallet, fetchTransactions]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  const filteredTransactions = (transactions || []).filter((tx) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'rewards') return tx.type === 'reward';
    if (selectedTab === 'payments') return ['deposit', 'withdrawal', 'purchase'].includes(tx.type);
    return true;
  });

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const isPositive = ['reward', 'deposit'].includes(item.type);
    const iconMap: Record<string, { ios: string; android: string }> = {
      reward: { ios: 'star.fill', android: 'star' },
      deposit: { ios: 'arrow.down.circle.fill', android: 'south' },
      withdrawal: { ios: 'arrow.up.circle.fill', android: 'north' },
      purchase: { ios: 'cart.fill', android: 'shopping-cart' },
      spend: { ios: 'bolt.fill', android: 'bolt' },
    };
    const icon = iconMap[item.type] || { ios: 'circle.fill', android: 'circle' };

    return (
      <View style={styles.transactionItem}>
        <View style={[styles.transactionIcon, isPositive ? styles.iconPositive : styles.iconNegative]}>
          <IconSymbol
            ios_icon_name={icon.ios}
            android_material_icon_name={icon.android as any}
            size={24}
            color={isPositive ? colors.highlight : colors.error}
          />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[styles.transactionAmount, isPositive ? styles.amountPositive : styles.amountNegative]}>
          {isPositive ? '+' : '-'}{Math.abs(item.amount)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={styles.balanceCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.balanceLabel}>Snap Coins Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>
              {isLoading ? '...' : balance.toLocaleString()}
            </Text>
            <IconSymbol
              ios_icon_name="dollarsign.circle.fill"
              android_material_icon_name="monetization-on"
              size={32}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.balanceSubtext}>
            Earn coins by engaging with content
          </Text>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <IconSymbol
                ios_icon_name="arrow.down.circle"
                android_material_icon_name="south"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={styles.actionText}>Deposit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <IconSymbol
                ios_icon_name="arrow.up.circle"
                android_material_icon_name="north"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={styles.actionText}>Withdraw</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <IconSymbol
                ios_icon_name="cart"
                android_material_icon_name="shopping-cart"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={styles.actionText}>Buy Coins</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIconContainer}>
              <IconSymbol
                ios_icon_name="bolt"
                android_material_icon_name="bolt"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={styles.actionText}>Boost</Text>
          </TouchableOpacity>
        </View>

        {/* Earning Opportunities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earn More Coins</Text>
          <View style={styles.earningCard}>
            <View style={styles.earningItem}>
              <IconSymbol
                ios_icon_name="square.and.pencil"
                android_material_icon_name="edit"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.earningText}>Post content</Text>
              <Text style={styles.earningCoins}>+10 🪙</Text>
            </View>
            <View style={styles.earningItem}>
              <IconSymbol
                ios_icon_name="heart"
                android_material_icon_name="favorite"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.earningText}>Like posts</Text>
              <Text style={styles.earningCoins}>+1 🪙</Text>
            </View>
            <View style={styles.earningItem}>
              <IconSymbol
                ios_icon_name="bubble.left"
                android_material_icon_name="chat-bubble"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.earningText}>Comment</Text>
              <Text style={styles.earningCoins}>+5 🪙</Text>
            </View>
            <View style={styles.earningItem}>
              <IconSymbol
                ios_icon_name="arrow.turn.up.right"
                android_material_icon_name="share"
                size={20}
                color={colors.accent}
              />
              <Text style={styles.earningText}>Share posts</Text>
              <Text style={styles.earningCoins}>+3 🪙</Text>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>

          {/* Tabs */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
              onPress={() => setSelectedTab('all')}
            >
              <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'rewards' && styles.tabActive]}
              onPress={() => setSelectedTab('rewards')}
            >
              <Text style={[styles.tabText, selectedTab === 'rewards' && styles.tabTextActive]}>
                Rewards
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'payments' && styles.tabActive]}
              onPress={() => setSelectedTab('payments')}
            >
              <Text style={[styles.tabText, selectedTab === 'payments' && styles.tabTextActive]}>
                Payments
              </Text>
            </TouchableOpacity>
          </View>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol
                ios_icon_name="tray"
                android_material_icon_name="inbox"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {filteredTransactions.map((item, index) => (
                <React.Fragment key={index}>
                  {renderTransaction({ item })}
                </React.Fragment>
              ))}
            </View>
          )}
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
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.xxl + 20,
    paddingBottom: 120,
  },
  balanceCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  balanceLabel: {
    ...typography.caption,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: spacing.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceSubtext: {
    ...typography.caption,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  actionText: {
    ...typography.caption,
    color: colors.text,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  earningCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  earningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  earningText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  earningCoins: {
    ...typography.body,
    fontWeight: '600',
    color: colors.accent,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  transactionsList: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    ...shadows.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconPositive: {
    backgroundColor: `${colors.highlight}20`,
  },
  iconNegative: {
    backgroundColor: `${colors.error}20`,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    ...typography.body,
    color: colors.text,
    marginBottom: 2,
  },
  transactionDate: {
    ...typography.small,
    color: colors.textSecondary,
  },
  transactionAmount: {
    ...typography.body,
    fontWeight: '700',
  },
  amountPositive: {
    color: colors.highlight,
  },
  amountNegative: {
    color: colors.error,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
