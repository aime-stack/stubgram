
export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string; // Added to match Supabase schema
  phone?: string;
  avatar?: string;
  website?: string; // Added to match Supabase schema
  coverPhoto?: string;
  bio?: string;
  isVerified: boolean;
  isCelebrity: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Post {
  id: string;
  userId: string;
  user: User;
  type: 'text' | 'image' | 'video' | 'audio' | 'poll' | 'link';
  content?: string;
  mediaUrl?: string;
  linkPreview?: LinkPreview;
  pollOptions?: PollOption[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isBoosted: boolean;
  createdAt: string;
  updatedAt: string;
  isSaved?: boolean;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image?: string;
  domain: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  isVoted: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user: User;
  content: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface Story {
  id: string;
  userId: string;
  user: User;
  type: 'image' | 'video' | 'text';
  mediaUrl?: string;
  content?: string;
  backgroundColor?: string;
  expiresAt: string;
  createdAt: string;
  isViewed: boolean;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  content: string;
  mediaUrl?: string;
  isRead: boolean;
  createdAt: string;
  isMine?: boolean;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'reward' | 'purchase' | 'deposit' | 'withdrawal' | 'spend';
  amount: number;
  description: string;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacher: User;
  price: number;
  thumbnail?: string;
  duration: string;
  studentsCount: number;
  rating: number;
  isEnrolled: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'reward';
  actorId: string;
  actor: User;
  postId?: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface VideoSpace {
  id: string;
  hostId: string;
  host: User;
  title: string;
  description?: string;
  type: 'public' | 'private' | 'invite';
  status: 'created' | 'live' | 'ended' | 'archived';
  isAudioOnly: boolean;
  inviteCode?: string;
  maxParticipants: number;
  participantCount: number;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VideoSpaceParticipant {
  id: string;
  spaceId: string;
  userId: string;
  user: User;
  role: 'host' | 'moderator' | 'speaker' | 'viewer';
  isMuted: boolean;
  hasVideo: boolean;
  joinedAt: string;
  lastSeenAt: string;
  leftAt?: string;
}
