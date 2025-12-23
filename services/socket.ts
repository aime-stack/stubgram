
import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

// Updated to use the Specular backend WebSocket URL
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'https://v6r7hhgft77nghz9ncgpb9mfgkx69bg4.app.specular.dev';

type MessageHandler = (message: any) => void;
type TypingHandler = (data: { userId: string; isTyping: boolean }) => void;

class SocketService {
  private socket: Socket | null = null;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private typingHandlers: Map<string, TypingHandler> = new Map();

  async connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('accessToken');
      
      // TODO: Backend Integration - Connect to WebSocket server with authentication
      this.socket = io(WS_URL, {
        auth: {
          token,
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // TODO: Backend Integration - Listen for new messages
      this.socket.on('new_message', (message) => {
        console.log('New message received:', message);
        const handler = this.messageHandlers.get(message.conversationId);
        if (handler) {
          handler(message);
        }
      });

      // TODO: Backend Integration - Listen for typing indicators
      this.socket.on('typing', (data) => {
        console.log('Typing indicator:', data);
        const handler = this.typingHandlers.get(data.conversationId);
        if (handler) {
          handler(data);
        }
      });

    } catch (error) {
      console.error('Socket connection error:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.messageHandlers.clear();
      this.typingHandlers.clear();
      console.log('Socket disconnected');
    }
  }

  // TODO: Backend Integration - Join a conversation room
  joinConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', { conversationId });
      console.log('Joined conversation:', conversationId);
    }
  }

  // TODO: Backend Integration - Leave a conversation room
  leaveConversation(conversationId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', { conversationId });
      console.log('Left conversation:', conversationId);
    }
  }

  // TODO: Backend Integration - Send a message via WebSocket
  sendMessage(conversationId: string, content: string) {
    if (this.socket?.connected) {
      this.socket.emit('send_message', { conversationId, content });
      console.log('Message sent:', { conversationId, content });
    }
  }

  // TODO: Backend Integration - Send typing indicator
  sendTyping(conversationId: string, isTyping: boolean) {
    if (this.socket?.connected) {
      this.socket.emit('typing', { conversationId, isTyping });
    }
  }

  onMessage(conversationId: string, handler: MessageHandler) {
    this.messageHandlers.set(conversationId, handler);
  }

  offMessage(conversationId: string) {
    this.messageHandlers.delete(conversationId);
  }

  onTyping(conversationId: string, handler: TypingHandler) {
    this.typingHandlers.set(conversationId, handler);
  }

  offTyping(conversationId: string) {
    this.typingHandlers.delete(conversationId);
  }
}

export const socketService = new SocketService();
