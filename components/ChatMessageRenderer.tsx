import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

interface ChatMessageRendererProps {
  content: string;
  style?: any;
}

// Component to render LaTeX using WebView and MathJax
const LatexWebView = ({ latex, style, align = 'center' }: { latex: string; style?: any; align?: 'left' | 'center' | 'right' }) => {
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
          text-align: ${align};
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
  // Parse content into math blocks (\\[...\\]) and text blocks
  const parseContent = (text: string) => {
    const mathBlockRegex = /(\\\[[\s\S]*?\\\])/g;
    const segments = text.split(mathBlockRegex);
    return segments.map((segment, index) => {
      if (segment.match(mathBlockRegex)) {
        return { type: 'math' as const, content: segment };
      }
      return { type: 'text' as const, content: segment };
    });
  };

  // Convert common LaTeX document-style markup to lightweight markdown-like text
  const convertLatexToMarkdown = (latexContent: string) => {
    let markdownContent = latexContent;

    // Sections -> headers
    markdownContent = markdownContent.replace(/\\section\*\{([^}]+)\}/g, '## $1');
    markdownContent = markdownContent.replace(/\\section\{([^}]+)\}/g, '## $1');

    // Text formatting
    markdownContent = markdownContent.replace(/\\textbf\{([^}]+)\}/g, '**$1**');
    markdownContent = markdownContent.replace(/\\emph\{([^}]+)\}/g, '*$1*');
    markdownContent = markdownContent.replace(/\\textit\{([^}]+)\}/g, '*$1*');

    // Lists (itemize/enumerate)
    markdownContent = markdownContent.replace(/\\begin\{itemize\}/g, '');
    markdownContent = markdownContent.replace(/\\end\{itemize\}/g, '');
    markdownContent = markdownContent.replace(/(^|\n)\s*\\item\s+/g, '\\n- ');

    markdownContent = markdownContent.replace(/\\begin\{enumerate\}/g, '');
    markdownContent = markdownContent.replace(/\\end\{enumerate\}/g, '');
    // For enumerate, keep prefix "1." for readability (not actual ordered rendering here)
    markdownContent = markdownContent.replace(/(^|\n)\s*\\item\s+/g, '\\n1. ');

    // Spacing
    markdownContent = markdownContent.replace(/\\vspace\{[^}]+\}/g, '\n\n');
    markdownContent = markdownContent.replace(/\\\\(?:\[[^\]]*\])?/g, '\n');

    // Text commands
    markdownContent = markdownContent.replace(/\\text\{([^}]+)\}/g, '$1');
    markdownContent = markdownContent.replace(/\\quad/g, '    ');

    // Cleanup extra whitespace
    markdownContent = markdownContent.replace(/\n\s*\n\s*\n/g, '\n\n');

    return markdownContent;
  };

  // Detect inline math within a line (\\( ... \\) or $...$ but not $$...$$)
  const containsInlineMath = (text: string) => {
    const inlinePattern = /(\\\([\s\S]*?\\\)|(?<!\\)\$[^$\n]+(?<!\\)\$)/;
    return inlinePattern.test(text);
  };

  // Detect numbered step lines like "1. Step ..." (any leading spaces allowed)
  const isNumberedStep = (text: string) => {
    return /^\s*\d+\.\s/.test(text);
  };

  // Convert minimal inline markdown to HTML for WebView (so MathJax can render math inside bold/italic)
  const inlineMarkdownToHtml = (text: string) => {
    // Escape basic HTML chars to avoid breaking
    const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = escapeHtml(text);
    // Re-introduce math delimiters (they were escaped); replace escaped delimiters back
    html = html.replace(/\\\(/g, '\\(').replace(/\\\)/g, '\\)');
    html = html.replace(/\&\#36;\&\#36;([\s\S]*?)\&\#36;\&\#36;/g, '$$$$($1)$$$$'); // keep $$ $$ if ever escaped (unlikely)
    html = html.replace(/\&\#36;([^\n]+?)\&\#36;/g, '$$$1$');
    // Bold and italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1<\/strong>');
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1<\/em>');
    // Preserve simple line breaks for multi-line support
    html = html.replace(/\n/g, '<br/>');
    return html;
  };

  const parts = parseContent(content);

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
          const markdownLike = convertLatexToMarkdown(part.content);
          // Render minimal inline markdown (**bold**, *italic*) within Text
          const renderInlineMarkdown = (text: string) => {
            const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
            const elements: React.ReactNode[] = [];
            let lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(text)) !== null) {
              if (match.index > lastIndex) {
                elements.push(text.slice(lastIndex, match.index));
              }
              const token = match[0];
              if (token.startsWith('**')) {
                elements.push(
                  <Text key={`${index}-b-${lastIndex}`} style={{ fontWeight: '700' }}>
                    {token.slice(2, -2)}
                  </Text>
                );
              } else if (token.startsWith('*')) {
                elements.push(
                  <Text key={`${index}-i-${lastIndex}`} style={{ fontStyle: 'italic' }}>
                    {token.slice(1, -1)}
                  </Text>
                );
              }
              lastIndex = match.index + match[0].length;
            }
            if (lastIndex < text.length) {
              elements.push(text.slice(lastIndex));
            }
            return elements;
          };

          // Preserve line breaks; if a line contains inline math, render via WebView with MathJax
          const lines = markdownLike.split('\n');
          return (
            <View key={index} style={{ alignSelf: 'stretch' }}>
              {lines.map((line, li) => {
                const step = isNumberedStep(line);
                if (containsInlineMath(line)) {
                  const html = inlineMarkdownToHtml(line);
                  return (
                    <View key={`${index}-lwv-${li}`} style={[step ? styles.stepContainer : null]}>
                      <LatexWebView
                        latex={html}
                        style={style}
                        align={step ? 'left' : 'center'}
                      />
                    </View>
                  );
                }
                return (
                  <View key={`${index}-l-${li}`} style={[step ? styles.stepContainer : null]}>
                    <Text style={[styles.text, style]}>
                      {renderInlineMarkdown(line)}
                    </Text>
                  </View>
                );
              })}
            </View>
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
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    overflow: 'visible',
  },
  mathWebView: {
    backgroundColor: 'transparent',
  },
  stepContainer: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginVertical: 4,
  },
});
