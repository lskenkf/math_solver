import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ChatMessageRendererProps {
  content: string;
  style?: any;
}

export default function ChatMessageRenderer({ content, style }: ChatMessageRendererProps) {
  // Function to detect LaTeX expressions in text and format them nicely
  const formatContent = (text: string) => {
    // Split by LaTeX delimiters (handle multiline)
    const latexPattern = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g;
    let lastIndex = 0;
    let match;
    const parts: Array<{ type: 'text' | 'math'; content: string }> = [];
    
    while ((match = latexPattern.exec(text)) !== null) {
      // Add text before LaTeX
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // Add LaTeX as formatted math
      parts.push({
        type: 'math',
        content: match[1]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }
    
    return parts;
  };

  const parts = formatContent(content);

  return (
    <View style={[styles.container, style]}>
      {parts.map((part, index) => {
        if (part.type === 'math') {
          // Clean up LaTeX for display
          let displayMath = part.content;
          
          // Remove LaTeX delimiters
          displayMath = displayMath.replace(/^\$\$\s*/, '').replace(/\s*\$\$$/, '');
          displayMath = displayMath.replace(/^\$\s*/, '').replace(/\s*\$$/, '');
          
          // Clean up common LaTeX commands for better display
          displayMath = displayMath
            .replace(/\\left\{/g, '{')
            .replace(/\\right\}/g, '}')
            .replace(/\\begin\{matrix\}/g, '')
            .replace(/\\end\{matrix\}/g, '')
            .replace(/\\\\/g, '\n')
            .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
            .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
            .replace(/\\sum/g, '∑')
            .replace(/\\int/g, '∫')
            .replace(/\\lim/g, 'lim')
            .replace(/\\sin/g, 'sin')
            .replace(/\\cos/g, 'cos')
            .replace(/\\tan/g, 'tan')
            .replace(/\\log/g, 'log')
            .replace(/\\ln/g, 'ln')
            .replace(/\\pi/g, 'π')
            .replace(/\\theta/g, 'θ')
            .replace(/\\alpha/g, 'α')
            .replace(/\\beta/g, 'β')
            .replace(/\\gamma/g, 'γ')
            .replace(/\\delta/g, 'δ')
            .replace(/\\epsilon/g, 'ε')
            .replace(/\\infty/g, '∞')
            .replace(/\\approx/g, '≈')
            .replace(/\\leq/g, '≤')
            .replace(/\\geq/g, '≥')
            .replace(/\\neq/g, '≠')
            .replace(/\\pm/g, '±')
            .replace(/\\times/g, '×')
            .replace(/\\div/g, '÷');
          
          return (
            <View key={index} style={styles.mathContainer}>
              <Text style={[styles.mathText, style]}>
                {displayMath}
              </Text>
            </View>
          );
        } else {
          return (
            <Text key={index} style={[styles.text, style]}>
              {part.content}
            </Text>
          );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  mathContainer: {
    marginVertical: 4,
    marginHorizontal: 2,
    alignSelf: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  mathText: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#495057',
    textAlign: 'center',
  },
});
