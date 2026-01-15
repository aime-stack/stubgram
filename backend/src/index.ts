import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc, sql } from 'drizzle-orm';
import * as schema from './db/schema.js';
import { authMiddleware } from './lib/auth.js';
import { PaypackService } from './services/paypack.js';
import { TranscodeService } from './services/transcode.js';
import { AuditService } from './services/audit.js';

// Database connection
const connectionString = process.env.DATABASE_URL || '';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// Create Fastify instance
const app = Fastify({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
    },
});

// Register Plugins
await app.register(cors, {
    origin: true, // Allow all origins for development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Middleware & Hooks
app.addHook('onRequest', async (request) => {
    app.log.info({ method: request.method, url: request.url, body: request.body }, 'Incoming Request');
});

// Register auth middleware for all routes
app.addHook('preHandler', authMiddleware);

// --- Reels Endpoints ---

// Get Reels Feed
app.get('/reels', async (request: any) => {
    const { page = 1, limit = 10 } = request.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const data = await db.select()
        .from(schema.posts)
        .where(eq(schema.posts.type, 'reel'))
        .orderBy(desc(schema.posts.createdAt))
        .limit(Number(limit))
        .offset(offset);

    return { data, hasMore: data.length === Number(limit) };
});

// Like/Unlike Reel
app.post('/reels/:id/like', async (request: any) => {
    const { id } = request.params as any;
    const userId = (request as any).user?.id || '00000000-0000-0000-0000-000000000000';

    const existing = await db.select()
        .from(schema.reelLikes)
        .where(sql`${schema.reelLikes.reelId} = ${id} AND ${schema.reelLikes.userId} = ${userId}`)
        .limit(1);

    if (existing.length > 0) {
        await db.delete(schema.reelLikes)
            .where(sql`${schema.reelLikes.id} = ${existing[0].id}`);

        await db.update(schema.posts)
            .set({ likesCount: sql`${schema.posts.likesCount} - 1` })
            .where(sql`${schema.posts.id} = ${id} AND ${schema.posts.type} = 'reel'`);

        return { isLiked: false };
    } else {
        await db.insert(schema.reelLikes)
            .values({ reelId: id, userId });

        await db.update(schema.posts)
            .set({ likesCount: sql`${schema.posts.likesCount} + 1` })
            .where(sql`${schema.posts.id} = ${id} AND ${schema.posts.type} = 'reel'`);

        return { isLiked: true };
    }
});

// Record View
app.post('/reels/:id/view', async (request: any) => {
    const { id } = request.params as any;

    await db.update(schema.posts)
        .set({ viewsCount: sql`${schema.posts.viewsCount} + 1` })
        .where(sql`${schema.posts.id} = ${id} AND ${schema.posts.type} = 'reel'`);

    return { success: true };
});

// --- Wallet Endpoints ---

// Get Wallet Balance
app.get('/wallet', async (request: any) => {
    const userId = (request as any).user?.id || '00000000-0000-0000-0000-000000000000';

    let wallet = await db.select()
        .from(schema.wallets)
        .where(eq(schema.wallets.userId, userId))
        .limit(1);

    if (wallet.length === 0) {
        // Create wallet if it doesn't exist
        const [newWallet] = await db.insert(schema.wallets)
            .values({ userId, balance: 0 })
            .returning();
        return { balance: newWallet.balance, currency: newWallet.currency };
    }

    return { balance: wallet[0].balance, currency: wallet[0].currency };
});

// Get Transaction History
app.get('/wallet/transactions', async (request: any) => {
    const userId = (request as any).user?.id || '00000000-0000-0000-0000-000000000000';
    const { page = 1, limit = 20 } = request.query as any;
    const offset = (Number(page) - 1) * Number(limit);

    const data = await db.select()
        .from(schema.transactions)
        .where(eq(schema.transactions.userId, userId))
        .orderBy(desc(schema.transactions.createdAt))
        .limit(Number(limit))
        .offset(offset);

    return { data, hasMore: data.length === Number(limit) };
});

// Deposit (Cash In)
app.post('/wallet/deposit', async (request: any) => {
    const userId = (request as any).user?.id || '00000000-0000-0000-0000-000000000000';
    const { amount, phoneNumber } = request.body as any;

    if (!amount || amount <= 0) throw new Error("Invalid amount");
    if (!phoneNumber) throw new Error("Phone number required");

    // Initiate Paypack CashIn
    const paypackResponse = await PaypackService.cashIn(amount, phoneNumber);

    // Record pending transaction
    await db.insert(schema.transactions)
        .values({
            userId,
            type: 'CASH_IN',
            amount,
            status: 'PENDING',
            paypackId: paypackResponse.ref,
            description: `Deposit via ${phoneNumber}`,
            reference: paypackResponse.ref,
            fees: 0
        });

    return { message: "Deposit initiated. Please check your phone for confirmation.", ref: paypackResponse.ref };
});

// Withdraw (Cash Out)
app.post('/wallet/withdraw', async (request: any) => {
    const userId = (request as any).user?.id || '00000000-0000-0000-0000-000000000000';
    const { amount, phoneNumber } = request.body as any;

    if (!amount || amount <= 0) throw new Error("Invalid amount");
    if (!phoneNumber) throw new Error("Phone number required");

    // Check balance
    const [wallet] = await db.select()
        .from(schema.wallets)
        .where(eq(schema.wallets.userId, userId))
        .limit(1);

    if (!wallet || (wallet.balance ?? 0) < amount) {
        throw new Error("Insufficient balance");
    }

    // Initiate Paypack CashOut
    const paypackResponse = await PaypackService.cashOut(amount, phoneNumber);

    // Record pending transaction
    await db.insert(schema.transactions)
        .values({
            userId,
            type: 'CASH_OUT',
            amount,
            status: 'PENDING',
            paypackId: paypackResponse.ref,
            description: `Withdrawal to ${phoneNumber}`,
            reference: paypackResponse.ref
        });

    return { message: "Withdrawal initiated.", ref: paypackResponse.ref };
});

// Paypack Webhook
app.post('/paypack/webhook', async (request: any, reply: any) => {
    const signature = request.headers['x-paypack-signature'];
    const body = JSON.stringify(request.body);

    if (!PaypackService.verifySignature(body, signature as string)) {
        return reply.status(401).send({ error: 'Invalid signature' });
    }

    const { data } = request.body;
    const ref = data.ref;
    const status = data.status;

    // Find transaction
    const [transaction] = await db.select()
        .from(schema.transactions)
        .where(eq(schema.transactions.paypackId, ref))
        .limit(1);

    if (!transaction) {
        return { message: 'Transaction not found' };
    }

    if (transaction.status !== 'PENDING') {
        return { message: 'Transaction already processed' };
    }

    if (status === 'successful') {
        // Update transaction status
        await db.update(schema.transactions)
            .set({ status: 'SUCCESS' })
            .where(eq(schema.transactions.id, transaction.id));

        // Update Wallet Balance & Audit
        if (transaction.type === 'CASH_IN') {
            const [updatedWallet] = await db.update(schema.wallets)
                .set({ balance: sql`${schema.wallets.balance} + ${transaction.amount}` })
                .where(eq(schema.wallets.userId, transaction.userId))
                .returning({ balance: schema.wallets.balance });

            AuditService.log(
                transaction.userId,
                'DEPOSIT',
                Number(transaction.amount),
                ref,
                Number(updatedWallet.balance) - Number(transaction.amount), // Approx before
                Number(updatedWallet.balance),
                { provider: 'paypack', status: 'SUCCESS' }
            );

        } else if (transaction.type === 'CASH_OUT') {
            const [updatedWallet] = await db.update(schema.wallets)
                .set({ balance: sql`${schema.wallets.balance} - ${transaction.amount}` })
                .where(eq(schema.wallets.userId, transaction.userId))
                .returning({ balance: schema.wallets.balance });

            AuditService.log(
                transaction.userId,
                'WITHDRAW',
                Number(transaction.amount),
                ref,
                Number(updatedWallet.balance) + Number(transaction.amount), // Approx before
                Number(updatedWallet.balance),
                { provider: 'paypack', status: 'SUCCESS' }
            );
        }
    } else {
        await db.update(schema.transactions)
            .set({ status: 'FAILED' })
            .where(eq(schema.transactions.id, transaction.id));
    }

    return { success: true };
});

// --- Background Jobs ---
// Poll for pending reels to transcode every 30 seconds
setInterval(() => {
    TranscodeService.processPendingReels().catch(err => console.error('[Transcode Job Error]', err));
}, 30000);

// Start server
const start = async () => {
    try {
        // Strict Environment Validation
        const requiredVars = ['DATABASE_URL', 'PAYPACK_CLIENT_ID', 'PAYPACK_CLIENT_SECRET'];
        const missingUsers = requiredVars.filter(v => !process.env[v]);
        if (missingUsers.length > 0) {
            throw new Error(`Missing required environment variables: ${missingUsers.join(', ')}`);
        }

        const port = Number(process.env.PORT) || 3000;
        await app.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on port ${port}`);
        console.log(`Paypack Configured with Client ID: ${process.env.PAYPACK_CLIENT_ID?.slice(0, 8)}...`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
