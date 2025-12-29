import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
    id: uuid('id').primaryKey(),
    username: text('username'),
    avatarUrl: text('avatar_url'),
    isVerified: boolean('is_verified').default(false),
    isCelebrity: boolean('is_celebrity').default(false),
});

export const meetings = pgTable('meetings', {
    id: uuid('id').primaryKey().defaultRandom(),
    host_id: uuid('host_id').notNull().references(() => profiles.id),
    title: text('title').notNull(),
    description: text('description'),
    meetingLink: text('meeting_link').notNull().unique(),
    status: text('status').notNull().default('scheduled'), // 'scheduled', 'live', 'ended'
    type: text('type').notNull().default('group'), // '1-on-1', 'group'
    isPrivate: boolean('is_private').default(false),
    maxParticipants: integer('max_participants').default(100),
    startedAt: timestamp('started_at'),
    endedAt: timestamp('ended_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const meetingParticipants = pgTable('meeting_participants', {
    id: uuid('id').primaryKey().defaultRandom(),
    meetingId: uuid('meeting_id').notNull().references(() => meetings.id),
    userId: uuid('user_id').notNull().references(() => profiles.id),
    role: text('role').notNull().default('participant'), // 'host', 'co-host', 'participant'
    isMuted: boolean('is_muted').default(true),
    hasVideo: boolean('has_video').default(false),
    joinedAt: timestamp('joined_at').defaultNow(),
    leftAt: timestamp('left_at'),
});

export const communities = pgTable('communities', {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorId: uuid('creator_id').notNull().references(() => profiles.id),
    name: text('name').notNull().unique(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    avatarUrl: text('avatar_url'),
    coverUrl: text('cover_url'),
    isPrivate: boolean('is_private').default(false),
    membersCount: integer('members_count').default(1),
    postsCount: integer('posts_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const communityMembers = pgTable('community_members', {
    id: uuid('id').primaryKey().defaultRandom(),
    communityId: uuid('community_id').notNull().references(() => communities.id),
    userId: uuid('user_id').notNull().references(() => profiles.id),
    role: text('role').notNull().default('member'), // 'admin', 'moderator', 'member'
    joinedAt: timestamp('joined_at').defaultNow(),
});

export const ads = pgTable('ads', {
    id: uuid('id').primaryKey().defaultRandom(),
    advertiserId: uuid('advertiser_id').notNull().references(() => profiles.id),
    title: text('title').notNull(),
    content: text('content').notNull(),
    mediaUrl: text('media_url'),
    linkUrl: text('link_url'),
    targetAudience: jsonb('target_audience'),
    budgetRwf: integer('budget_rwf').notNull(),
    durationType: text('duration_type').notNull(), // 'hour', 'day', 'month', 'year'
    startsAt: timestamp('starts_at').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    status: text('status').default('pending'), // 'pending', 'active', 'paused', 'expired'
    impressionsCount: integer('impressions_count').default(0),
    clicksCount: integer('clicks_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
});

export const reels = pgTable('reels', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => profiles.id),
    videoUrl: text('video_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    caption: text('caption'),
    likesCount: integer('likes_count').default(0),
    commentsCount: integer('comments_count').default(0),
    viewsCount: integer('views_count').default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const posts = pgTable('posts', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => profiles.id),
    type: text('type').notNull().default('text'), // 'text', 'image', 'reel', etc.
    content: text('content'),
    mediaUrl: text('image_url'), // Supabase uses image_url for both
    videoUrl: text('video_url'), 
    likesCount: integer('likes_count').default(0),
    commentsCount: integer('comments_count').default(0),
    viewsCount: integer('views_count').default(0),
    processingStatus: text('processing_status').default('READY'),
    originalUrl: text('original_url'),
    processedUrl: text('processed_url'),
    duration: integer('duration'),
    resolution: text('resolution'),
    linkMetadata: jsonb('link_metadata'),
    watermarkApplied: boolean('watermark_applied').default(false),
    communityId: uuid('community_id').references(() => communities.id),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const reelLikes = pgTable('reel_likes', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => profiles.id),
    reelId: uuid('reel_id').notNull().references(() => posts.id),
    createdAt: timestamp('created_at').defaultNow(),
});

export const reelComments = pgTable('reel_comments', {
    id: uuid('id').primaryKey().defaultRandom(),
    reelId: uuid('reel_id').notNull().references(() => posts.id),
    userId: uuid('user_id').notNull().references(() => profiles.id),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const wallets = pgTable('wallets', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().unique().references(() => profiles.id),
    balance: integer('balance').default(0),
    coinsBalance: integer('coins_balance').default(0),
    currency: text('currency').default('RWF'),
    status: text('status').default('active'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const coinTransactions = pgTable('coin_transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => profiles.id),
    amount: integer('amount').notNull(),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

export const transactions = pgTable('transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => profiles.id),
    type: text('type').notNull(), // 'CASH_IN', 'CASH_OUT', 'EARNED', 'SPENT'
    amount: integer('amount').notNull(),
    fees: integer('fees').default(0),
    status: text('status').default('PENDING'), // 'PENDING', 'SUCCESS', 'FAILED'
    paypackId: text('paypack_id'),
    reference: text('reference'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
});
