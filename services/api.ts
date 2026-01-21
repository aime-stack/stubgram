
import { supabase } from '@/lib/supabase';
import { Post, Reel, Story, User, Comment, Notification } from '@/types';
import { withPremiumMetadata } from '@/utils/premium';
import * as FileSystem from 'expo-file-system';

class ApiClient {
  private backendUrl = process.env.EXPO_PUBLIC_API_URL || 'https://v6r7hhgft77nghz9ncgpb9mfgkx69bg4.app.specular.dev';
  // Cache for profiles to avoid refetching
  private profileCache: Map<string, User> = new Map();

  // Helper to reliably get current user - uses cached session first
  private async getCurrentUser(): Promise<{ id: string } | null> {
    // First try getSession which uses cached in-memory session (faster)
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      return session.user;
    }

    // Fallback to getUser (makes network call)
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }

  // Helper that throws if not authenticated
  private async requireAuth(): Promise<{ id: string }> {
    const user = await this.getCurrentUser();
    if (!user) {
      console.warn('[ApiClient] requireAuth failed: No user found');
      throw new Error('Not authenticated');
    }
    console.log('[ApiClient] requireAuth success for user:', user.id);
    return user;
  }

  // --- Media Upload ---
  // --- Media Upload ---
  async uploadMedia(
    uri: string,
    bucket: 'posts' | 'reels' | 'stories' | 'avatars' | 'courses',
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      // Determine content type
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      let contentType = 'image/jpeg';
      if (ext === 'png') contentType = 'image/png';
      if (ext === 'mp4' || ext === 'mov') contentType = 'video/mp4';

      const filePath = `${fileName}.${ext}`;
      
      // Construct Supabase Storage URL
      // Pattern: https://<project>.supabase.co/storage/v1/object/<bucket>/<path>
      // We need to strip the /storage/v1... part if supabaseUrl already has it, but usually standard is:
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!token || !apiKey) throw new Error('Auth tokens missing for upload');

      // Native Upload (Memory Safe)
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: apiKey,
          'Content-Type': contentType,
          'x-upsert': 'true', // Overwrite if exists
        },
        uploadType: (FileSystem as any).FileSystemUploadType?.BINARY_CONTENT ?? (FileSystem as any).UploadType?.BINARY_CONTENT ?? 0,
      });

      if (uploadResult.status !== 200) {
        throw new Error(`Upload failed with status ${uploadResult.status}: ${uploadResult.body}`);
      }

      // If success, get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // Simulate progress if not provided by FileSystem (FileSystem.uploadAsync doesn't support progress callback natively in managed workflow easily without task manager, 
      // BUT for this phase we really want to avoid memory crash. 
      // To get progress with FileSystem, we need createUploadTask. Let's switch to that.
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }

  // Improved version with Progress (using createUploadTask)
  async uploadMediaWithProgress(
    uri: string,
    bucket: 'posts' | 'reels' | 'stories' | 'avatars' | 'courses',
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      let contentType = 'image/jpeg';
      if (ext === 'png') contentType = 'image/png';
      if (ext === 'mp4' || ext === 'mov') contentType = 'video/mp4';

      const filePath = `${fileName}.${ext}`;
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${filePath}`;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const apiKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      if (!token || !apiKey) throw new Error('Auth tokens missing');

      const task = FileSystem.createUploadTask(
        uploadUrl,
        uri,
        {
          httpMethod: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: apiKey,
            'Content-Type': contentType,
            'x-upsert': 'true',
          },
          uploadType: (FileSystem as any).FileSystemUploadType?.BINARY_CONTENT ?? (FileSystem as any).UploadType?.BINARY_CONTENT ?? 0,
        },
        (data: any) => {
          if (onProgress) {
             const progress = data.totalBytesSent / data.totalBytesExpectedToSend;
             onProgress(Math.round(progress * 100));
          }
        }
      );

      const result = await task.uploadAsync();
      
      if (!result || result.status !== 200) {
        throw new Error(`Upload failed: ${result?.body}`);
      }

       const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return urlData.publicUrl;
  }

  // --- Auth ---
  async getMe() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No session');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) throw error;
    return { data: this.mapProfile(profile) };
  }

  // --- Posts ---

  async createPost(data: {
    type: string;
    content?: string;
    mediaUrl?: string; // Single media (legacy)
    videoUrl?: string; // video_url
    thumbnailUrl?: string;
    linkUrl?: string;
    linkMetadata?: any;
    mediaMetadata?: any;
    pollOptions?: string[];
    communityId?: string;
    aspectRatio?: number;
    originalMetadata?: any;
    mediaUrls?: Array<{ url: string; type: 'image' | 'video'; aspectRatio: number }>; // Carousel support
    feeling?: string;
  }) {
    const user = await this.requireAuth();

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        community_id: data.communityId,
        type: data.type,
        content: data.content,
        image_url: data.mediaUrl,
        video_url: data.videoUrl,
        thumbnail_url: data.thumbnailUrl,
        link_url: data.linkUrl,
        link_metadata: data.linkMetadata,
        // Store feeling in media_metadata along with other metadata
        media_metadata: { ...data.mediaMetadata, feeling: data.feeling },
        poll_options: data.pollOptions ? JSON.stringify(
            data.pollOptions.map((opt, idx) => ({
                id: `opt_${Date.now()}_${idx}`, 
                text: opt, 
                votes: 0, 
                isVoted: false 
            }))
        ) : undefined,
        aspect_ratio: data.aspectRatio,
        original_metadata: data.originalMetadata,
        media_urls: data.mediaUrls ? JSON.stringify(data.mediaUrls) : undefined,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Fetch the user's profile separately
    const profile = await this.getProfileById(user.id);

    return { data: this.mapPost(post, profile) };
  }

  async incrementPostView(postId: string) {
      try {
          // simple increment
          const { data: post } = await supabase.from('posts').select('views_count').eq('id', postId).single();
          if (post) {
            await supabase.from('posts').update({ views_count: (post.views_count || 0) + 1 }).eq('id', postId);
          }
      } catch (error) {
          console.error("Failed to increment view", error);
      }
  }

  async votePoll(postId: string, optionIndex: number) {
      await this.requireAuth();
      
      const { data: post, error } = await supabase
        .from('posts')
        .select('poll_options')
        .eq('id', postId)
        .single();
      
      if (error || !post) throw new Error("Post not found");
      
      let options: any[] = [];
      try {
          options = typeof post.poll_options === 'string' ? JSON.parse(post.poll_options) : post.poll_options;
      } catch (e) {
          throw new Error("Invalid poll data");
      }

      if (!options || !options[optionIndex]) throw new Error("Invalid option");

      options[optionIndex].votes = (options[optionIndex].votes || 0) + 1;
      
      const { error: updateError } = await supabase
        .from('posts')
        .update({ 
            poll_options: JSON.stringify(options) 
        })
        .eq('id', postId);

    if (updateError) throw updateError;
    return { success: true };
  }

  async getFeed(cursor?: string, limit: number = 10) {
    let query = supabase
      .from('posts')
      .select('*')
      .is('community_id', null) // Exclude community posts from home feed
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: posts, error } = await query;

  if (error) throw error;
  if (!posts || posts.length === 0) {
    return { data: [], hasMore: false };
  }

  // Get unique user IDs from posts (including authors of reshared posts if available)
  const userIds = new Set(posts.map((p) => p.user_id));
  const resharedPostIds = posts
    .filter((p) => p.reshared_from)
    .map((p) => p.reshared_from);

  // Fetch original posts if there are any reshares
  let originalPostsMap = new Map();
  if (resharedPostIds.length > 0) {
      const { data: originalPosts } = await supabase
          .from('posts')
          .select('*')
          .in('id', resharedPostIds);
      
      if (originalPosts) {
          originalPosts.forEach(op => {
              originalPostsMap.set(op.id, op);
              userIds.add(op.user_id); // Add original author to profile fetch list
          });
      }
  }

  // Fetch all profiles at once
  const profiles = await this.getProfilesByIds([...userIds]);
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  return {
    data: posts.map((p) => {
        let originalPost = undefined;
        if (p.reshared_from) {
            const op = originalPostsMap.get(p.reshared_from);
            if (op) {
                // Map the nested original post recursively (without infinite depth)
                originalPost = this.mapPost(op, profileMap.get(op.user_id));
            }
        }
        return this.mapPost(p, profileMap.get(p.user_id), originalPost);
    }),
    hasMore: posts.length === limit,
    nextCursor: posts.length > 0 ? posts[posts.length - 1].created_at : null
  };
}

  async fetchLinkMetadata(url: string): Promise<{
    url: string;
    title: string | null;
    description: string | null;
    image: string | null;
    favicon: string | null;
    siteName: string | null;
    domain: string | null;
    content: string | null;
    canonicalUrl: string | null;
    status: 'success' | 'partial' | 'failed';
    error: string | null;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second client-side timeout

    try {
      const response = await fetch(`${this.backendUrl}/link-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Return graceful degradation instead of throwing
      let domain: string | null = null;
      try {
        domain = new URL(url).hostname;
      } catch {
        // Invalid URL
      }
      
      return {
        url,
        title: null,
        description: null,
        image: null,
        favicon: null,
        siteName: domain,
        domain,
        content: null,
        canonicalUrl: null,
        status: 'failed',
        error: error.name === 'AbortError' ? 'Request timeout' : (error.message || 'Unknown error'),
      };
    }
  }



  async getPost(postId: string) {
    const { data: post, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error) throw error;

    const profile = await this.getProfileById(post.user_id);
    return { data: this.mapPost(post, profile) };
  }

  async deletePost(postId: string) {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
    return { success: true };
  }

  async updatePost(postId: string, updates: { content?: string }) {
    const user = await this.requireAuth();

    const { data: post, error } = await supabase
      .from('posts')
      .update({
        content: updates.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', user.id) // Ensure user owns the post
      .select('*')
      .single();

    if (error) throw error;
    if (!post) throw new Error('Post not found or unauthorized');

    const profile = await this.getProfileById(user.id);
    return { data: this.mapPost(post, profile) };
  }

  async reportPost(postId: string, reason: string, details?: string) {
    const user = await this.requireAuth();

    const { error } = await supabase
      .from('reports')
      .insert({
        reporter_id: user.id,
        post_id: postId,
        reason,
        details,
        status: 'pending',
      });

    if (error) throw error;
    return { success: true };
  }

  async boostPost(
    postId: string,
    durationDays: number,
    paymentMethod: 'coins' | 'rwf',
    amount: number
  ) {
    const user = await this.requireAuth();

    // Verify user owns the post
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (!post || post.user_id !== user.id) {
      throw new Error('Post not found or unauthorized');
    }

    if (paymentMethod === 'coins') {
      // Deduct coins from wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('coins_balance')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.coins_balance < amount) {
        throw new Error('Insufficient coins balance');
      }

      // Update wallet
      await supabase
        .from('wallets')
        .update({ coins_balance: wallet.coins_balance - amount })
        .eq('user_id', user.id);
    }
    // For 'rwf', payment integration would go here (Paypack, etc.)

    // Set boost expiration
    const boostExpiresAt = new Date();
    boostExpiresAt.setDate(boostExpiresAt.getDate() + durationDays);

    // Update post to mark as boosted
    const { error } = await supabase
      .from('posts')
      .update({
        is_boosted: true,
        boost_expires_at: boostExpiresAt.toISOString(),
      })
      .eq('id', postId);

    if (error) throw error;

    // Record transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'boost_post',
      amount: -amount,
      description: `Boosted post for ${durationDays} days`,
      reference_id: postId,
    });

    return { success: true, expiresAt: boostExpiresAt.toISOString() };
  }

  async likePost(postId: string) {
    const user = await this.requireAuth();

    // Try to insert a like
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: user.id, post_id: postId });

    if (error && error.code === '23505') {
      // Already liked, so unlike
      await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);
      return { data: { isLiked: false, likesCount: 0 } };
    }

    return { data: { isLiked: true, likesCount: 1 } };
  }

  async sharePost(postId: string, target: 'internal' | 'external' = 'external') {
    const user = await this.requireAuth();

    if (target === 'internal') {
      // Create a reshare post
      const { data: originalPost } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (!originalPost) throw new Error('Original post not found');

      const { data: reshare, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          type: 'reshare',
          content: originalPost.content,
          image_url: originalPost.image_url,
          reshared_from: postId,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Increment share count on original post
      await supabase.rpc('increment_shares_count', { post_id: postId });

      return { success: true, reshare };
    } else {
      // External share - just increment the counter
      await supabase.rpc('increment_shares_count', { post_id: postId });

      return {
        success: true,
        shareUrl: `https://StubGram.app/post/${postId}`
      };
    }
  }

  // --- Stories ---

  async createStory(data: {
    type: 'image' | 'video' | 'text';
    mediaUri?: string;
    content?: string;
    backgroundColor?: string;
    mediaMetadata?: any;
  }) {
    const user = await this.requireAuth();

    let mediaUrl: string | undefined;

    // Upload media if present
    if (data.mediaUri) {
      mediaUrl = await this.uploadMedia(
        data.mediaUri,
        'stories',
        `${user.id}/${Date.now()}`
      );
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: story, error } = await supabase
      .from('stories')
      .insert({
        user_id: user.id,
        type: data.type,
        media_url: mediaUrl,
        content: data.content,
        background_color: data.backgroundColor,
        media_metadata: data.mediaMetadata,
        expires_at: expiresAt.toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return { data: story };
  }

  async deleteStory(storyId: string) {
    const user = await this.requireAuth();

    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  }

  // --- Comments ---

  async commentOnPost(postId: string, content: string) {
    const user = await this.requireAuth();

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content,
      })
      .select('*')
      .single();

    if (error) throw error;

    const profile = await this.getProfileById(user.id);
    return { data: this.mapComment(comment, profile) };
  }

  async getComments(postId: string, page = 1, limit = 20) {
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!comments || comments.length === 0) {
      return { data: [] };
    }

    // Get unique user IDs
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const profiles = await this.getProfilesByIds(userIds);
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    return {
      data: comments.map(c => this.mapComment(c, profileMap.get(c.user_id)))
    };
  }

  // --- Users / Profiles ---

  async getCelebrities() {
    // 1. Get profiles where is_celebrity = true
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_celebrity', true)
      .order('followers_count', { ascending: false });

    if (error) throw error;

    return {
      data: (profiles || []).map((p) => this.mapProfile(p)),
    };
  }

  async getUserProfile(userId: string) {
    const profile = await this.getProfileById(userId);
    return { data: profile };
  }

  async getUserPosts(userId: string, page = 1, limit = 10) {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .is('community_id', null) // Exclude community posts from profile
      .order('created_at', { ascending: false });

    if (error) throw error;

    const profile = await this.getProfileById(userId);
    return { data: posts.map((p) => this.mapPost(p, profile)) };
  }

  async getUserReplies(userId: string) {
    // Select latest comments by the user
    const { data: comments, error: commentError } = await supabase
      .from('comments')
      .select('post_id, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (commentError) throw commentError;
    if (!comments || comments.length === 0) return { data: [] };

    // Get the posts being replied to
    const postIds = [...new Set(comments.map(c => c.post_id))];
    const { data: posts, error: postError } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds);

    if (postError) throw postError;

    const postUserIds = [...new Set(posts.map(p => p.user_id))];
    const profiles = await this.getProfilesByIds(postUserIds);
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    // Return posts, but sorted by reply time
    const resultPosts = comments.map(comment => {
      const post = posts.find(p => p.id === comment.post_id);
      if (!post) return null;
      const mapped = this.mapPost(post, profileMap.get(post.user_id));
      // Attach the reply content as a meta-field if needed, 
      // but for now we just want them to show up in the tab.
      return mapped;
    }).filter(Boolean) as Post[];

    return { data: resultPosts };
  }

  async getUserLikes(userId: string) {
    const { data: likes, error: likeError } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);

    if (likeError) throw likeError;
    if (!likes || likes.length === 0) return { data: [] };

    const postIds = [...new Set(likes.map(l => l.post_id))];
    const { data: posts, error: postError } = await supabase
      .from('posts')
      .select('*')
      .in('id', postIds)
      .order('created_at', { ascending: false });

    if (postError) throw postError;

    const postUserIds = [...new Set(posts.map(p => p.user_id))];
    const profiles = await this.getProfilesByIds(postUserIds);
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    return { data: posts.map((p) => this.mapPost(p, profileMap.get(p.user_id))) };
  }

  async getUserMedia(userId: string) {
    // Fetch posts that have media (images or videos)
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .or('image_url.neq.null,video_url.neq.null')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const profile = await this.getProfileById(userId);

    // Map and return
    return { 
      data: (posts || []).map(p => this.mapPost(p, profile)) 
    };
  }

  // --- Profile Helpers ---

  private async getProfileById(userId: string): Promise<User> {
    // Check cache first
    if (this.profileCache.has(userId)) {
      return this.profileCache.get(userId)!;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      // Return default user if not found
      return withPremiumMetadata(
        {
          id: userId,
          username: 'User',
          email: '',
          avatar: undefined,
          isVerified: false,
          isCelebrity: false,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: new Date().toISOString(),
          accountType: 'regular',
          account_type: 'regular',
        } as User,
        'regular'
      );
    }

    const mappedProfile = this.mapProfile(profile);
    this.profileCache.set(userId, mappedProfile);
    return mappedProfile;
  }

  private async getProfilesByIds(userIds: string[]): Promise<User[]> {
    if (userIds.length === 0) return [];

    // Check which we need to fetch
    const uncachedIds = userIds.filter(id => !this.profileCache.has(id));

    if (uncachedIds.length > 0) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', uncachedIds);

      if (!error && profiles) {
        profiles.forEach(p => {
          const mapped = this.mapProfile(p);
          this.profileCache.set(p.id, mapped);
        });
      }
    }

    return userIds.map(id =>
      this.profileCache.get(id) || {
        id,
        username: 'User',
        email: '',
        avatar: undefined,
        isVerified: false,
        isCelebrity: false,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: new Date().toISOString(),
      } as User
    );
  }

  async updateProfile(updates: {
    username?: string;
    bio?: string;
    avatar?: string;
    coverPhoto?: string;
  }) {
    const user = await this.requireAuth();

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        username: updates.username,
        bio: updates.bio,
        avatar_url: updates.avatar,
        cover_url: updates.coverPhoto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (error) throw error;

    const mappedProfile = this.mapProfile(profile);
    // Update cache
    this.profileCache.set(user.id, mappedProfile);

    return mappedProfile;
  }

  // --- Mappers ---

  private mapPost(row: any, profile?: User, originalPost?: Post): Post {
    return {
      id: row.id,
      userId: row.user_id,
      user: profile || ({} as User),
      type: row.reshared_from ? 'reshare' : (row.type || 'text'), // Infer type if it's a reshare
      originalPost: originalPost,
      resharedFrom: row.reshared_from,
      content: row.content,
      mediaUrl: row.video_url || row.image_url,
      videoUrl: row.video_url,
      thumbnailUrl: row.thumbnail_url,
      viewsCount: row.views_count || 0,
      mediaMetadata: row.media_metadata,
      feeling: row.media_metadata?.feeling,
      pollOptions: row.poll_options ? (typeof row.poll_options === 'string' ? JSON.parse(row.poll_options) : row.poll_options) : undefined,
      likesCount: row.likes_count || 0,
      commentsCount: row.comments_count || 0,
      sharesCount: row.shares_count || 0,
      isLiked: false, // Will be set by feed logic if needed
      isBoosted: row.is_boosted || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
      // Transcoding fields
      processing_status: row.processing_status,
      original_url: row.original_url,
      processed_url: row.processed_url,
      duration: row.duration,
      resolution: row.resolution,
      linkPreview: row.link_metadata,
      aspectRatio: row.aspect_ratio || 1.0,
      mediaUrls: typeof row.media_urls === 'string' ? JSON.parse(row.media_urls) : row.media_urls,
    };
  }

  private mapComment(row: any, profile?: User): Comment {
    return {
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      user: profile || ({} as User),
      content: row.content,
      likesCount: row.likes_count || 0,
      isLiked: false,
      createdAt: row.created_at,
    };
  }

  private mapProfile(row: any): User {
    if (!row) return {} as User;
    return withPremiumMetadata(
      {
        id: row.id,
        username: row.username || 'User',
        email: '',
        avatar: row.avatar_url,
        coverPhoto: row.cover_url,
        full_name: row.full_name,
        bio: row.bio,
        isVerified: row.is_verified || false,
        isCelebrity: row.is_celebrity || false,
        followersCount: row.followers_count || 0,
        followingCount: row.following_count || 0,
        postsCount: row.posts_count || 0,
        createdAt: row.created_at || new Date().toISOString(),
        coins: row.coins || 0,
        accountType: row.account_type || 'regular',
        account_type: row.account_type || 'regular',
        // New fields for Celebrity Chat
        category: row.category,
        messagePrice: row.message_price,
        rating: row.rating ? parseFloat(row.rating) : undefined,
        isOnline: row.is_online,
      } as User,
      row.account_type
    );
  }

  private mapReel(row: any, profile?: User): Reel {
    const post = this.mapPost(row, profile);
    return {
      ...post,
      videoUrl: post.videoUrl || post.mediaUrl || '',
    } as Reel;
  }

  async getReels(page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    console.log(`[ApiClient] Fetching reels: range ${from}-${to}`);
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('type', 'reel')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
        console.error('[ApiClient] getReels Error:', error);
        throw error;
    }
    console.log(`[ApiClient] getReels success, count: ${posts?.length || 0}`);
    if (!posts || posts.length === 0) {
      console.log('[ApiClient] No reels found in table.');
      return { data: [], hasMore: false };
    }
    console.log('[ApiClient] First reel raw:', JSON.stringify(posts[0]));

    const userIds = [...new Set(posts.map(p => p.user_id))];
    const profiles = await this.getProfilesByIds(userIds);
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    return {
      data: posts.map((p) => this.mapReel(p, profileMap.get(p.user_id))),
      hasMore: posts.length === limit,
    };
  }
  async getStoriesFeed() {
    const user = await this.requireAuth();

    const { data, error } = await supabase.rpc('get_stories_feed', {
      p_viewer_id: user.id
    });

    if (error) throw error;

    return { data: data || [] };
  }

  async getStoryViewers(storyId: string) {
    const { data, error } = await supabase
      .from('story_views')
      .select(`
        viewed_at,
        user:profiles!user_id(*)
      `)
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false });

    if (error) throw error;

    return { 
      data: data.map((item: any) => ({
        ...item.user,
        viewedAt: item.viewed_at
      }))
    };
  }

  async getStories(userId?: string) {
    // 1. Fetch active stories with user profiles
    let query = supabase
      .from('stories')
      .select(`
        *,
        user:profiles!user_id(*)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: storiesData, error: storiesError } = await query;
    if (storiesError) throw storiesError;

    if (!storiesData || storiesData.length === 0) return { data: [] };

    // 2. Fetch viewed stories for the current user
    const { data: { user } } = await supabase.auth.getUser();
    let viewedStoryIds = new Set<string>();

    if (user) {
      const { data: viewedData } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('user_id', user.id);

      if (viewedData) {
        viewedData.forEach((v: any) => viewedStoryIds.add(v.story_id));
      }
    }

    // 3. Map to Story interface
    const stories: Story[] = storiesData.map((s: any) => ({
      id: s.id,
      userId: s.user_id,
      mediaUrl: s.media_url,
      type: s.type,
      duration: s.duration,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      content: s.content,
      backgroundColor: s.background_color,
      user: {
        id: s.user.id,
        username: s.user.username,
        avatar: s.user.avatar_url,
        isVerified: s.user.is_verified,
        email: '', // Default defaults for missing fields
        isCelebrity: false,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: new Date().toISOString(),
      },
      isViewed: viewedStoryIds.has(s.id),
    }));

    return { data: stories };
  }

  async markStoryAsViewed(storyId: string) {
    const user = await this.getCurrentUser();
    if (!user) return;

    const { error } = await supabase
      .from('story_views')
      .insert({
        story_id: storyId,
        user_id: user.id
      });

    if (error && error.code !== '23505') { // Ignore unique violation (23505)
      console.error('Error marking story as viewed:', error);
    }
  }
  // --- Chat ---

  async getConversations() {
    const user = await this.requireAuth();

    const { data: conversations, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_1:profiles!participant_1(*),
        participant_2:profiles!participant_2(*)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    const mapped = conversations.map((c: any) => {
      const p1 = this.mapProfile(c.participant_1);
      const p2 = this.mapProfile(c.participant_2);
      const otherUser = p1.id === user.id ? p2 : p1;

      // We return an extended object that fits the frontend expectation + extra helper
      return {
        id: c.id,
        participants: [p1, p2],
        lastMessage: null, // You might fetch this if needed
        unreadCount: 0,
        updatedAt: c.last_message_at || c.created_at,
        otherUser
      };
    });

    return { data: mapped };
  }

  async createConversation(otherUserId: string) {
    const user = await this.requireAuth();

    // Check existing
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(participant_1.eq.${user.id},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${user.id})`)
      .maybeSingle();

    if (existing) return { data: existing };

    // Create new
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        participant_1: user.id,
        participant_2: otherUserId,
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { data: newConv };
  }

  async getMessages(conversationId: string) {
    const user = await this.requireAuth();

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, sender:profiles(*)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return {
      data: messages.map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        sender: this.mapProfile(m.sender),
        content: m.content,
        mediaUrl: m.media_url,
        isRead: m.is_read,
        createdAt: m.created_at,
        isMine: m.sender_id === user.id
      }))
    };
  }

  async sendMessage(conversationId: string, content: string) {
    const user = await this.requireAuth();

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content
      })
      .select('*, sender:profiles(*)')
      .single();

    if (error) throw error;

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    return {
      data: {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        sender: this.mapProfile(message.sender),
        content: message.content,
        mediaUrl: message.media_url,
        isRead: message.is_read,
        createdAt: message.created_at,
        isMine: true
      }
    };
  }



  async searchUsers(query: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${query}%`)
      .limit(20);

    if (error) throw error;
    return { data: (data || []).map(p => this.mapProfile(p)) };
  }

  // --- Courses ---

  async getCourses(filter: 'all' | 'enrolled' | 'teaching' = 'all') {
    const user = await this.getCurrentUser();

    let query = supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (filter === 'teaching' && user) {
      query = supabase
        .from('courses')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
    }

    const { data: courses, error } = await query;
    if (error) throw error;

    // Get teacher profiles
    const teacherIds = [...new Set((courses || []).map(c => c.teacher_id))];
    const teachers = await this.getProfilesByIds(teacherIds);
    const teacherMap = new Map(teachers.map(t => [t.id, t]));

    // Get user's enrollments if logged in
    let enrolledCourseIds: string[] = [];
    if (user) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id);
      enrolledCourseIds = (enrollments || []).map(e => e.course_id);
    }

    let mappedCourses = (courses || []).map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      teacherId: c.teacher_id,
      teacher: teacherMap.get(c.teacher_id) || {} as any,
      price: c.price_coins || 0,
      priceFiat: c.price_fiat,
      currency: c.currency,
      thumbnail: c.thumbnail_url,
      duration: c.duration_hours ? `${c.duration_hours}h` : 'N/A',
      studentsCount: c.students_count || 0,
      rating: c.rating || 0,
      isEnrolled: enrolledCourseIds.includes(c.id),
      isPublished: c.is_published,
      createdAt: c.created_at,
    }));

    // Filter enrolled courses
    if (filter === 'enrolled') {
      mappedCourses = mappedCourses.filter(c => c.isEnrolled);
    }

    return { data: { data: mappedCourses } };
  }

  async getCourse(courseId: string) {
    const user = await this.getCurrentUser();

    // Get course
    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error) throw error;

    // Get teacher
    const teacher = await this.getProfileById(course.teacher_id);

    // Get lessons
    const { data: lessons } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    // Check enrollment and progress
    let enrollment = null;
    let lessonProgress: Record<string, number> = {};

    if (user) {
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('*, lesson_progress(*)')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (enrollmentData) {
        enrollment = {
          id: enrollmentData.id,
          progress: enrollmentData.progress,
          lastLessonId: enrollmentData.last_lesson_id,
          createdAt: enrollmentData.created_at,
        };

        // Map lesson progress
        (enrollmentData.lesson_progress || []).forEach((lp: any) => {
          lessonProgress[lp.lesson_id] = lp.progress;
        });
      }
    }

    return {
      data: {
        id: course.id,
        title: course.title,
        description: course.description,
        teacher,
        price: course.price_coins || 0,
        priceFiat: course.price_fiat,
        currency: course.currency,
        thumbnail: course.thumbnail_url,
        duration: course.duration_hours ? `${course.duration_hours}h` : 'N/A',
        studentsCount: course.students_count || 0,
        rating: course.rating || 0,
        isEnrolled: !!enrollment,
        enrollment,
        lessons: (lessons || []).map(l => ({
          id: l.id,
          title: l.title,
          description: l.description,
          contentType: l.content_type,
          videoUrl: l.video_url,
          textContent: l.text_content,
          pdfUrl: l.pdf_url,
          durationMinutes: l.duration_minutes,
          orderIndex: l.order_index,
          isPreview: l.is_preview,
          progress: lessonProgress[l.id] || 0,
        })),
      },
    };
  }

  async enrollInCourse(courseId: string) {
    const user = await this.requireAuth();

    // Use the database function for atomic enrollment
    const { data, error } = await supabase.rpc('enroll_with_coins', {
      p_user_id: user.id,
      p_course_id: courseId,
    });

    if (error) throw error;

    return { data: { enrollmentId: data, success: true } };
  }

  async getMyEnrollments() {
    const user = await this.getCurrentUser();
    if (!user) return { data: [] };

    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: (enrollments || []).map(e => ({
        id: e.id,
        courseId: e.course_id,
        course: e.courses ? {
          id: e.courses.id,
          title: e.courses.title,
          thumbnail: e.courses.thumbnail_url,
        } : null,
        progress: e.progress,
        completedAt: e.completed_at,
        createdAt: e.created_at,
      })),
    };
  }

  async updateLessonProgress(enrollmentId: string, lessonId: string, progress: number) {
    const completed = progress >= 100;

    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        enrollment_id: enrollmentId,
        lesson_id: lessonId,
        progress,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        last_watched_at: new Date().toISOString(),
      }, {
        onConflict: 'enrollment_id,lesson_id',
      });

    if (error) throw error;

    // Update overall course progress
    await supabase
      .from('enrollments')
      .update({
        progress: await this.calculateCourseProgress(enrollmentId),
        last_lesson_id: lessonId,
      })
      .eq('id', enrollmentId);

    return { success: true };
  }

  private async calculateCourseProgress(enrollmentId: string): Promise<number> {
    const { data } = await supabase.rpc('calculate_course_progress', {
      p_enrollment_id: enrollmentId,
    });
    return data || 0;
  }

  async createCourse(data: {
    title: string;
    description: string;
    thumbnailUri?: string;
    priceCoins: number;
    durationHours?: number;
  }) {
    const user = await this.requireAuth();

    // Upload thumbnail if provided
    let thumbnailUrl: string | undefined;
    if (data.thumbnailUri) {
      thumbnailUrl = await this.uploadMedia(data.thumbnailUri, 'courses', `${user.id}/${Date.now()}`);
    }

    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        teacher_id: user.id,
        title: data.title,
        description: data.description,
        thumbnail_url: thumbnailUrl,
        price_coins: data.priceCoins,
        duration_hours: data.durationHours,
        is_published: false, // Draft by default
      })
      .select()
      .single();

    if (error) throw error;
    return { data: course };
  }

  async addLesson(courseId: string, lesson: {
    title: string;
    description?: string;
    contentType: 'video' | 'text' | 'pdf';
    videoUrl?: string;
    textContent?: string;
    pdfUri?: string;
    durationMinutes?: number;
    orderIndex: number;
    isPreview?: boolean;
  }) {
    const user = await this.requireAuth();

    // Upload PDF if provided
    let pdfUrl: string | undefined;
    if (lesson.pdfUri) {
      pdfUrl = await this.uploadMedia(lesson.pdfUri, 'courses', `${user.id}/pdfs/${Date.now()}`);
    }

    const { data, error } = await supabase
      .from('course_lessons')
      .insert({
        course_id: courseId,
        title: lesson.title,
        description: lesson.description,
        content_type: lesson.contentType,
        video_url: lesson.videoUrl,
        text_content: lesson.textContent,
        pdf_url: pdfUrl,
        duration_minutes: lesson.durationMinutes,
        order_index: lesson.orderIndex,
        is_preview: lesson.isPreview || false,
      })
      .select()
      .single();

    if (error) throw error;
    return { data };
  }

  async publishCourse(courseId: string) {
    const { error } = await supabase
      .from('courses')
      .update({ is_published: true })
      .eq('id', courseId);

    if (error) throw error;
    return { success: true };
  }

  // --- Follow System ---

  async followUser(userId: string) {
    const currentUser = await this.requireAuth();

    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: currentUser.id,
        following_id: userId,
      });

    if (error && error.code === '23505') {
      // Already following - ignore
      return { success: true, alreadyFollowing: true };
    }
    if (error) throw error;

    // Invalidate caches
    this.profileCache.delete(currentUser.id);
    this.profileCache.delete(userId);

    // Update follower/following counts
    const { error: rpcError } = await supabase.rpc('update_follow_counts', {
      p_follower_id: currentUser.id,
      p_following_id: userId,
      p_increment: true,
    });

    if (rpcError) {
      console.error('RPC Error (update_follow_counts):', rpcError);
    }

    return { success: true };
  }

  async unfollowUser(userId: string) {
    const currentUser = await this.requireAuth();

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId);

    if (error) throw error;

    // Invalidate caches
    this.profileCache.delete(currentUser.id);
    this.profileCache.delete(userId);

    // Update counts
    const { error: rpcError } = await supabase.rpc('update_follow_counts', {
      p_follower_id: currentUser.id,
      p_following_id: userId,
      p_increment: false,
    });

    if (rpcError) {
      console.error('RPC Error (update_follow_counts unfollow):', rpcError);
    }

    return { success: true };
  }

  async getFollowers(userId: string) {
    const { data: followers, error } = await supabase
      .from('follows')
      .select('follower_id, profiles!follower_id(*)')
      .eq('following_id', userId);

    if (error) throw error;

    return {
      data: (followers || []).map((f: any) => this.mapProfile(f.profiles))
    };
  }

  async getFollowing(userId: string) {
    const { data: following, error } = await supabase
      .from('follows')
      .select('following_id, profiles!following_id(*)')
      .eq('follower_id', userId);

    if (error) throw error;

    return {
      data: (following || []).map((f: any) => this.mapProfile(f.profiles))
    };
  }

  async isFollowing(userId: string): Promise<boolean> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) return false;

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId)
      .single();

    return !!data;
  }

  async getFollowStatus(userIds: string[]): Promise<Map<string, boolean>> {
    const currentUser = await this.getCurrentUser();
    const result = new Map<string, boolean>();

    if (!currentUser || userIds.length === 0) {
      userIds.forEach(id => result.set(id, false));
      return result;
    }

    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUser.id)
      .in('following_id', userIds);

    const followingSet = new Set((data || []).map(d => d.following_id));
    userIds.forEach(id => result.set(id, followingSet.has(id)));

    return result;
  }

  // --- Save Posts ---

  async savePost(postId: string) {
    const user = await this.requireAuth();

    // Check if already saved
    const { data: existing, error: fetchError } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      // Unsave
      await supabase
        .from('saved_posts')
        .delete()
        .eq('id', existing.id);
      return { saved: false };
    }

    // Save
    const { error } = await supabase
      .from('saved_posts')
      .insert({ user_id: user.id, post_id: postId });

    if (error) {
      if (error.code === '23505') {
        // Race condition: already saved. Treat as toggle -> delete.
        await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        return { saved: false };
      }
      throw error;
    }
    return { saved: true };
  }

  async getSavedPosts(page = 1, limit = 20) {
    const user = await this.requireAuth();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: savedPosts, error } = await supabase
      .from('saved_posts')
      .select('post_id, posts(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    if (!savedPosts || savedPosts.length === 0) {
      return { data: [], hasMore: false };
    }

    // Get user profiles for posts
    const userIds = [...new Set(savedPosts.map((sp: any) => sp.posts?.user_id).filter(Boolean))];
    const profiles = await this.getProfilesByIds(userIds);
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    return {
      data: savedPosts
        .filter((sp: any) => sp.posts)
        .map((sp: any) => this.mapPost(sp.posts, profileMap.get(sp.posts.user_id))),
      hasMore: savedPosts.length === limit,
    };
  }

  // --- Teacher Application ---

  async applyAsTeacher(data: {
    youtubeChannelUrl: string;
    bio: string;
    expertise: string[];
    sampleContentUrl?: string;
  }) {
    const user = await this.requireAuth();

    const { data: application, error } = await supabase
      .from('teacher_applications')
      .insert({
        user_id: user.id,
        youtube_channel_url: data.youtubeChannelUrl,
        bio: data.bio,
        expertise: data.expertise,
        sample_content_url: data.sampleContentUrl,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return { data: application };
  }

  async getTeacherApplicationStatus() {
    const user = await this.getCurrentUser();
    if (!user) return { data: null };

    const { data } = await supabase
      .from('teacher_applications')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return { data };
  }

  // --- Ads ---
  // Note: Full ads API implementation is below in the Coins/Rewards section

  async recordAdImpression(adId: string) {
    // Increment impression count and decrement remaining coins
    await supabase.rpc('record_ad_impression', { ad_id: adId });
  }

  async recordAdClick(adId: string) {
    await supabase.rpc('record_ad_click', { ad_id: adId });
  }

  // --- Reels ---

  async likeReel(reelId: string) {
    const user = await this.requireAuth();

    const { error } = await supabase
      .from('reel_likes')
      .insert({ user_id: user.id, reel_id: reelId });

    if (error && error.code === '23505') {
      await supabase
        .from('reel_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('reel_id', reelId);
      return { data: { isLiked: false } };
    }

    return { data: { isLiked: true } };
  }

  async recordReelView(reelId: string) {
    // Basic view increment
    await supabase.rpc('increment_reel_views', { p_reel_id: reelId });
  }

  async getReelComments(reelId: string) {
    const { data: comments, error } = await supabase
      .from('reel_comments')
      .select('*')
      .eq('reel_id', reelId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const userIds = [...new Set((comments || []).map(c => c.user_id))];
    const profiles = await this.getProfilesByIds(userIds);
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    return {
      data: (comments || []).map(c => this.mapComment(c, profileMap.get(c.user_id)))
    };
  }

  async commentOnReel(reelId: string, content: string) {
    const user = await this.requireAuth();

    const { data: comment, error } = await supabase
      .from('reel_comments')
      .insert({
        reel_id: reelId,
        user_id: user.id,
        content,
      })
      .select('*')
      .single();

    if (error) throw error;

    const profile = await this.getProfileById(user.id);
    return { data: this.mapComment(comment, profile) };
  }

  // --- Wallet & Payments ---

  private async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': session ? `Bearer ${session.access_token}` : '',
    };
  }

  async getWallet() {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.backendUrl}/wallet`, {
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch wallet');
    return { data: await response.json() };
  }

  async getTransactions(page = 1, limit = 20) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.backendUrl}/wallet/transactions?page=${page}&limit=${limit}`, {
      headers
    });
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return { data: await response.json() };
  }

  async deposit(amount: number, phoneNumber: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.backendUrl}/wallet/deposit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount, phoneNumber })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Deposit failed');
    }
    return { data: await response.json() };
  }

  async withdraw(amount: number, phoneNumber: string) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.backendUrl}/wallet/withdraw`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount, phoneNumber })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Withdrawal failed');
    }
    return { data: await response.json() };
  }

  // --- Meetings ---

  async createMeeting(data: {
    title: string;
    description?: string;
    type: 'public' | 'private' | 'scheduled';
    startTime?: string;
    password?: string;
  }) {
    const user = await this.requireAuth();

    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        host_id: user.id,
        title: data.title,
        description: data.description,
        meeting_id: this.generateMeetingId(),
        type: data.type,
        status: data.type === 'scheduled' ? 'scheduled' : 'active',
        start_time: data.startTime || new Date().toISOString(),
        is_password_protected: !!data.password,
        meeting_password: data.password,
      })
      .select('*')
      .single();

    if (error) throw error;

    const profile = await this.getProfileById(user.id);
    return { data: this.mapMeeting(meeting, profile) };
  }

  async getMeetingByCode(meetingId: string, password?: string) {
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('meeting_id', meetingId)
      .single();

    if (error) throw error;
    if (!meeting) throw new Error('Meeting not found');

    if (meeting.is_password_protected && meeting.meeting_password !== password) {
      throw new Error('Invalid password');
    }

    const profile = await this.getProfileById(meeting.host_id);
    return { data: this.mapMeeting(meeting, profile) };
  }

  async joinMeeting(meetingId: string) {
    const user = await this.requireAuth();

    const { data: meeting } = await this.getMeetingByCode(meetingId);

    // Check if already joined
    const { data: existing } = await supabase
      .from('meeting_participants')
      .select('*')
      .eq('meeting_id', meeting.id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      await supabase.from('meeting_participants').insert({
        meeting_id: meeting.id,
        user_id: user.id,
        role: 'participant',
      });
    }

    return { data: meeting };
  }

  async getMeetingParticipants(meetingId: string) {
    const { data: participants, error } = await supabase
      .from('meeting_participants')
      .select('*, user:profiles!user_id(*)')
      .eq('meeting_id', meetingId)
      .is('left_at', null);

    if (error) throw error;

    return {
      data: participants.map((p: any) => ({
        id: p.id,
        meetingId: p.meeting_id,
        userId: p.user_id,
        role: p.role,
        isMuted: p.is_muted || false,
        hasVideo: p.has_video || false,
        handRaised: p.hand_raised || false,
        joinedAt: p.joined_at,
        leftAt: p.left_at,
        user: {
          id: p.user.id,
          username: p.user.username,
          email: p.user.email || '',
          avatar: p.user.avatar_url,
          isVerified: p.user.is_verified || false,
          isCelebrity: false,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: p.user.created_at,
        },
      })),
    };
  }

  async leaveMeeting(meetingId: string) {
    const user = await this.requireAuth();

    const { error } = await supabase
      .from('meeting_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('meeting_id', meetingId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { data: { success: true } };
  }

  async endMeeting(meetingId: string) {
    const user = await this.requireAuth();

    const { error } = await supabase
      .from('meetings')
      .update({
        status: 'ended',
        end_time: new Date().toISOString(),
      })
      .eq('meeting_id', meetingId)
      .eq('host_id', user.id);

    if (error) throw error;
    return { data: { success: true } };
  }

  private generateMeetingId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private mapMeeting(row: any, host: User): any {
    return {
      id: row.id,
      hostId: row.host_id,
      host,
      title: row.title,
      description: row.description,
      meetingId: row.meeting_id,
      type: row.type,
      status: row.status,
      startTime: row.start_time,
      endTime: row.end_time,
      isPasswordProtected: row.is_password_protected,
      meetingPassword: row.meeting_password,
      createdAt: row.created_at,
    };
  }

  // --- Communities ---

  async createCommunity(data: {
    name: string;
    description?: string;
    isPrivate: boolean;
    avatarUrl?: string;
    coverUrl?: string;
  }) {
    const user = await this.requireAuth();

    // Generate slug from name
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const { data: community, error } = await supabase
      .from('communities')
      .insert({
        creator_id: user.id,
        name: data.name,
        slug,
        description: data.description,
        avatar_url: data.avatarUrl,
        cover_url: data.coverUrl,
        is_private: data.isPrivate,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Auto-add creator as admin member
    await supabase.from('community_members').insert({
      community_id: community.id,
      user_id: user.id,
      role: 'admin',
    });

    const profile = await this.getProfileById(user.id);
    return { data: this.mapCommunity(community, profile, true, 'admin') };
  }

  async getCommunities(type: 'public' | 'joined' | 'all' = 'public') {
    const user = await this.getCurrentUser();

    let query = supabase.from('communities').select('*, creator:profiles!creator_id(*)');

    if (type === 'public') {
      query = query.eq('is_private', false);
    } else if (type === 'joined' && user) {
      // Only get communities the user is a member of
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id);

      const communityIds = memberships?.map(m => m.community_id) || [];
      if (communityIds.length === 0) {
        return { data: [] };
      }
      query = query.in('id', communityIds);
    }

    const { data: communities, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Check membership status for current user
    let membershipMap = new Map<string, { isMember: boolean; role?: string }>();
    if (user) {
      const { data: userMemberships } = await supabase
        .from('community_members')
        .select('community_id, role')
        .eq('user_id', user.id);

      userMemberships?.forEach(m => {
        membershipMap.set(m.community_id, { isMember: true, role: m.role });
      });
    }

    return {
      data: communities.map((c: any) => {
        const membership = membershipMap.get(c.id) || { isMember: false };
        const creatorProfile: User = {
          id: c.creator.id,
          username: c.creator.username,
          email: c.creator.email || '',
          avatar: c.creator.avatar_url,
          isVerified: c.creator.is_verified || false,
          isCelebrity: false,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: c.creator.created_at,
        };
        return this.mapCommunity(c, creatorProfile, membership.isMember, membership.role);
      }),
    };
  }

  async getCommunityBySlug(slug: string) {
    const user = await this.getCurrentUser();

    const { data: community, error } = await supabase
      .from('communities')
      .select('*, creator:profiles!creator_id(*)')
      .eq('slug', slug)
      .single();

    if (error) throw error;

    // Check if user is a member
    let isMember = false;
    let userRole: string | undefined;
    if (user) {
      const { data: membership } = await supabase
        .from('community_members')
        .select('role')
        .eq('community_id', community.id)
        .eq('user_id', user.id)
        .single();

      if (membership) {
        isMember = true;
        userRole = membership.role;
      }
    }

    const creatorProfile = await this.getProfileById(community.creator_id);
    return { data: this.mapCommunity(community, creatorProfile, isMember, userRole) };
  }

  async joinCommunity(communityId: string) {
    const user = await this.requireAuth();

    const { error } = await supabase.from('community_members').insert({
      community_id: communityId,
      user_id: user.id,
      role: 'member',
    });

    if (error) throw error;
    return { data: { success: true } };
  }

  async leaveCommunity(communityId: string) {
    const user = await this.requireAuth();

    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { data: { success: true } };
  }

  async getCommunityMembers(communityId: string) {
    const { data: members, error } = await supabase
      .from('community_members')
      .select('*, user:profiles!user_id(*)')
      .eq('community_id', communityId)
      .order('joined_at', { ascending: false });

    if (error) throw error;

    return {
      data: members.map((m: any) => ({
        id: m.id,
        communityId: m.community_id,
        userId: m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
        user: {
          id: m.user.id,
          username: m.user.username,
          email: m.user.email || '',
          avatar: m.user.avatar_url,
          isVerified: m.user.is_verified || false,
          isCelebrity: false,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: m.user.created_at,
        },
      })),
    };
  }

  async getCommunityPosts(communityId: string, limit = 20) {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const userIds = [...new Set(posts.map(p => p.user_id))];
    const profiles = await this.getProfilesByIds(userIds);
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    return {
      data: posts.map(p => this.mapPost(p, profileMap.get(p.user_id))),
    };
  }

  private mapCommunity(row: any, creator: User, isMember: boolean = false, userRole?: string): any {
    return {
      id: row.id,
      creatorId: row.creator_id,
      creator,
      name: row.name,
      slug: row.slug,
      description: row.description,
      avatarUrl: row.avatar_url,
      coverUrl: row.cover_url,
      isPrivate: row.is_private,
      membersCount: row.members_count,
      postsCount: row.posts_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isMember,
      userRole,
    };
  }

  // --- Coins / Rewards ---

  async getCoinsBalance() {
    const user = await this.requireAuth();
    
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('coins_balance')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return { data: { balance: wallet?.coins_balance || 0 } };
  }

  async getCoinTransactions(limit = 50) {
    const user = await this.requireAuth();

    const { data: transactions, error } = await supabase
      .from('coin_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      data: transactions.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        amount: t.amount,
        reason: t.reason,
        createdAt: t.created_at,
      })),
    };
  }

  async earnCoins(amount: number, reason: string) {
    const user = await this.requireAuth();

    // Insert transaction
    const { error: txError } = await supabase
      .from('coin_transactions')
      .insert({
        user_id: user.id,
        amount,
        reason,
      });

    if (txError) throw txError;

    // Update wallet balance
    const { error: walletError } = await supabase.rpc('increment_coins', {
      user_uuid: user.id,
      coins_amount: amount,
    });

    if (walletError) {
      // If wallet update fails, we should ideally rollback the transaction
      console.error('Failed to update wallet:', walletError);
      throw walletError;
    }

    return { data: { success: true, amount } };
  }

  async spendCoins(amount: number, reason: string) {
    const user = await this.requireAuth();

    // Check balance first
    const { data: balanceData } = await this.getCoinsBalance();
    if (balanceData.balance < amount) {
      throw new Error('Insufficient coins balance');
    }

    // Insert transaction (negative amount)
    const { error: txError } = await supabase
      .from('coin_transactions')
      .insert({
        user_id: user.id,
        amount: -amount,
        reason,
      });

    if (txError) throw txError;

    // Update wallet balance
    const { error: walletError } = await supabase.rpc('increment_coins', {
      user_uuid: user.id,
      coins_amount: -amount,
    });

    if (walletError) {
      console.error('Failed to update wallet:', walletError);
      throw walletError;
    }

    return { data: { success: true, amount } };
  }

  // --- Ads ---

  async createAd(data: {
    title: string;
    content: string;
    mediaUrl?: string;
    linkUrl?: string;
    budgetCoins: number;
    durationType: 'hour' | 'day' | 'month' | 'year';
    startsAt: string;
    expiresAt: string;
  }) {
    const user = await this.requireAuth();

    const { data: ad, error } = await supabase
      .from('ads')
      .insert({
        advertiser_id: user.id,
        title: data.title,
        content: data.content,
        budget_coins: data.budgetCoins,
        budget_rwf: 0, // Fallback for legacy column
        link_url: data.linkUrl,

        duration_type: data.durationType,
        starts_at: data.startsAt,
        expires_at: data.expiresAt,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) throw error;

    const profile = await this.getProfileById(user.id);
    return { data: this.mapAd(ad, profile) };
  }

  async getMyAds() {
    const user = await this.requireAuth();

    const { data: ads, error } = await supabase
      .from('ads')
      .select('*')
      .eq('advertiser_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const profile = await this.getProfileById(user.id);
    return {
      data: ads.map((ad: any) => this.mapAd(ad, profile)),
    };
  }

  async getActiveAds(limit = 10) {
    const { data: ads, error } = await supabase
      .from('ads')
      .select('*, advertiser:profiles!advertiser_id(*)')
      .eq('status', 'active')
      .lte('starts_at', new Date().toISOString())
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      data: ads.map((ad: any) => {
        const advertiser: User = {
          id: ad.advertiser.id,
          username: ad.advertiser.username,
          email: ad.advertiser.email || '',
          avatar: ad.advertiser.avatar_url,
          isVerified: ad.advertiser.is_verified || false,
          isCelebrity: false,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: ad.advertiser.created_at,
        };
        return this.mapAd(ad, advertiser);
      }),
    };
  }

  async incrementAdImpressions(adId: string) {
    const { error } = await supabase.rpc('increment_ad_impressions', {
      ad_uuid: adId,
    });

    if (error) console.error('Failed to increment impressions:', error);
    return { data: { success: !error } };
  }

  async incrementAdClicks(adId: string) {
    const { error } = await supabase.rpc('increment_ad_clicks', {
      ad_uuid: adId,
    });

    if (error) console.error('Failed to increment clicks:', error);
    return { data: { success: !error } };
  }

  async updateAdStatus(adId: string, status: 'active' | 'paused' | 'expired') {
    const user = await this.requireAuth();

    const { error } = await supabase
      .from('ads')
      .update({ status })
      .eq('id', adId)
      .eq('advertiser_id', user.id);

    if (error) throw error;
    return { data: { success: true } };
  }

  private mapAd(row: any, advertiser: User): any {
    return {
      id: row.id,
      advertiserId: row.advertiser_id,
      advertiser,
      title: row.title,
      content: row.content,
      mediaUrl: row.media_url,
      linkUrl: row.link_url,
      budgetRwf: row.budget_rwf,
      durationType: row.duration_type,
      startsAt: row.starts_at,
      expiresAt: row.expires_at,
      status: row.status,
      impressionsCount: row.impressions_count || 0,
      clicksCount: row.clicks_count || 0,
      createdAt: row.created_at,
    };
  }
}

export const apiClient = new ApiClient();

