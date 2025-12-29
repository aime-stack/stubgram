import { createClient } from '@supabase/supabase-js';

export class AuditService {
    private static _supabase: any = null;

    private static get supabase() {
        if (this._supabase) return this._supabase;

        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('AuditService: Missing Supabase URL or Service Role Key in environment.');
        }

        this._supabase = createClient(supabaseUrl, supabaseServiceKey);
        return this._supabase;
    }
    /**
     * Log a financial action.
     * @param userId User causing the action
     * @param action Type of action
     * @param amount Amount involved
     * @param reference External reference (Paypack ID)
     * @param beforeBalance Balance before tx
     * @param afterBalance Balance after tx
     * @param metadata Any extra info
     */
    static async log(
        userId: string,
        action: 'DEPOSIT' | 'WITHDRAW' | 'ADJUST' | 'SYSTEM_CORRECTION',
        amount: number,
        reference: string,
        beforeBalance: number,
        afterBalance: number,
        metadata: object = {}
    ) {
        try {
            const { error } = await this.supabase
                .from('audit_logs')
                .insert({
                    user_id: userId,
                    action,
                    amount,
                    reference_id: reference,
                    before_balance: beforeBalance,
                    after_balance: afterBalance,
                    metadata,
                    created_at: new Date().toISOString()
                });

            if (error) {
                console.error('FAILED TO AUDIT LOG:', error);
            }
        } catch (err) {
            console.error('AUDIT LOG CRASH:', err);
        }
    }
}
