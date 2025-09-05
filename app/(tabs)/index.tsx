import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useRef, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
    ScrollView,
    Animated,
    TextInput,
    KeyboardAvoidingView
} from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import QuickAuth from '@/components/QuickAuth';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ChatMessageRenderer from '@/components/ChatMessageRenderer';
import { mathSolverApi } from '@/services/mathSolverApi';
import { useAuth } from '@/context/AuthContext';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUri?: string;
  isStreaming?: boolean;
}

export default function HomeScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const [typingAnimation] = useState(new Animated.Value(0));
  // Streaming buffers and timers (unused when rendering per chunk)
  const streamingBufferRef = useRef<string>('');
  const streamingTimerRef = useRef<NodeJS.Timer | null>(null);
  
  // Use the auth context
  const { isAuthenticated, isLoading: isCheckingAuth, setAuthenticated } = useAuth();

  // Request permissions on component mount
  React.useEffect(() => {
    requestPermissions();
  }, []);

  // Animate typing indicator
  useEffect(() => {
    if (messages.some(msg => msg.isStreaming)) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamingTimerRef.current) {
        clearInterval(streamingTimerRef.current);
        streamingTimerRef.current = null;
      }
    };
  }, []);

  const startStreamingFlush = (typingId: string) => {};

  const stopStreamingFlush = (typingId: string, finalText: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === typingId
        ? { ...msg, content: finalText, isStreaming: false }
        : msg
    ));
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'We need camera roll permissions to select math problems to solve.'
        );
      }

      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus.status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'We need camera permissions to take pictures of math problems.'
        );
      }
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        handleImageSelected(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleImageSelected = async (imageUri: string) => {
    // Add user message with image
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: '📸 I have a math problem to solve!',
      timestamp: new Date(),
      imageUri: imageUri,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setShowImagePicker(false);
    
    // Show typing indicator
    const typingMessage: ChatMessage = {
      id: `typing-${Date.now()}`,
      type: 'assistant',
      content: '🤖 AI is analyzing your math problem...',
      timestamp: new Date(),
      isStreaming: true,
    };
    
    setMessages(prev => [...prev, typingMessage]);
    
    try {
      await mathSolverApi.solveMathFromImageStream(
        imageUri,
        (chunk) => {
          setMessages(prev => prev.map(msg => 
            msg.id === typingMessage.id 
              ? {
                  ...msg,
                  content: (msg.content || '') + chunk,
                  isStreaming: true,
                }
              : msg
          ));
        },
        (full) => {
          stopStreamingFlush(typingMessage.id, full);
        },
        (err) => {
          stopStreamingFlush(typingMessage.id, `❌ Error: ${err}`);
        }
      );
    } catch (error) {
      console.error('❌ Image solve error:', error);
      
      // Replace typing message with error
      setMessages(prev => prev.map(msg => 
        msg.id === typingMessage.id 
          ? {
              ...msg,
              content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to solve math problem'}`,
              isStreaming: false,
            }
          : msg
      ));
      // no timer used in per-chunk mode
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputText,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    
    // Show typing indicator
    const typingMessage: ChatMessage = {
      id: `typing-${Date.now()}`,
      type: 'assistant',
      content: '🤖 AI is thinking...',
      timestamp: new Date(),
      isStreaming: true,
    };
    
    setMessages(prev => [...prev, typingMessage]);
    
    try {
      await mathSolverApi.sendChatMessageStream(
        inputText,
        (chunk) => {
          setMessages(prev => prev.map(msg => 
            msg.id === typingMessage.id 
              ? {
                  ...msg,
                  content: (msg.content || '') + chunk,
                  isStreaming: true,
                }
              : msg
          ));
        },
        (full) => {
          stopStreamingFlush(typingMessage.id, full);
        },
        (err) => {
          stopStreamingFlush(typingMessage.id, `❌ Error: ${err}`);
        }
      );
    } catch (error) {
      console.error('❌ Chat error:', error);
      
      // Replace typing message with error
      setMessages(prev => prev.map(msg => 
        msg.id === typingMessage.id 
          ? {
              ...msg,
              content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
              isStreaming: false,
            }
          : msg
      ));
      // no timer used in per-chunk mode
    }
  };

  const handleLogout = async () => {
    try {
      await mathSolverApi.logout();
      setAuthenticated(false);
      setMessages([]);
      console.log('👋 User logged out');
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    if (message.type === 'user') {
      return (
        <ThemedView key={message.id} style={styles.userMessageContainer}>
          <ThemedView style={styles.userMessage}>
            {message.imageUri && (
              <Image
                source={{ uri: message.imageUri }}
                style={styles.messageImage}
                contentFit="cover"
              />
            )}
            <ThemedText style={styles.userMessageText}>
              {message.content}
            </ThemedText>
          </ThemedView>
          <ThemedText style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString()}
          </ThemedText>
        </ThemedView>
      );
    } else {
      return (
        <ThemedView key={message.id} style={styles.assistantMessageContainer}>
          <ThemedView style={styles.assistantAvatar}>
            <Ionicons name="calculator" size={20} color="#007AFF" />
          </ThemedView>
          <ThemedView style={styles.assistantMessage}>
            <ChatMessageRenderer 
              content={message.content || '🤖 AI is thinking...'}
              style={styles.assistantMessageText}
              isStreaming={!!message.isStreaming}
            />
            {message.isStreaming && (
              <Animated.View style={[styles.typingIndicator, { opacity: typingAnimation }]}> 
                <View style={styles.dot} />
              </Animated.View>
            )}
          </ThemedView>
          <ThemedText style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString()}
          </ThemedText>
        </ThemedView>
      );
    }
  };

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Loading Math Solver...</ThemedText>
      </ThemedView>
    );
  }

  // Show full screen login if not authenticated
  if (!isAuthenticated) {
    return (
      <QuickAuth
        visible={true}
        onAuthSuccess={(token) => {
          setAuthenticated(true);
          console.log('✅ Authentication successful');
        }}
        fullScreen={true}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Math Solver AI
        </ThemedText>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#dc3545" />
        </TouchableOpacity>
      </ThemedView>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <Ionicons name="chatbubbles" size={48} color="#007AFF" />
            <ThemedText style={styles.emptyStateTitle}>
              Math Solver Chat
            </ThemedText>
            <ThemedText style={styles.emptyStateText}>
              Take a photo of a math problem and I'll solve it step by step!
            </ThemedText>
          </ThemedView>
        ) : (
          messages.map(renderMessage)
        )}
      </ScrollView>

      {/* Input Area */}
      <ThemedView style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TouchableOpacity 
            style={styles.attachButton} 
            onPress={() => setShowImagePicker(!showImagePicker)}
          >
            <Ionicons name="camera" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message or take a photo..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
          
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color={inputText.trim() ? "#007AFF" : "#ccc"} />
          </TouchableOpacity>
        </View>

        {/* Image Picker Options */}
        {showImagePicker && (
          <ThemedView style={styles.imagePickerContainer}>
            <TouchableOpacity style={styles.imagePickerButton} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#007AFF" />
              <ThemedText style={styles.imagePickerText}>Take Photo</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
              <Ionicons name="images" size={24} color="#007AFF" />
              <ThemedText style={styles.imagePickerText}>Choose Image</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  logoutButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  userMessage: {
    backgroundColor: '#007AFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
  },
  userMessageText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  assistantMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  assistantMessage: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  assistantMessageText: {
    color: '#333333',
    fontSize: 16,
    lineHeight: 22,
  },
  streamingContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  typingIndicator: {
    marginLeft: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#007AFF',
  },
  solutionContent: {
    gap: 12,
  },
  solutionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  solutionSection: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  sectionContent: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  stepContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  stepCalculation: {
    fontSize: 14,
    color: '#666666',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  stepResult: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  answerContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
  },
  answerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  timestamp: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
    marginLeft: 8,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    padding: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f8f9fa',
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  imagePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
});
