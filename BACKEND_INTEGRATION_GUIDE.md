
# Backend Integration Guide

## 🔗 Backend API Endpoint
```
https://v6r7hhgft77nghz9ncgpb9mfgkx69bg4.app.specular.dev
```

## 🚀 Quick Start

### 1. Update Environment Variable
Create or update `.env` file in the project root:
```env
EXPO_PUBLIC_API_URL=https://v6r7hhgft77nghz9ncgpb9mfgkx69bg4.app.specular.dev
```

### 2. Test Backend Connection
The API client in `services/api.ts` is already configured to use this endpoint. All requests will automatically use the correct base URL.

---

## 📍 Integration Checklist

### Authentication Flow
- [ ] **Login** (`app/(auth)/login.tsx` line 32)
  - Endpoint: `POST /auth/login`
  - Body: `{ email, password }`
  - Response: `{ user, accessToken, refreshToken }`

- [ ] **Register** (`app/(auth)/register.tsx` line 48)
  - Endpoint: `POST /auth/register`
  - Body: `{ email, password, username }`
  - Response: `{ message: 'OTP sent' }`

- [ ] **Verify OTP** (`app/(auth)/verify-otp.tsx` line 22)
  - Endpoint: `POST /auth/verify-otp`
  - Body: `{ email, otp }`
  - Response: `{ message: 'Verified' }`

- [ ] **Load User** (`stores/authStore.ts` line 57)
  - Endpoint: `GET /auth/me`
  - Headers: `Authorization: Bearer {token}`
  - Response: `{ user }`

### Feed & Posts
- [ ] **Get Feed** (`app/(tabs)/(home)/index.tsx` line 35)
  - Endpoint: `GET /feed?page=1&limit=10`
  - Response: `{ data: Post[], hasMore: boolean }`

- [ ] **Create Post** (`app/create-post.tsx` line 67)
  - Endpoint: `POST /posts`
  - Body: `{ type, content, mediaUrl?, linkUrl?, pollOptions? }`
  - Response: `{ post }`

- [ ] **Like Post** (`components/PostCard.tsx` line 39)
  - Endpoint: `POST /posts/:id/like`
  - Response: `{ isLiked: boolean, likesCount: number }`

- [ ] **Get Post** (`app/post/[id].tsx` line 31)
  - Endpoint: `GET /posts/:id`
  - Response: `{ post }`

- [ ] **Get Comments** (`app/post/[id].tsx` line 40)
  - Endpoint: `GET /posts/:id/comments?page=1&limit=20`
  - Response: `{ data: Comment[] }`

- [ ] **Add Comment** (`app/post/[id].tsx` line 62)
  - Endpoint: `POST /posts/:id/comment`
  - Body: `{ content }`
  - Response: `{ comment }`

- [ ] **Share Post** (`components/PostCard.tsx` line 60)
  - Endpoint: `POST /posts/:id/share`
  - Response: `{ sharesCount: number }`

### Stories
- [ ] **Get Stories** (`app/(tabs)/(home)/index.tsx` line 51)
  - Endpoint: `GET /stories`
  - Response: `{ stories: Story[] }`

- [ ] **Create Story** (to be implemented)
  - Endpoint: `POST /stories`
  - Body: `{ type, mediaUrl?, content? }`
  - Response: `{ story }`

### User Profiles
- [ ] **Get User Profile** (`app/user/[id].tsx` line 28)
  - Endpoint: `GET /users/:id`
  - Response: `{ user, isFollowing: boolean }`

- [ ] **Get User Posts** (`app/user/[id].tsx` line 36)
  - Endpoint: `GET /users/:id/posts?page=1&limit=10`
  - Response: `{ data: Post[] }`

- [ ] **Follow User** (`app/user/[id].tsx` line 44)
  - Endpoint: `POST /users/:id/follow`
  - Response: `{ isFollowing: boolean }`

### Wallet
- [ ] **Get Wallet** (`app/(tabs)/wallet.tsx` line 23)
  - Endpoint: `GET /wallet`
  - Response: `{ balance: number }`

- [ ] **Get Transactions** (`app/(tabs)/wallet.tsx` line 32)
  - Endpoint: `GET /wallet/transactions?page=1&limit=20`
  - Response: `{ data: WalletTransaction[] }`

- [ ] **Deposit** (to be implemented)
  - Endpoint: `POST /payments/deposit`
  - Body: `{ amount, provider, phoneNumber }`
  - Response: `{ transactionId, paymentUrl }`

- [ ] **Withdraw** (to be implemented)
  - Endpoint: `POST /payments/withdraw`
  - Body: `{ amount, provider, phoneNumber }`
  - Response: `{ transactionId }`

### Chat
- [ ] **Get Conversations** (`app/(tabs)/chat.tsx` line 18)
  - Endpoint: `GET /conversations`
  - Response: `{ conversations: Conversation[] }`

- [ ] **Get Messages** (`app/conversation/[id].tsx` line 32)
  - Endpoint: `GET /conversations/:id/messages?page=1&limit=50`
  - Response: `{ data: Message[] }`

- [ ] **Send Message** (`app/conversation/[id].tsx` line 62)
  - Endpoint: `POST /conversations/:id/messages`
  - Body: `{ content, mediaUrl? }`
  - Response: `{ message }`

### Courses
- [ ] **Get Courses** (`app/courses/index.tsx` line 19)
  - Endpoint: `GET /courses?page=1&limit=10`
  - Response: `{ data: Course[] }`

- [ ] **Get Course** (to be implemented)
  - Endpoint: `GET /courses/:id`
  - Response: `{ course }`

