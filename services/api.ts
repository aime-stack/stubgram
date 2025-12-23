
import { supabase } from '@/lib/supabase';
import { Post, Story, User, Comment, Notification } from '@/types';

class ApiClient {
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
      throw new Error('Not authenticated');
    }
    return user;
  }

  // --- Media Upload ---
  async uploadMedia(
    uri: string,
    bucket: 'posts' | 'stories' | 'avatars' | 'courses',
    fileName: string
  ): Promise<string> {
    try {
      // Use fetch to get blob/buffer - working with Expo ecosystem
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      // Determine content type from extension
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const contentType = ext === 'mp4' || ext === 'mov'
        ? 'video/mp4'
        : ext === 'png'
          ? 'image/png'
          : 'image/jpeg';

      const filePath = `${fileName}.${ext}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, arrayBuffer, {
          contentType,
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
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
    mediaUrl?: string;
    linkUrl?: string;
    pollOptions?: string[];
  }) {
    const user = await this.requireAuth();

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        type: data.type,
        content: data.content,
        image_url: data.mediaUrl,
      })
      .select('*')
      .single();

    if (error) throw error;

    // Fetch the user's profile separately
    const profile = await this.getProfileById(user.id);

    return { data: this.mapPost(post, profile) };
  }

  async getFeed(page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    if (!posts || posts.length === 0) {
      return { data: [], hasMore: false };
    }

    // Get unique user IDs from posts
    const userIds = [...new Set(posts.map(p => p.user_id))];

    // Fetch all profiles at once
    const profiles = await this.getProfilesByIds(userIds);
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    return {
      data: posts.map((p) => this.mapPost(p, profileMap.get(p.user_id))),
      hasMore: posts.length === limit,
    };
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
        shareUrl: `https://snapgram.app/post/${postId}`
      };
    }
  }

  // --- Stories ---

  async createStory(data: {
    type: 'image' | 'video' | 'text';
    mediaUri?: string;
    content?: string;
    backgroundColor?: string;
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

  async getUserProfile(userId: string) {
    const profile = await this.getProfileById(userId);
    return { data: profile };
  }

  async getUserPosts(userId: string, page = 1, limit = 10) {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const profile = await this.getProfileById(userId);
    return { data: posts.map((p) => this.mapPost(p, profile)) };
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
      return {
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
      } as User;
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

  private mapPost(row: any, profile?: User): Post {
    return {
      id: row.id,
      userId: row.user_id,
      user: profile || ({} as User),
      type: row.type || 'text',
      content: row.content,
      mediaUrl: row.image_url,
      likesCount: row.likes_count || 0,
      commentsCount: row.comments_count || 0,
      sharesCount: row.shares_count || 0,
      isLiked: false,
      isBoosted: row.is_boosted || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
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
    return {
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
    } as User;
  }

  // --- Stubs ---

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

  async getWallet() {
    const user = await this.getCurrentUser();
    if (!user) return { data: { balance: 0 } };

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return { data: { balance: wallet?.balance || 0 } };
  }

  async getTransactions() {
    const user = await this.getCurrentUser();
    if (!user) return { data: { data: [] } };

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    return {
      data: {
        data: (transactions || []).map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          createdAt: t.created_at,
        }))
      }
    };
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

  async getCelebrities() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_celebrity', true)
      .order('followers_count', { ascending: false });

    if (error) throw error;

    // If no celebrities from DB, fallback to empty array (the UI has mocks currently, we want to replace them)
    // But we will populate DB with SQL script.
    return { data: (data || []).map(p => this.mapProfile(p)) };
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

    // Update follower/following counts
    await supabase.rpc('update_follow_counts', {
      p_follower_id: currentUser.id,
      p_following_id: userId,
      p_increment: true,
    });

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

    // Update follower/following counts
    await supabase.rpc('update_follow_counts', {
      p_follower_id: currentUser.id,
      p_following_id: userId,
      p_increment: false,
    });

    return { success: true };
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

  async getActiveAds(limit = 5) {
    const { data: ads, error } = await supabase
      .from('ads')
      .select('*')
      .eq('status', 'active')
      .gt('remaining_coins', 0)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      data: (ads || []).map(ad => ({
        id: ad.id,
        userId: ad.user_id,
        title: ad.title,
        content: ad.content,
        imageUrl: ad.image_url,
        linkUrl: ad.link_url,
        tier: ad.tier,
        isAd: true, // Flag to identify as ad in feed
      })),
    };
  }

  async recordAdImpression(adId: string) {
    // Increment impression count and decrement remaining coins
    await supabase.rpc('record_ad_impression', { ad_id: adId });
  }

  async recordAdClick(adId: string) {
    await supabase.rpc('record_ad_click', { ad_id: adId });
  }
}

export const apiClient = new ApiClient();
