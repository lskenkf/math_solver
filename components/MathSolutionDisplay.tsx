import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MathSolutionResponse } from '@/services/mathSolverApi';

interface Props {
  solution: MathSolutionResponse;
}

export function MathSolutionDisplay({ solution }: Props) {
  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.solutionContainer}>
        {/* Title */}
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title" style={styles.title}>
            {solution.title}
          </ThemedText>
        </ThemedView>

        {/* Original Equations */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            📝 Original Equations
          </ThemedText>
          {solution.equations.map((equation, index) => (
            <ThemedView key={index} style={styles.equationContainer}>
              <ThemedText style={styles.equation}>{equation}</ThemedText>
            </ThemedView>
          ))}
        </ThemedView>

        {/* Solution Steps */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            🔢 Solution Steps
          </ThemedText>
          {solution.steps.map((step, index) => (
            <ThemedView key={index} style={styles.stepContainer}>
              <ThemedText style={styles.stepNumber}>
                Step {index + 1}
              </ThemedText>
              <ThemedText style={styles.stepDescription}>
                {step.description}
              </ThemedText>
              <ThemedView style={styles.calculationContainer}>
                <ThemedText style={styles.calculation}>
                  {step.calculation}
                </ThemedText>
                <ThemedText style={styles.result}>
                  = {step.result}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          ))}
        </ThemedView>

        {/* Final Solution */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            ✅ Final Solution
          </ThemedText>
          <ThemedView style={styles.finalSolutionContainer}>
            {solution.solution.x !== null && (
              <ThemedText style={styles.solutionValue}>
                x = {solution.solution.x}
              </ThemedText>
            )}
            {solution.solution.y !== null && (
              <ThemedText style={styles.solutionValue}>
                y = {solution.solution.y}
              </ThemedText>
            )}
            {solution.solution.x === null && solution.solution.y === null && (
              <ThemedText style={styles.solutionValue}>
                Solution completed
              </ThemedText>
            )}
          </ThemedView>
        </ThemedView>

        {/* Verification */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            🔍 Verification
          </ThemedText>
          <ThemedView style={styles.verificationContainer}>
            <ThemedText style={styles.verification}>
              {solution.verification}
            </ThemedText>
          </ThemedView>
        </ThemedView>
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
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  title: {
    textAlign: 'center',
    color: '#007AFF',
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  equationContainer: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  equation: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  stepContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  calculationContainer: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  calculation: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  result: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: '#28a745',
  },
  finalSolutionContainer: {
    padding: 16,
    backgroundColor: '#d4edda',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#28a745',
  },
  solutionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#155724',
    textAlign: 'center',
    marginVertical: 2,
  },
  verificationContainer: {
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  verification: {
    fontSize: 14,
    color: '#1565c0',
    fontStyle: 'italic',
  },
});

export default MathSolutionDisplay;
