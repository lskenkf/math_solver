/**
 * LaTeX Renderer Component
 * Renders mathematical equations using react-native-math-view
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MathView } from 'react-native-math-view';

interface LatexRendererProps {
  latex: string;
  style?: any;
  fontSize?: number;
}

export default function LatexRenderer({ latex, style, fontSize = 16 }: LatexRendererProps) {
  // Clean up the LaTeX string
  const cleanLatex = (latexString: string): string => {
    if (!latexString) return '';
    
    // Remove surrounding $$ if present
    let cleaned = latexString.replace(/^\$\$\s*/, '').replace(/\s*\$\$$/, '');
    
    // Remove single $ if present
    cleaned = cleaned.replace(/^\$\s*/, '').replace(/\s*\$$/, '');
    
    // Clean up common formatting issues
    cleaned = cleaned.trim();
    
    return cleaned;
  };

  const cleanedLatex = cleanLatex(latex);

  // If no valid LaTeX, show as plain text
  if (!cleanedLatex) {
    return (
      <Text style={[styles.fallbackText, style]}>
        {latex}
      </Text>
    );
  }

  try {
    return (
      <View style={[styles.container, style]}>
        <MathView
          math={cleanedLatex}
          style={[styles.mathView, { fontSize }]}
          config={{
            ex: fontSize,
            em: fontSize,
            containerStyle: {
              backgroundColor: 'transparent',
            },
          }}
        />
      </View>
    );
  } catch (error) {
    console.warn('LaTeX rendering error:', error);
    // Fallback to plain text if LaTeX rendering fails
    return (
      <Text style={[styles.fallbackText, style]}>
        {latex}
      </Text>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  mathView: {
    backgroundColor: 'transparent',
  },
  fallbackText: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'monospace',
    color: '#333',
  },
});
