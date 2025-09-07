import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUri?: string;
  isStreaming?: boolean;
}

const CHAT_HISTORY_KEY = 'math_solver_chat_history';
const MAX_MESSAGES = 100; // Limit to prevent storage bloat

export class ChatHistoryService {
  /**
   * Save chat messages to AsyncStorage
   */
  static async saveChatHistory(messages: ChatMessage[]): Promise<void> {
    try {
      // Limit the number of messages to prevent storage bloat
      const limitedMessages = messages.slice(-MAX_MESSAGES);
      
      // Convert Date objects to ISO strings for storage
      const serializedMessages = limitedMessages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString()
      }));
      
      await AsyncStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(serializedMessages));
      console.log(`💾 Saved ${limitedMessages.length} messages to chat history`);
    } catch (error) {
      console.error('❌ Failed to save chat history:', error);
    }
  }

  /**
   * Load chat messages from AsyncStorage
   */
  static async loadChatHistory(): Promise<ChatMessage[]> {
    try {
      const serializedMessages = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      
      if (!serializedMessages) {
        console.log('📭 No chat history found');
        return [];
      }
      
      const messages = JSON.parse(serializedMessages);
      
      // Convert ISO strings back to Date objects
      const deserializedMessages = messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      console.log(`📖 Loaded ${deserializedMessages.length} messages from chat history`);
      return deserializedMessages;
    } catch (error) {
      console.error('❌ Failed to load chat history:', error);
      return [];
    }
  }

  /**
   * Clear all chat history
   */
  static async clearChatHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
      console.log('🗑️ Cleared chat history');
    } catch (error) {
      console.error('❌ Failed to clear chat history:', error);
    }
  }

  /**
   * Get storage info for debugging
   */
  static async getStorageInfo(): Promise<{
    messageCount: number;
    storageSize: number;
    lastMessageTime?: Date;
  }> {
    try {
      const serializedMessages = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      
      if (!serializedMessages) {
        return { messageCount: 0, storageSize: 0 };
      }
      
      const messages = JSON.parse(serializedMessages);
      const lastMessage = messages[messages.length - 1];
      
      return {
        messageCount: messages.length,
        storageSize: serializedMessages.length,
        lastMessageTime: lastMessage ? new Date(lastMessage.timestamp) : undefined
      };
    } catch (error) {
      console.error('❌ Failed to get storage info:', error);
      return { messageCount: 0, storageSize: 0 };
    }
  }
}
