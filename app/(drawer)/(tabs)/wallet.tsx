
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useWalletStore } from '@/stores/walletStore';

export default function WalletScreen() {
    const insets = useSafeAreaInsets();
    const { balance, transactions } = useWalletStore();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Wallet</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Total Balance</Text>
                    <Text style={styles.balanceAmount}>{balance} 🪙</Text>
                    <TouchableOpacity style={styles.topUpButton}>
                        <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={20} color="#FFF" />
                        <Text style={styles.topUpText}>Top Up</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsGrid}>
                    <TouchableOpacity style={styles.actionItem}>
                        <View style={styles.actionIcon}>
                            <IconSymbol ios_icon_name="arrow.up.right" android_material_icon_name="call-made" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.actionLabel}>Send</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionItem}>
                        <View style={styles.actionIcon}>
                            <IconSymbol ios_icon_name="arrow.down.left" android_material_icon_name="call-received" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.actionLabel}>Receive</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionItem}>
                        <View style={styles.actionIcon}>
                            <IconSymbol ios_icon_name="clock" android_material_icon_name="history" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.actionLabel}>History</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionItem}>
                        <View style={styles.actionIcon}>
                            <IconSymbol ios_icon_name="gift" android_material_icon_name="card-giftcard" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.actionLabel}>Rewards</Text>
                    </TouchableOpacity>
                </View>

                {/* Recent Transactions */}
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <View style={styles.transactionsList}>
                    {transactions.length === 0 ? (
                        <Text style={styles.emptyText}>No transactions yet</Text>
                    ) : (
                        transactions.map((tx) => (
                            <View key={tx.id} style={styles.txItem}>
                                <View style={[styles.txIcon, { backgroundColor: ['deposit', 'reward'].includes(tx.type) ? '#E8F5E9' : '#FFEBEE' }]}>
                                    <IconSymbol
                                        ios_icon_name={['deposit', 'reward'].includes(tx.type) ? "arrow.down.left" : "arrow.up.right"}
                                        android_material_icon_name={['deposit', 'reward'].includes(tx.type) ? "arrow-downward" : "arrow-upward"}
                                        size={20}
                                        color={['deposit', 'reward'].includes(tx.type) ? "green" : "red"}
                                    />
                                </View>
                                <View style={styles.txInfo}>
                                    <Text style={styles.txDesc}>{tx.description}</Text>
                                    <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                                </View>
                                <Text style={[styles.txAmount, { color: ['deposit', 'reward'].includes(tx.type) ? "green" : "red" }]}>
                                    {['deposit', 'reward'].includes(tx.type) ? '+' : '-'}{tx.amount}
                                </Text>
                            </View>
                        ))
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
    header: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    title: {
        ...typography.h1,
        color: colors.text,
    },
    content: {
        padding: spacing.md,
    },
    balanceCard: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        marginBottom: spacing.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    balanceLabel: {
        ...typography.body,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: spacing.xs,
    },
    balanceAmount: {
        ...typography.h1,
        color: '#FFFFFF',
        fontSize: 36,
        marginBottom: spacing.lg,
    },
    topUpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        gap: spacing.sm,
    },
    topUpText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    actionItem: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    actionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionLabel: {
        ...typography.caption,
        color: colors.text,
        fontWeight: '500',
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.md,
    },
    transactionsList: {
        gap: spacing.md,
    },
    emptyText: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.lg,
    },
    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    txIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    txInfo: {
        flex: 1,
    },
    txDesc: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    txDate: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    txAmount: {
        ...typography.h3,
        fontWeight: '600',
    },
});
