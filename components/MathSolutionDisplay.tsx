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
        {/* Main Title */}
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title" style={styles.title}>
            Math Solver
          </ThemedText>
        </ThemedView>

        {/* Problem Statement */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            📝 Problem Statement
          </ThemedText>
          <ThemedView style={styles.equationContainer}>
            <ThemedText style={styles.equation}>{solution.extracted_problem}</ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Problem Type */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            🏷️ Problem Type
          </ThemedText>
          <ThemedView style={styles.problemTypeContainer}>
            <ThemedText style={styles.problemType}>{solution.problem_type}</ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Solution Approach */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            🎯 Solution Approach
          </ThemedText>
          <ThemedView style={styles.approachContainer}>
            <ThemedText style={styles.approach}>{solution.approach}</ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Solution Steps */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            🔢 Step-by-Step Solution
          </ThemedText>
          {solution.steps.map((step, index) => (
            <ThemedView key={index} style={[
              styles.stepContainer,
              index === solution.steps.length - 1 ? styles.finalStepContainer : {}
            ]}>
              <ThemedView style={styles.stepHeader}>
                <ThemedText style={[
                  styles.stepNumber,
                  index === solution.steps.length - 1 ? styles.finalStepNumber : {}
                ]}>
                  {step.description}
                </ThemedText>
                <ThemedText style={styles.stepStatus}>
                  {step.result}
                </ThemedText>
              </ThemedView>
              <ThemedView style={styles.calculationContainer}>
                <ThemedText style={styles.calculation}>
                  {step.calculation}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          ))}
        </ThemedView>

        {/* Final Numerical Solution */}
        {(solution.solution.x !== null || solution.solution.y !== null) && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              🎯 Numerical Answer
            </ThemedText>
            <ThemedView style={styles.finalSolutionContainer}>
              {solution.solution.x !== null && (
                <ThemedView style={styles.solutionRow}>
                  <ThemedText style={styles.solutionLabel}>x =</ThemedText>
                  <ThemedText style={styles.solutionValue}>
                    {typeof solution.solution.x === 'number' ? solution.solution.x.toFixed(4) : solution.solution.x}
                  </ThemedText>
                </ThemedView>
              )}
              {solution.solution.y !== null && (
                <ThemedView style={styles.solutionRow}>
                  <ThemedText style={styles.solutionLabel}>y =</ThemedText>
                  <ThemedText style={styles.solutionValue}>
                    {typeof solution.solution.y === 'number' ? solution.solution.y.toFixed(4) : solution.solution.y}
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>
          </ThemedView>
        )}

        {/* Raw Response (for debugging) */}
        {solution.raw_response && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              🔧 AI Response (Debug)
            </ThemedText>
            <ThemedView style={styles.rawResponseContainer}>
              <ScrollView style={styles.rawResponseScroll}>
                <ThemedText style={styles.rawResponse}>
                  {solution.raw_response}
                </ThemedText>
              </ScrollView>
            </ThemedView>
          </ThemedView>
        )}
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
  problemTypeContainer: {
    padding: 12,
    backgroundColor: '#e1f5fe',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4fc3f7',
    alignItems: 'center',
  },
  problemType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0277bd',
    textTransform: 'capitalize',
  },
  approachContainer: {
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  approach: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#856404',
  },
  stepContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  finalStepContainer: {
    backgroundColor: '#d1ecf1',
    borderColor: '#bee5eb',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    flex: 1,
  },
  finalStepNumber: {
    color: '#0c5460',
    fontWeight: '700',
  },
  stepStatus: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
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
  solutionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  solutionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#155724',
    marginRight: 8,
  },
  solutionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#155724',
    fontFamily: 'monospace',
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
  rawResponseContainer: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    maxHeight: 200,
  },
  rawResponseScroll: {
    flex: 1,
  },
  rawResponse: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#6c757d',
    lineHeight: 16,
  },
});

export default MathSolutionDisplay;

