import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

interface ChatMessageRendererProps {
  content: string;
  style?: any;
}

// Component to render LaTeX using WebView and MathJax
const LatexWebView = ({ latex, style }: { latex: string; style?: any }) => {
  const screenWidth = Dimensions.get('window').width;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
      <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
      <script>
        window.MathJax = {
          tex: {
            inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
            displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
          },
          startup: {
            ready: () => {
              MathJax.startup.defaultReady();
              MathJax.startup.promise.then(() => {
                // Auto-resize after MathJax renders
                setTimeout(() => {
                  const height = document.body.scrollHeight;
                  window.ReactNativeWebView.postMessage(JSON.stringify({height}));
                }, 100);
              });
            }
          }
        };
      </script>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          font-size: 16px;
          line-height: 1.4;
          margin: 8px;
          padding: 0;
          background-color: transparent;
          color: #333;
        }
        .math-container {
          text-align: center;
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="math-container">
        ${latex}
      </div>
    </body>
    </html>
  `;

  const [webViewHeight, setWebViewHeight] = React.useState(60);

  return (
    <View style={[styles.mathWebViewContainer, style]}>
      <WebView
        source={{ html }}
        style={[styles.mathWebView, { height: webViewHeight }]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.height) {
              setWebViewHeight(Math.max(40, data.height + 10));
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }}
        javaScriptEnabled={true}
        domStorageEnabled={false}
        startInLoadingState={false}
        mixedContentMode="compatibility"
      />
    </View>
  );
};

export default function ChatMessageRenderer({ content, style }: ChatMessageRendererProps) {
  // Function to detect LaTeX expressions in text and format them nicely
  const formatContent = (text: string) => {
    // Split by LaTeX delimiters (handle all common formats)
    const latexPattern = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g;
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
          return (
            <LatexWebView
              key={index}
              latex={part.content}
              style={style}
            />
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
  mathWebViewContainer: {
    marginVertical: 4,
    marginHorizontal: 2,
    alignSelf: 'stretch',
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  mathWebView: {
    backgroundColor: 'transparent',
  },
});
