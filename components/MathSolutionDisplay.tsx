import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { MathSolutionResponse } from '@/services/mathSolverApi';

// Helper function to separate descriptive text from numerical operations
const parseCalculationText = (text: string) => {
  // Split by common mathematical patterns and operations
  const lines = text.split('\n').filter(line => line.trim());
  const descriptiveText: string[] = [];
  const operations: string[] = [];
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    // Check if line contains mathematical operations (numbers, operators, equations)
    const hasMathOperations = /[0-9]+|\+|\-|\*|\/|=|\^|\(|\)|≈|√|∫|∑|lim|sin|cos|tan|log/.test(trimmedLine);
    const hasEqualsSign = /=/.test(trimmedLine);
    const isMainlyNumbers = /^[0-9\s\+\-\*\/\=\.\(\)]+$/.test(trimmedLine);
    
    if (hasEqualsSign || isMainlyNumbers || (hasMathOperations && trimmedLine.length < 50)) {
      operations.push(trimmedLine);
    } else {
      descriptiveText.push(trimmedLine);
    }
  });
  
  return {
    description: descriptiveText.join(' '),
    operations: operations
  };
};

interface Props {
  solution: MathSolutionResponse;
}

export function MathSolutionDisplay({ solution }: Props) {
  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.solutionContainer}>
        {/* Problem Type */}
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title" style={styles.title}>
            {solution.problem_type}
          </ThemedText>
        </ThemedView>

        {/* Extracted Problem */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            📝 Problem Statement
          </ThemedText>
          <ThemedView style={styles.equationContainer}>
            <ThemedText style={styles.equation}>{solution.extracted_problem}</ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Approach */}
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
          {solution.steps.map((step, index) => {
            const parsedCalculation = parseCalculationText(step.calculation);
            return (
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
                
                {/* Descriptive text */}
                {parsedCalculation.description && (
                  <ThemedView style={styles.descriptionContainer}>
                    <ThemedText style={styles.description}>
                      {parsedCalculation.description}
                    </ThemedText>
                  </ThemedView>
                )}
                
                {/* Numerical operations */}
                {parsedCalculation.operations.length > 0 && (
                  <ThemedView style={styles.calculationContainer}>
                    {parsedCalculation.operations.map((operation, opIndex) => (
                      <ThemedText key={opIndex} style={styles.calculation}>
                        {operation}
                      </ThemedText>
                    ))}
                  </ThemedView>
                )}
                
                {/* Fallback for when parsing doesn't work well */}
                {!parsedCalculation.description && parsedCalculation.operations.length === 0 && (
                  <ThemedView style={styles.calculationContainer}>
                    <ThemedText style={styles.calculation}>
                      {step.calculation}
                    </ThemedText>
                  </ThemedView>
                )}
              </ThemedView>
            );
          })}
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
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
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
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  equation: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  approachContainer: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  approach: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#333333',
  },
  stepContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  finalStepContainer: {
    backgroundColor: '#f8f9fa',
    borderColor: 'rgba(0, 0, 0, 0.15)',
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
    color: '#007AFF',
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
  descriptionContainer: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
  },
  calculationContainer: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
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

