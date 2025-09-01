import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MathSolutionResponse, StreamingSolutionState } from '@/services/mathSolverApi';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  finalSolution?: MathSolutionResponse | null;
}

interface Props {
  streamingState: StreamingSolutionState;
  finalSolution?: MathSolutionResponse | null;
  selectedImage?: string | null;
  onNewProblem: () => void;
}

export function MathChatInterface({ streamingState, finalSolution, selectedImage, onNewProblem }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingAnimation] = useState(new Animated.Value(0));
  const scrollViewRef = useRef<ScrollView>(null);

  // Animate typing indicator
  useEffect(() => {
    if (streamingState.isStreaming) {
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
  }, [streamingState.isStreaming]);

  // Update messages based on streaming state
  useEffect(() => {
    if (streamingState.isStreaming && streamingState.currentChunks.length > 0) {
      const currentContent = streamingState.currentChunks.join('');
      
      setMessages(prev => {
        const existingMessageIndex = prev.findIndex(msg => msg.isStreaming);
        
        if (existingMessageIndex >= 0) {
          // Update existing streaming message
          const updatedMessages = [...prev];
          updatedMessages[existingMessageIndex] = {
            ...updatedMessages[existingMessageIndex],
            content: currentContent,
          };
          return updatedMessages;
        } else {
          // Create new streaming message
          return [...prev, {
            id: `streaming-${Date.now()}`,
            type: 'assistant',
            content: currentContent,
            timestamp: new Date(),
            isStreaming: true,
          }];
        }
      });
    } else if (streamingState.fullResponse && finalSolution) {
      // Convert streaming message to final message
      setMessages(prev => {
        const updatedMessages = prev.map(msg => 
          msg.isStreaming 
            ? {
                ...msg,
                content: streamingState.fullResponse!,
                isStreaming: false,
                finalSolution: finalSolution,
              }
            : msg
        );
        return updatedMessages;
      });
    } else if (streamingState.error) {
      // Add error message
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `❌ Error: ${streamingState.error}`,
        timestamp: new Date(),
        isStreaming: false,
      }]);
    }
  }, [streamingState, finalSolution]);

  // Add user message when image is selected
  useEffect(() => {
    if (selectedImage && messages.length === 0) {
      setMessages([{
        id: 'user-1',
        type: 'user',
        content: '📸 I have a math problem to solve!',
        timestamp: new Date(),
      }]);
    }
  }, [selectedImage]);

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const renderMessage = (message: Message) => {
    if (message.type === 'user') {
      return (
        <ThemedView key={message.id} style={styles.userMessageContainer}>
          <ThemedView style={styles.userMessage}>
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
            {message.isStreaming ? (
              <ThemedView style={styles.streamingContent}>
                <ThemedText style={styles.assistantMessageText}>
                  {message.content || '🤖 AI is thinking...'}
                </ThemedText>
                <Animated.View style={[styles.typingIndicator, { opacity: typingAnimation }]}>
                  <View style={styles.dot} />
                </Animated.View>
              </ThemedView>
            ) : message.finalSolution ? (
              <ThemedView style={styles.solutionContent}>
                <ThemedText style={styles.solutionTitle}>✅ Solution Complete</ThemedText>
                
                <ThemedView style={styles.solutionSection}>
                  <ThemedText style={styles.sectionTitle}>🎯 Problem Type</ThemedText>
                  <ThemedText style={styles.sectionContent}>
                    {message.finalSolution.problem_type}
                  </ThemedText>
                </ThemedView>

                <ThemedView style={styles.solutionSection}>
                  <ThemedText style={styles.sectionTitle}>🧠 Approach</ThemedText>
                  <ThemedText style={styles.sectionContent}>
                    {message.finalSolution.approach}
                  </ThemedText>
                </ThemedView>

                <ThemedView style={styles.solutionSection}>
                  <ThemedText style={styles.sectionTitle}>📝 Extracted Problem</ThemedText>
                  <ThemedText style={styles.sectionContent}>
                    {message.finalSolution.extracted_problem}
                  </ThemedText>
                </ThemedView>

                <ThemedView style={styles.solutionSection}>
                  <ThemedText style={styles.sectionTitle}>🔢 Solution Steps</ThemedText>
                  {message.finalSolution.steps.map((step, index) => (
                    <ThemedView key={index} style={styles.stepContainer}>
                      <ThemedText style={styles.stepDescription}>
                        {step.description}
                      </ThemedText>
                      <ThemedText style={styles.stepCalculation}>
                        {step.calculation}
                      </ThemedText>
                      {step.result && (
                        <ThemedText style={styles.stepResult}>
                          {step.result}
                        </ThemedText>
                      )}
                    </ThemedView>
                  ))}
                </ThemedView>

                {message.finalSolution.solution && (
                  <ThemedView style={styles.solutionSection}>
                    <ThemedText style={styles.sectionTitle}>🎯 Final Answer</ThemedText>
                    <ThemedView style={styles.answerContainer}>
                      {message.finalSolution.solution.x !== null && (
                        <ThemedText style={styles.answerText}>
                          x = {message.finalSolution.solution.x}
                        </ThemedText>
                      )}
                      {message.finalSolution.solution.y !== null && (
                        <ThemedText style={styles.answerText}>
                          y = {message.finalSolution.solution.y}
                        </ThemedText>
                      )}
                    </ThemedView>
                  </ThemedView>
                )}
              </ThemedView>
            ) : (
              <ThemedText style={styles.assistantMessageText}>
                {message.content}
              </ThemedText>
            )}
          </ThemedView>
          <ThemedText style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString()}
          </ThemedText>
        </ThemedView>
      );
    }
  };

  return (
    <ThemedView style={styles.container}>
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

      {messages.length > 0 && (
        <ThemedView style={styles.footer}>
          <TouchableOpacity style={styles.newProblemButton} onPress={onNewProblem}>
            <Ionicons name="add-circle" size={20} color="#007AFF" />
            <ThemedText style={styles.newProblemText}>New Problem</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 80,
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
    lineHeight: 24,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  newProblemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  newProblemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
