
# Social Media Platform - Full-Stack Application

A production-ready social media platform built with React Native (Expo), TypeScript, and a comprehensive backend API.

## 🚀 Features

### Core Features
- **Posts & Feed**: Create and view text, image, video, audio, poll, and link posts
- **Stories**: 24-hour ephemeral stories with image, video, and text support
- **Social Actions**: Like, comment, share, follow/unfollow
- **Reward System**: Earn "Snap Coins" for engagement (posts, likes, comments, shares)
- **Courses**: Browse and purchase online courses from teachers
- **Celebrity Chat**: Paid 1-to-1 messaging with celebrities
- **Payments**: Deposit & withdraw via Flutterwave (MTN/Airtel mobile money)
- **Real-time Chat**: WebSocket-powered messaging with typing indicators
- **Video Calls**: WebRTC-based video calling
- **Authentication**: Email/phone login with OTP, Google/Apple OAuth

### Technical Features
- **TypeScript**: Full type safety across the codebase
- **React Query**: Efficient data fetching and caching
- **Zustand**: Lightweight state management
- **Socket.IO**: Real-time communication
- **Expo Router**: File-based navigation
- **Animations**: Smooth transitions with Reanimated
- **Dark Mode**: Full light/dark theme support

## 📱 Screens Implemented

### Authentication
- `/app/(auth)/login.tsx` - Login screen with email/password
- `/app/(auth)/register.tsx` - Registration with username, email, password
- `/app/(auth)/verify-otp.tsx` - OTP verification screen

### Main Tabs
- `/app/(tabs)/(home)/index.tsx` - Feed with posts and stories
- `/app/(tabs)/wallet.tsx` - Wallet with balance, transactions, earning opportunities
- `/app/(tabs)/chat.tsx` - Conversations list
- `/app/(tabs)/profile.tsx` - User profile

### Features
- `/app/create-post.tsx` - Create posts (text, image, video, link, poll)
- `/app/post/[id].tsx` - Post details with comments
- `/app/user/[id].tsx` - User profile with posts and stats
- `/app/conversation/[id].tsx` - Chat conversation with real-time messaging
- `/app/courses/index.tsx` - Browse courses
- `/app/settings.tsx` - App settings and preferences

## 🎨 Design System

### Colors
```typescript
primary: '#8B5CF6'      // Vibrant purple
secondary: '#EC4899'    // Energetic pink
accent: '#F59E0B'       // Golden amber (coins)
highlight: '#10B981'    // Emerald green (success)
```

### Typography
- H1: 32px, Bold
- H2: 24px, Bold
- H3: 20px, Semibold
- Body: 16px, Regular
- Caption: 14px, Medium
- Small: 12px, Regular

### Spacing
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- xxl: 48px

## 🔧 Backend Integration

All API calls are marked with `TODO: Backend Integration` comments indicating where backend endpoints need to be called. The backend is being built with:

- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL (Supabase)
- **Real-time**: Socket.IO
- **Payments**: Flutterwave
- **Storage**: Supabase Storage
- **Auth**: JWT with refresh tokens

### API Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/verify-otp` - Verify OTP code
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user

#### Posts
- `POST /posts` - Create post
- `GET /feed` - Get personalized feed
- `GET /posts/:id` - Get single post
- `POST /posts/:id/like` - Like/unlike post
- `POST /posts/:id/comment` - Add comment
- `POST /posts/:id/share` - Share post
- `POST /posts/:id/boost` - Boost post with coins

#### Stories
- `POST /stories` - Create story
- `GET /stories` - Get stories from followed users
- `DELETE /stories/:id` - Delete story

#### Social
- `POST /users/:id/follow` - Follow/unfollow user
- `GET /users/:id/followers` - Get followers
- `GET /users/:id/following` - Get following
- `GET /users/:id` - Get user profile

#### Wallet & Payments
- `GET /wallet` - Get wallet balance
- `GET /wallet/transactions` - Get transaction history
- `POST /payments/deposit` - Initiate deposit
- `POST /payments/withdraw` - Request withdrawal

#### Chat
- `POST /conversations` - Create conversation
- `GET /conversations` - Get user's conversations
- `GET /conversations/:id/messages` - Get messages
- `POST /conversations/:id/messages` - Send message

#### Courses
- `GET /courses` - Get courses list
- `GET /courses/:id` - Get course details
- `POST /courses/:id/enroll` - Enroll in course

## 💰 Rewards System

### Earning Coins
- Create post: +10 coins
- Like post: +1 coin (max 50/day)
- Comment: +5 coins (max 20/day)
- Share: +3 coins (max 10/day)

### Spending Coins
- Boost posts: 10-100 coins
- Celebrity chat: Variable per message
- Course purchases: Set by teacher
- Account upgrades: Various tiers

### Anti-Fraud Measures
- Rate limiting per action type
- Daily earning caps
- IP tracking
- Suspicious activity detection

## 🔐 Security

- JWT access tokens (15min expiry)
- Refresh tokens (7 days expiry)
- Secure token storage with expo-secure-store
- Rate limiting on all endpoints
- Input validation and sanitization
- XSS protection
- HTTPS only in production

## 📦 State Management

### Auth Store (`stores/authStore.ts`)
- User authentication state
- Login/logout functions
- User profile management

### Wallet Store (`stores/walletStore.ts`)
- Coin balance tracking
- Transaction history
- Reward distribution

## 🌐 Real-time Features

### Socket.IO Events
- `message` - New message received
- `message:read` - Message read status
- `typing` - Typing indicator
- `notification` - Push notifications

### WebRTC
- Peer-to-peer video calls
- TURN server for NAT traversal
- Call signaling via WebSocket

## 🎯 Next Steps

1. **Backend Deployment**: Deploy the backend API to production
2. **Environment Setup**: Configure environment variables
3. **Testing**: Implement unit and integration tests
4. **CI/CD**: Set up GitHub Actions for automated builds
5. **App Store**: Prepare for iOS App Store and Google Play Store submission
6. **Analytics**: Integrate analytics tracking
7. **Push Notifications**: Set up Expo push notifications
8. **Performance**: Optimize images and implement lazy loading
9. **Accessibility**: Add accessibility labels and screen reader support
10. **Localization**: Add multi-language support

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

### Environment Variables
Create a `.env` file:
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

## 📱 Platform Support

- ✅ iOS (iPhone, iPad)
- ✅ Android (Phone, Tablet)
- ✅ Web (PWA)

## 🏗️ Architecture

```
app/
├── (auth)/          # Authentication screens
├── (tabs)/          # Main tab navigation
├── post/            # Post details
├── user/            # User profiles
├── conversation/    # Chat screens
├── courses/         # Course marketplace
├── settings.tsx     # Settings
└── create-post.tsx  # Post creation

components/
├── PostCard.tsx     # Post display component
├── StoriesBar.tsx   # Stories carousel
├── HeaderButtons.tsx # Navigation buttons
└── IconSymbol.tsx   # Cross-platform icons

services/
├── api.ts           # API client with interceptors
└── socket.ts        # WebSocket service

stores/
├── authStore.ts     # Authentication state
└── walletStore.ts   # Wallet state

types/
└── index.ts         # TypeScript definitions
```

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using React Native, Expo, and TypeScript
