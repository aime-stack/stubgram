import { User } from './index';

export interface Community {
  id: string;
  creatorId: string;
  creator: User;
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
  coverUrl?: string;
  isPrivate: boolean;
  membersCount: number;
  postsCount: number;
  createdAt: string;
  updatedAt: string;
  isMember?: boolean;
  userRole?: 'admin' | 'moderator' | 'member';
}

export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  user: User;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
}
