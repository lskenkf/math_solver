import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MathSolutionResponse, StreamingSolutionState } from '@/services/mathSolverApi';

interface Props {
  streamingState: StreamingSolutionState;
  finalSolution?: MathSolutionResponse | null;
}

export function StreamingMathSolutionDisplay({ streamingState, finalSolution }: Props) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [currentDisplayText, setCurrentDisplayText] = useState('');

  // Animate new chunks appearing
  useEffect(() => {
    if (streamingState.currentChunks.length > 0) {
      const latestChunk = streamingState.currentChunks[streamingState.currentChunks.length - 1];
      setCurrentDisplayText(streamingState.currentChunks.join(''));
      
      // Fade in animation for new content
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [streamingState.currentChunks]);

  // Show streaming state
  if (streamingState.isStreaming) {
    return (
      <ScrollView style={styles.container}>
        <ThemedView style={styles.solutionContainer}>
          {/* Streaming Header */}
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title" style={styles.title}>
              🤖 AI is Solving Your Problem
            </ThemedText>
            <ThemedView style={styles.streamingIndicator}>
              <View style={styles.dot} />
              <ThemedText style={styles.streamingText}>Live Streaming</ThemedText>
            </ThemedView>
          </ThemedView>

          {/* Problem ID */}
          {streamingState.problemId && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                🆔 Problem ID: {streamingState.problemId}
              </ThemedText>
            </ThemedView>
          )}

          {/* Live Streaming Content */}
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              📡 Live Solution Stream
            </ThemedText>
            <Animated.View style={[styles.streamingContent, { opacity: fadeAnim }]}>
              <ThemedText style={styles.streamingText}>
                {currentDisplayText || 'Waiting for AI response...'}
              </ThemedText>
              {streamingState.currentChunks.length > 0 && (
                <View style={styles.cursor} />
              )}
            </Animated.View>
          </ThemedView>

          {/* Progress Indicator */}
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              📊 Progress
            </ThemedText>
            <ThemedView style={styles.progressContainer}>
              <ThemedText style={styles.progressText}>
                Received {streamingState.currentChunks.length} chunks
              </ThemedText>
              <ThemedText style={styles.progressText}>
                Total characters: {currentDisplayText.length}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    );
  }

  // Show error state
  if (streamingState.error) {
    return (
      <ScrollView style={styles.container}>
        <ThemedView style={styles.solutionContainer}>
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title" style={[styles.title, styles.errorTitle]}>
              ❌ Streaming Error
            </ThemedText>
          </ThemedView>
          
          <ThemedView style={styles.section}>
            <ThemedText style={styles.errorText}>
              {streamingState.error}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    );
  }

  // Show final solution if available
  if (finalSolution) {
    return (
      <ScrollView style={styles.container}>
        <ThemedView style={styles.solutionContainer}>
          {/* Final Solution Header */}
          <ThemedView style={styles.titleContainer}>
            <ThemedText type="title" style={styles.title}>
              ✅ Solution Complete
            </ThemedText>
            <ThemedView style={styles.completedIndicator}>
              <ThemedText style={styles.completedText}>Streaming Finished</ThemedText>
            </ThemedView>
          </ThemedView>

          {/* Problem Type */}
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              🎯 Problem Type
            </ThemedText>
            <ThemedText style={styles.contentText}>
              {finalSolution.problem_type}
            </ThemedText>
          </ThemedView>

          {/* Approach */}
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              🧠 Solution Approach
            </ThemedText>
            <ThemedText style={styles.contentText}>
              {finalSolution.approach}
            </ThemedText>
          </ThemedView>

          {/* Extracted Problem */}
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              📝 Extracted Problem
            </ThemedText>
            <ThemedText style={styles.contentText}>
              {finalSolution.extracted_problem}
            </ThemedText>
          </ThemedView>

          {/* Solution Steps */}
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              🔢 Solution Steps
            </ThemedText>
            {finalSolution.steps.map((step, index) => (
              <ThemedView key={index} style={styles.stepContainer}>
                <ThemedText style={styles.stepTitle}>
                  {step.description}
                </ThemedText>
                <ThemedText style={styles.stepContent}>
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

          {/* Final Answer */}
          {finalSolution.solution && (
            <ThemedView style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                🎯 Final Answer
              </ThemedText>
              <ThemedView style={styles.answerContainer}>
                {finalSolution.solution.x !== null && (
                  <ThemedText style={styles.answerText}>
                    x = {finalSolution.solution.x}
                  </ThemedText>
                )}
                {finalSolution.solution.y !== null && (
                  <ThemedText style={styles.answerText}>
                    y = {finalSolution.solution.y}
                  </ThemedText>
                )}
              </ThemedView>
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    );
  }

  // Default state
  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.solutionContainer}>
        <ThemedText style={styles.placeholderText}>
          Ready to start streaming solution...
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  solutionContainer: {
    padding: 16,
    gap: 16,
  },
  titleContainer: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorTitle: {
    color: '#ef4444',
  },
  streamingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3b82f6',
    borderRadius: 20,
  },
  completedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#10b981',
    borderRadius: 20,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  streamingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  completedText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  streamingContent: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    minHeight: 100,
  },
  cursor: {
    width: 2,
    height: 20,
    backgroundColor: '#3b82f6',
    marginLeft: 4,
  },
  progressContainer: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    gap: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  stepContainer: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
  },
  stepContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepResult: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  answerContainer: {
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  answerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065f46',
  },
  placeholderText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
  },
});