- [ ] **Enroll in Course** (to be implemented)
  - Endpoint: `POST /courses/:id/enroll`
  - Response: `{ enrollment }`

---

## 🔧 Testing Integration

### 1. Test Authentication
```typescript
// In app/(auth)/login.tsx
const response = await apiClient.login('test@example.com', 'password123');
console.log('Login response:', response);
```

### 2. Test Feed
```typescript
// In app/(tabs)/(home)/index.tsx
const response = await apiClient.getFeed(1, 10);
console.log('Feed response:', response);
```

### 3. Test WebSocket
```typescript
// In app/_layout.tsx
socketService.connect();
socketService.on('message', (data) => {
  console.log('New message:', data);
});
```

---

## 🐛 Debugging

### Check API Logs
All API requests are logged in the console:
```
API Request: POST /auth/login
API Response: /auth/login - 200
```

### Check Token Storage
```typescript
import * as SecureStore from 'expo-secure-store';

const token = await SecureStore.getItemAsync('accessToken');
console.log('Stored token:', token);
```

### Check Network Errors
```typescript
try {
  await apiClient.login(email, password);
} catch (error) {
  console.error('API Error:', error.response?.data || error.message);
}
```

---

## 🔐 Authentication Flow

### 1. Login
```typescript
// User enters credentials
const response = await apiClient.login(email, password);

// Store tokens
await SecureStore.setItemAsync('accessToken', response.data.accessToken);
await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);

// Update auth store
authStore.setUser(response.data.user);

// Navigate to home
router.replace('/(tabs)/(home)');
```

### 2. Token Refresh (Automatic)
```typescript
// Handled automatically in services/api.ts
// When 401 error occurs:
// 1. Get refresh token from storage
// 2. Call POST /auth/refresh
// 3. Store new tokens
// 4. Retry original request
```

### 3. Logout
```typescript
// Clear tokens
await SecureStore.deleteItemAsync('accessToken');
await SecureStore.deleteItemAsync('refreshToken');

// Clear auth store
authStore.logout();

// Navigate to login
router.replace('/(auth)/login');
```

---

## 📡 WebSocket Integration

### Connection
```typescript
// Automatically connects when user is authenticated
// See app/_layout.tsx lines 42-52

useEffect(() => {
  if (isAuthenticated) {
    socketService.connect();
  } else {
    socketService.disconnect();
  }
}, [isAuthenticated]);
```

### Events
```typescript
// Listen for messages
socketService.on('message', (message) => {
  // Handle new message
  console.log('New message:', message);
});

// Send message
socketService.sendMessage(conversationId, content);

// Send typing indicator
socketService.sendTyping(conversationId, true);
```

---

## 💾 Data Flow

### Example: Creating a Post

1. **User Action**
   ```typescript
   // app/create-post.tsx
   handleCreatePost()
   ```

2. **API Call**
   ```typescript
   // services/api.ts
   await apiClient.createPost({ type, content, mediaUrl })
   ```

3. **Backend Processing**
   ```
   POST /posts
   - Validate input
   - Save to database
   - Award coins
   - Return post
   ```

4. **Update UI**
   ```typescript
   // Add coins to wallet
   addCoins(10, 'Created a post')
   
   // Show success
   Alert.alert('Success', 'Post created!')
   
   // Navigate back
   router.back()
   ```

5. **Refresh Feed**
   ```typescript
   // app/(tabs)/(home)/index.tsx
   // Pull to refresh will fetch new posts
   ```

---

## 🎯 Priority Integration Order

### Phase 1: Core Features (Week 1)
1. ✅ Authentication (login, register, OTP)
2. ✅ Feed (get posts)
3. ✅ Post actions (like, comment)
4. ✅ User profiles

### Phase 2: Social Features (Week 2)
1. ⏳ Follow/unfollow
2. ⏳ Stories
3. ⏳ Chat (real-time)
4. ⏳ Notifications

### Phase 3: Monetization (Week 3)
1. ⏳ Wallet integration
2. ⏳ Flutterwave payments
3. ⏳ Courses
4. ⏳ Celebrity chat

### Phase 4: Advanced (Week 4)
1. ⏳ Video calls
2. ⏳ Media uploads
3. ⏳ Search
4. ⏳ Admin features

---

## 📝 Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution**: Check if token is stored and valid
```typescript
const token = await SecureStore.getItemAsync('accessToken');
console.log('Token:', token);
```

### Issue: Network Error
**Solution**: Check if backend is running and URL is correct
```typescript
console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);
```

### Issue: CORS Error (Web only)
**Solution**: Backend needs to allow your web origin
```typescript
// Backend should have:
app.enableCors({
  origin: ['http://localhost:8081', 'https://yourdomain.com'],
  credentials: true,
});
```

### Issue: WebSocket Not Connecting
**Solution**: Check authentication and socket URL
```typescript
// Make sure user is authenticated
console.log('Is authenticated:', isAuthenticated);

// Check socket connection
console.log('Socket connected:', socketService.socket?.connected);
```

---

## 🚀 Deployment

### Frontend
```bash
# Update API URL for production
EXPO_PUBLIC_API_URL=https://v6r7hhgft77nghz9ncgpb9mfgkx69bg4.app.specular.dev

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Deploy web
expo export:web
```

### Backend
Already deployed at:
```
https://v6r7hhgft77nghz9ncgpb9mfgkx69bg4.app.specular.dev
```

---

## 📞 Support

If you encounter any issues:
1. Check the console logs
2. Verify API endpoint is correct
3. Test with Postman/curl
4. Check backend logs
5. Review this guide

---

Happy coding! 🎉
