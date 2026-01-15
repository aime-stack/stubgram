import crypto from 'crypto';

export class PaypackService {
    private static API_URL = 'https://payments.paypack.rw/api';
    private static clientId = process.env.PAYPACK_CLIENT_ID || '';
    private static clientSecret = process.env.PAYPACK_CLIENT_SECRET || '';
    private static webhookSecret = process.env.PAYPACK_WEBHOOK_SECRET || process.env.PAYPACK_CLIENT_SECRET || '';

    private static token: string | null = null;
    private static tokenExpiresAt: number = 0;

    static async getAccessToken(): Promise<string> {
        if (this.token && Date.now() < this.tokenExpiresAt) {
            return this.token;
        }

        if (!this.clientId || !this.clientSecret) {
            console.error('[PaypackService] Missing credentials', { 
                hasId: !!this.clientId, 
                hasSecret: !!this.clientSecret 
            });
            throw new Error('Paypack Auth Failed: Missing PAYPACK_CLIENT_ID or PAYPACK_CLIENT_SECRET');
        }

        const response = await fetch(`${this.API_URL}/auth/agents/authorize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: this.clientId,
                client_secret: this.clientSecret,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[PaypackService] Auth Error Detail:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Paypack Auth Failed: ${errorText}`);
        }

        const data = await response.json() as any;
        console.log('[PaypackService] Auth Successful');
        this.token = data.access;
        this.tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // Buffer 1 min
        return this.token as string;
    }

    static async cashIn(amount: number, phone: string): Promise<{ ref: string;[key: string]: any }> {
        const token = await this.getAccessToken();
        const response = await fetch(`${this.API_URL}/transactions/cashin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ amount, number: phone }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Paypack CashIn Failed: ${error}`);
        }

        return await response.json() as any;
    }

    static async cashOut(amount: number, phone: string): Promise<{ ref: string;[key: string]: any }> {
        const token = await this.getAccessToken();
        const response = await fetch(`${this.API_URL}/transactions/cashout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ amount, number: phone }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Paypack CashOut Failed: ${error}`);
        }

        return await response.json() as any;
    }

    static verifySignature(body: string, signature: string) {
        const hmac = crypto.createHmac('sha256', this.webhookSecret);
        const calculated = hmac.update(body).digest('hex');
        return calculated === signature;
    }
}
