import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

interface ChatMessageRendererProps {
  content: string;
  style?: any;
}

// Component to render LaTeX using WebView and MathJax
const LatexWebView = ({ latex, style, align = 'left' }: { latex: string; style?: any; align?: 'left' | 'center' | 'right' }) => {
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
                // Wait for MathJax to fully render and then measure
                const measureHeight = () => {
                  // Get the math container element
                  const mathContainer = document.querySelector('.math-container');
                  if (mathContainer) {
                    // Get the actual rendered height of the math content
                    const rect = mathContainer.getBoundingClientRect();
                    const computedStyle = window.getComputedStyle(mathContainer);
                    
                    // Calculate total height including margins and padding
                    const marginTop = parseFloat(computedStyle.marginTop) || 0;
                    const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
                    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
                    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
                    
                    const totalHeight = rect.height + marginTop + marginBottom + paddingTop + paddingBottom;
                    
                    // Add extra padding for fractions and complex expressions
                    const extraPadding = 20;
                    
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      height: Math.max(60, totalHeight + extraPadding)
                    }));
                  } else {
                    // Fallback to body scroll height
                    const height = document.body.scrollHeight;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      height: Math.max(60, height + 20)
                    }));
                  }
                };
                
                // Measure immediately after render
                setTimeout(measureHeight, 50);
                
                // Measure again after a longer delay to catch any late rendering
                setTimeout(measureHeight, 200);
                
                // Final measurement to ensure accuracy
                setTimeout(measureHeight, 500);
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
          margin: 0;
          padding: 0;
          background-color: transparent;
          color: #333;
        }
        .math-container {
          text-align: ${align};
          margin: 0;
          padding: 0;
          display: block;
          overflow: visible;
        }
        /* Ensure fractions and complex expressions are fully visible */
        .math-container .MathJax {
          overflow: visible !important;
        }
        .math-container .MathJax_Display {
          overflow: visible !important;
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

  const [webViewHeight, setWebViewHeight] = React.useState(80);

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
              // Use the height directly from the improved measurement
              setWebViewHeight(Math.max(60, data.height));
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

    // Sections -> headers (enhanced for new prompt format)
    markdownContent = markdownContent.replace(/\\section\*\{([^}]+)\}/g, '## $1');
    markdownContent = markdownContent.replace(/\\section\{([^}]+)\}/g, '## $1');
    
    // Handle new enhanced sections from the updated prompt
    markdownContent = markdownContent.replace(/## Problem/g, '## Problem');
    markdownContent = markdownContent.replace(/## Solution/g, '## Solution');
    markdownContent = markdownContent.replace(/## Answer/g, '## Answer');
    markdownContent = markdownContent.replace(/## Key Concepts/g, '## Key Concepts');
    markdownContent = markdownContent.replace(/## Summary/g, '## Summary');
    markdownContent = markdownContent.replace(/## Practice Problems/g, '## Practice Problems');

    // Handle subsections (### Step 1, ### Method 1, etc.)
    markdownContent = markdownContent.replace(/### Step (\d+):/g, '### Step $1:');
    markdownContent = markdownContent.replace(/### Method (\d+):/g, '### Method $1:');

    // Text formatting
    markdownContent = markdownContent.replace(/\\textbf\{([^}]+)\}/g, '**$1**');
    markdownContent = markdownContent.replace(/\\emph\{([^}]+)\}/g, '*$1*');
    markdownContent = markdownContent.replace(/\\textit\{([^}]+)\}/g, '*$1*');

    // Handle new formatting from enhanced prompt
    // Note: blocks
    markdownContent = markdownContent.replace(/\*\*Note:\*\*/g, '**Note:**');
    markdownContent = markdownContent.replace(/\*\*Warning:\*\*/g, '**Warning:**');
    
    // Inline code blocks
    markdownContent = markdownContent.replace(/`([^`]+)`/g, '`$1`');

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
    // Check for various LaTeX delimiters
    const inlinePattern = /(\\\([\s\S]*?\\\)|(?<!\\)\$[^$\n]+(?<!\\)\$|\([\s\S]*?\))/;
    return inlinePattern.test(text);
  };

  // Detect numbered step lines like "1. Step ..." (any leading spaces allowed)
  const isNumberedStep = (text: string) => {
    return /^\s*\d+\.\s/.test(text);
  };

  // Detect markdown headers (## Header)
  const isMarkdownHeader = (text: string) => {
    return /^#{1,6}\s/.test(text);
  };

  // Get header level and text
  const parseMarkdownHeader = (text: string) => {
    const match = text.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      return {
        level: match[1].length,
        text: match[2]
      };
    }
    return null;
  };

  // Check if header contains LaTeX
  const headerContainsLatex = (headerText: string) => {
    // Check for various LaTeX delimiters and mathematical symbols
    return /\\\(|\\\)|\$|\\\[|\\\]|\(|\)|\+|\-|\*|\/|\^|\=|\\frac|\\sqrt|\\sum|\\int|\\lim|\\sin|\\cos|\\tan|\\log|\\ln|\\exp|\\pi|\\alpha|\\beta|\\gamma|\\delta|\\theta|\\lambda|\\mu|\\sigma|\\omega/.test(headerText);
  };

  // Check if content is pure LaTeX (only LaTeX delimiters and mathematical content)
  const isPureLatex = (content: string) => {
    // Simple check: if content starts and ends with LaTeX delimiters, it's pure LaTeX
    return /^\\\[[\s\S]*\\\]$/.test(content.trim()) || /^\$\$[\s\S]*\$\$$/.test(content.trim());
  };

  // Convert minimal inline markdown to HTML for WebView (so MathJax can render math inside bold/italic)
  const inlineMarkdownToHtml = (text: string, isHeader: boolean = false, headerLevel: number = 2) => {
    // First, temporarily replace LaTeX delimiters to prevent HTML escaping
    let tempText = text;
    const latexReplacements: { [key: string]: string } = {};
    let replacementIndex = 0;
    
    // Replace LaTeX delimiters with temporary placeholders
    tempText = tempText.replace(/(\\\(|\\\)|\$|\\\[|\\\])/g, (match) => {
      const placeholder = `__LATEX_${replacementIndex}__`;
      latexReplacements[placeholder] = match;
      replacementIndex++;
      return placeholder;
    });
    
    // Escape basic HTML chars to avoid breaking
    const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = escapeHtml(tempText);
    
    // Restore LaTeX delimiters
    Object.keys(latexReplacements).forEach(placeholder => {
      html = html.replace(placeholder, latexReplacements[placeholder]);
    });
    
    // Bold and italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1<\/strong>');
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1<\/em>');
    
    // Handle inline code blocks
    html = html.replace(/`([^`]+)`/g, '<code style="background-color: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1<\/code>');
    
    // Apply header styling if this is a header
    if (isHeader) {
      const fontSize = headerLevel === 2 ? '18px' : '16px';
      const fontWeight = headerLevel === 2 ? 'bold' : '600';
      const color = headerLevel === 2 ? '#007AFF' : '#333';
      html = `<div style="font-size: ${fontSize}; font-weight: ${fontWeight}; color: ${color}; margin-top: ${headerLevel === 2 ? '16px' : '12px'}; margin-bottom: ${headerLevel === 2 ? '8px' : '6px'}; text-align: left;">${html}</div>`;
    }
    
    // Preserve simple line breaks for multi-line support
    html = html.replace(/\n/g, '<br/>');
    return html;
  };

  const parts = parseContent(content);

  return (
    <View style={[styles.container, style]}>
      {parts.map((part, index) => {
        if (part.type === 'math') {
          // Check if this is pure LaTeX content
          const isPure = isPureLatex(part.content);
          const containerStyle = isPure ? { backgroundColor: '#f8f9fa' } : {};
          
          return (
            <View key={index} style={[styles.mathWebViewContainer, containerStyle]}>
              <LatexWebView
                latex={part.content}
                style={style}
              />
            </View>
          );
        } else {
          const markdownLike = convertLatexToMarkdown(part.content);
          // Render minimal inline markdown (**bold**, *italic*, `code`) within Text
          const renderInlineMarkdown = (text: string) => {
            // Check if text contains LaTeX
            if (containsInlineMath(text)) {
              // If text contains LaTeX, render it with WebView
              const html = inlineMarkdownToHtml(text);
              return (
                <LatexWebView
                  latex={html}
                  style={style}
                  align="left"
                />
              );
            }
            
            // Otherwise, render regular markdown
            const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g;
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
              } else if (token.startsWith('`')) {
                elements.push(
                  <Text key={`${index}-c-${lastIndex}`} style={{ 
                    backgroundColor: '#f0f0f0', 
                    paddingHorizontal: 4, 
                    paddingVertical: 2, 
                    borderRadius: 3, 
                    fontFamily: 'monospace',
                    fontSize: 14
                  }}>
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
                const header = parseMarkdownHeader(line);
                
                                                // Handle markdown headers
                if (header) {
                  const headerStyle = header.level === 2 ? styles.sectionHeader : styles.subsectionHeader;
                  
                  // Always render headers with WebView to ensure consistent styling
                  const html = inlineMarkdownToHtml(header.text, true, header.level);
                  console.log('Header rendered:', header.text, 'Level:', header.level);
                  return (
                    <View key={`${index}-h-${li}`}>
                      <LatexWebView
                        latex={html}
                        style={style}
                        align="left"
                      />
                    </View>
                  );
                }
                
                // Handle inline math
                if (containsInlineMath(line)) {
                  const html = inlineMarkdownToHtml(line);
                  return (
                    <View key={`${index}-lwv-${li}`} style={[step ? styles.stepContainer : null]}>
                      <LatexWebView
                        latex={html}
                        style={style}
                        align="left"
                      />
                    </View>
                  );
                }
                
                // Handle regular text
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
    alignSelf: 'stretch',
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
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
    padding: 0,
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
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 16,
    marginBottom: 8,
  },
  subsectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 6,
  },
  noteBlock: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    padding: 8,
    marginVertical: 4,
    borderRadius: 4,
  },
  warningBlock: {
    backgroundColor: '#fff8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#ff8c00',
    padding: 8,
    marginVertical: 4,
    borderRadius: 4,
  },
  codeBlock: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    marginVertical: 4,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
});
