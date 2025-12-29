import { User } from './index';

export interface Ad {
  id: string;
  advertiserId: string;
  advertiser: User;
  title: string;
  content: string;
  mediaUrl?: string;
  linkUrl?: string;
  budgetRwf: number;
  durationType: 'hour' | 'day' | 'month' | 'year';
  startsAt: string;
  expiresAt: string;
  status: 'pending' | 'active' | 'paused' | 'expired';
  impressionsCount: number;
  clicksCount: number;
  createdAt: string;
}

export interface CoinTransaction {
  id: string;
  userId: string;
  amount: number; // positive = earn, negative = spend
  reason: string;
  createdAt: string;
}
