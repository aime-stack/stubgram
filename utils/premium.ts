import { PremiumPlanId, User } from '@/types';

export interface PremiumPlanConfig {
  id: PremiumPlanId;
  name: string;
  price: number;
  currency: string;
  period: string;
  features: string[];
  gradient: [string, string];
  walletCost?: number;
  highlighted?: boolean;
}

export const PREMIUM_PLANS: PremiumPlanConfig[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: 1,
    currency: 'USD',
    period: 'month',
    features: [
      'Create and share posts',
      'Participate in communities',
      'Standard support',
    ],
    gradient: ['#667eea', '#764ba2'],
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: 2,
    currency: 'USD',
    period: 'month',
    features: [
      'Everything in Basic',
      'Priority support',
      'Eligible to boost posts',
      'Early access to features',
    ],
    gradient: ['#34d399', '#10b981'],
    highlighted: true,
  },
  {
    id: 'premium_plus',
    name: 'Premium Plus Plan',
    price: 5,
    currency: 'USD',
    period: 'month',
    features: [
      'Everything in Premium',
      'Unlimited post boosts',
      'Edit & delete posts anytime',
      'Exclusive badge',
    ],
    gradient: ['#f093fb', '#f5576c'],
  },
];

const planMap: Record<string, PremiumPlanId> = {
  premium_plus: 'premium_plus',
  'premium plus': 'premium_plus',
  vip: 'premium_plus',
  industry: 'premium_plus',
  pro: 'premium_plus',
  premium: 'premium',
  basic: 'basic',
  regular: 'basic',
  free: 'free',
};

export const normalizePremiumPlan = (value?: string | null): PremiumPlanId => {
  if (!value) return 'free';
  const key = value.toString().trim().toLowerCase();
  return planMap[key] || 'free';
};

export const canBoostPosts = (plan: PremiumPlanId) =>
  plan === 'premium' || plan === 'premium_plus';

export const canEditOrDeletePosts = (plan: PremiumPlanId) =>
  plan === 'premium_plus';

const SPECIAL_HANDLES = ['casper', 'sibomana'];

export const isSpecialPremiumUser = (username?: string) => {
  if (!username) return false;
  const normalized = username.replace('@', '').trim().toLowerCase();
  return SPECIAL_HANDLES.includes(normalized);
};

export const withPremiumMetadata = (
  user: User,
  accountTypeValue?: string | null
): User => {
  const sourceAccountType = accountTypeValue ?? user.account_type ?? user.accountType;
  const isSpecial = isSpecialPremiumUser(user.username);
  const premiumPlan = isSpecial ? 'premium_plus' : normalizePremiumPlan(sourceAccountType);

  const nextAccountType: User['accountType'] =
    sourceAccountType === 'regular' || sourceAccountType === 'vip' || sourceAccountType === 'industry'
      ? sourceAccountType
      : user.accountType;

  const nextAccount_type: User['account_type'] =
    sourceAccountType === 'regular' || sourceAccountType === 'premium' || sourceAccountType === 'vip' || sourceAccountType === 'industry'
      ? sourceAccountType
      : user.account_type;

  return {
    ...user,
    accountType: nextAccountType,
    account_type: nextAccount_type,
    premiumPlan,
    isVerified: user.isVerified || isSpecial,
  };
};

