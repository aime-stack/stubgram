import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, typography, shadows } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useWalletStore } from '@/stores/walletStore';
import { WalletTransaction } from '@/types';

const { width } = Dimensions.get('window');

export default function WalletScreen() {
    const insets = useSafeAreaInsets();
    const {
        balance,
        transactions,
        isLoading,
        fetchWallet,
        fetchTransactions,
        deposit,
        withdraw,
        initializeSocket
    } = useWalletStore();

    const [isDepositVisible, setIsDepositVisible] = useState(false);
    const [isWithdrawVisible, setIsWithdrawVisible] = useState(false);
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedTab, setSelectedTab] = useState<'all' | 'in' | 'out'>('all');

    const onRefresh = useCallback(async () => {
        await Promise.all([fetchWallet(), fetchTransactions()]);
    }, [fetchWallet, fetchTransactions]);

    useEffect(() => {
        onRefresh();
        initializeSocket();
    }, [onRefresh, initializeSocket]);

    const validatePhone = (p: string) => {
        const regex = /^07\d{8}$/;
        return regex.test(p);
    };

    const handleDeposit = async () => {
        if (!amount || !phone) {
            Alert.alert('Error', 'Please enter amount and phone number');
            return;
        }
        if (!validatePhone(phone)) {
            Alert.alert('Invalid Phone', 'Please enter a valid Rwanda phone number (e.g. 078xxxxxxx)');
            return;
        }
        await deposit(Number(amount), phone);
        setIsDepositVisible(false);
        setAmount('');
        setPhone('');
    };

    const handleWithdraw = async () => {
        if (!amount || !phone) {
            Alert.alert('Error', 'Please enter amount and phone number');
            return;
        }
        if (!validatePhone(phone)) {
             Alert.alert('Invalid Phone', 'Please enter a valid Rwanda phone number (e.g. 078xxxxxxx)');
             return;
        }
        await withdraw(Number(amount), phone);
        setIsWithdrawVisible(false);
        setAmount('');
        setPhone('');
    };

    const filteredTransactions = transactions.filter(tx => {
        if (selectedTab === 'all') return true;
        if (selectedTab === 'in') return ['deposit', 'reward', 'CASH_IN'].includes(tx.type);
        if (selectedTab === 'out') return ['withdrawal', 'spend', 'CASH_OUT'].includes(tx.type);
        return true;
    });

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                <View style={styles.premiumHeader}>
                    <View>
                        <Text style={styles.premiumTitle}>My Wallet</Text>
                        <Text style={styles.premiumSubtitle}>Manage your earnings and coins</Text>
                    </View>
                </View>

                {/* Balance Card */}
                <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={styles.balanceCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={styles.balanceAmount}>{balance.toLocaleString()} RWF</Text>
                    <View style={styles.balanceActions}>
                        <TouchableOpacity style={styles.headerAction} onPress={() => setIsDepositVisible(true)}>
                            <IconSymbol ios_icon_name="plus.circle.fill" android_material_icon_name="add-circle" size={20} color="#FFF" />
                            <Text style={styles.headerActionText}>Deposit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerAction} onPress={() => setIsWithdrawVisible(true)}>
                            <IconSymbol ios_icon_name="arrow.up.circle.fill" android_material_icon_name="arrow-circle-up" size={20} color="#FFF" />
                            <Text style={styles.headerActionText}>Withdraw</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                {/* Transaction History */}
                <View style={styles.historyHeader}>
                    <Text style={styles.sectionTitle}>Transactions</Text>
                    <View style={styles.tabs}>
                        <TouchableOpacity
                            style={[styles.tab, selectedTab === 'all' && styles.activeTab]}
                            onPress={() => setSelectedTab('all')}
                        >
                            <Text style={[styles.tabText, selectedTab === 'all' && styles.activeTabText]}>All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, selectedTab === 'in' && styles.activeTab]}
                            onPress={() => setSelectedTab('in')}
                        >
                            <Text style={[styles.tabText, selectedTab === 'in' && styles.activeTabText]}>In</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, selectedTab === 'out' && styles.activeTab]}
                            onPress={() => setSelectedTab('out')}
                        >
                            <Text style={[styles.tabText, selectedTab === 'out' && styles.activeTabText]}>Out</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {filteredTransactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No transactions found</Text>
                    </View>
                ) : (
                    filteredTransactions.map((tx) => (
                        <View key={tx.id} style={styles.txItem}>
                            <View style={[styles.txIcon, { backgroundColor: ['deposit', 'reward', 'CASH_IN'].includes(tx.type) ? '#E8F5E9' : '#FFEBEE' }]}>
                                <IconSymbol
                                    ios_icon_name={['deposit', 'reward', 'CASH_IN'].includes(tx.type) ? "arrow.down.left" : "arrow.up.right"}
                                    android_material_icon_name={['deposit', 'reward', 'CASH_IN'].includes(tx.type) ? "arrow-downward" : "arrow-upward"}
                                    size={20}
                                    color={['deposit', 'reward', 'CASH_IN'].includes(tx.type) ? "green" : "red"}
                                />
                            </View>
                            <View style={styles.txInfo}>
                                <View style={styles.txMain}>
                                    <Text style={styles.txDesc}>{tx.description}</Text>
                                    <Text style={[styles.txStatus, { color: tx.status === 'SUCCESS' ? 'green' : tx.status === 'PENDING' ? '#FFA000' : 'red' }]}>
                                        {tx.status}
                                    </Text>
                                </View>
                                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                            </View>
                            <Text style={[styles.txAmount, { color: ['deposit', 'reward', 'CASH_IN'].includes(tx.type) ? "green" : "red" }]}>
                                {['deposit', 'reward', 'CASH_IN'].includes(tx.type) ? '+' : '-'}{tx.amount.toLocaleString()}
                            </Text>
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Deposit Modal */}
            <Modal visible={isDepositVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Deposit Funds</Text>
                        <Text style={styles.modalLabel}>Amount (RWF)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 5000"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                        <Text style={styles.modalLabel}>Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="078xxxxxxx"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.btn, styles.btnSecondary, isLoading && styles.btnDisabled]} 
                                onPress={() => setIsDepositVisible(false)}
                                disabled={isLoading}
                            >
                                <Text style={styles.btnTextSecondary}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.btn, styles.btnPrimary, isLoading && styles.btnDisabled]} 
                                onPress={handleDeposit}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.btnTextPrimary}>Confirm Deposit</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Withdraw Modal */}
            <Modal visible={isWithdrawVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Withdraw Funds</Text>
                        <Text style={styles.modalLabel}>Amount (RWF)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 2000"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                        <Text style={styles.modalLabel}>Target Phone Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="078xxxxxxx"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.btn, styles.btnSecondary, isLoading && styles.btnDisabled]} 
                                onPress={() => setIsWithdrawVisible(false)}
                                disabled={isLoading}
                            >
                                <Text style={styles.btnTextSecondary}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.btn, styles.btnPrimary, isLoading && styles.btnDisabled]} 
                                onPress={handleWithdraw}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.btnTextPrimary}>Confirm Withdrawal</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    premiumHeader: {
        marginBottom: spacing.lg,
    },
    premiumTitle: {
        ...typography.h1,
        color: colors.text,
    },
    premiumSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: 2,
    },
    balanceCard: {
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        marginBottom: spacing.xl,
        ...shadows.md,
    },
    balanceLabel: {
        ...typography.body,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: spacing.xs,
    },
    balanceAmount: {
        ...typography.h1,
        color: '#FFFFFF',
        fontSize: 40,
        fontWeight: 'bold',
        marginBottom: spacing.lg,
    },
    balanceActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    headerAction: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        gap: spacing.xs,
    },
    headerActionText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        padding: 2,
    },
    tab: {
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    activeTab: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#FFF',
    },
    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.card,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.sm,
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
    txMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    txDesc: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    txStatus: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    txDate: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    txAmount: {
        ...typography.h3,
        fontWeight: '700',
    },
    emptyState: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: width * 0.85,
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        ...shadows.lg,
    },
    modalTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    modalLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 4,
        marginLeft: 4,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        color: colors.text,
        marginBottom: spacing.md,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
        gap: spacing.md,
    },
    btn: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    btnPrimary: {
        backgroundColor: colors.primary,
    },
    btnSecondary: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    btnTextPrimary: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    btnTextSecondary: {
        color: colors.textSecondary,
    },
    btnDisabled: {
        opacity: 0.5,
    },
});
