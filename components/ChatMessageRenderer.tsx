import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

interface ChatMessageRendererProps {
  content: string;
  style?: any;
  isStreaming?: boolean;
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

export default function ChatMessageRenderer({ content, style, isStreaming = false }: ChatMessageRendererProps) {
  // Parse content into math blocks (\\[...\\] and $$...$$) and text blocks
  const parseContent = (text: string) => {
    const mathBlockRegex = /(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$)/g;
    const segments = text.split(mathBlockRegex);
    return segments.map((segment, index) => {
      if (segment.match(mathBlockRegex)) {
        return { type: 'math' as const, content: segment };
      }
      return { type: 'text' as const, content: segment };
    });
  };

  // Streaming-safe parser: only treat COMPLETE math blocks as math; leave incomplete tails as text
  const parseContentStreaming = (text: string) => {
    const parts: Array<{ type: 'math' | 'text'; content: string }> = [];
    let i = 0;
    const n = text.length;

    const pushText = (end: number) => {
      if (end > i) {
        parts.push({ type: 'text', content: text.slice(i, end) });
      }
    };

    const findClosing = (start: number, open: string, close: string) => {
      const closeIdx = text.indexOf(close, start + open.length);
      return closeIdx;
    };

    while (i < n) {
      const nextDisplay = text.indexOf('\\[', i);
      const nextDollarBlock = text.indexOf('$$', i);
      const candidates = [nextDisplay, nextDollarBlock].filter(idx => idx !== -1) as number[];
      if (candidates.length === 0) {
        // no more blocks
        pushText(n);
        break;
      }
      const next = Math.min(...candidates);
      // push text before next block
      pushText(next);

      // Determine block type
      if (next === nextDisplay) {
        const closeIdx = text.indexOf('\\]', next + 2);
        if (closeIdx !== -1) {
          const block = text.slice(next, closeIdx + 2);
          parts.push({ type: 'math', content: block });
          i = closeIdx + 2;
          continue;
        } else {
          // incomplete; push rest as text and break
          parts.push({ type: 'text', content: text.slice(next) });
          break;
        }
      } else if (next === nextDollarBlock) {
        const closeIdx = text.indexOf('$$', next + 2);
        if (closeIdx !== -1) {
          const block = text.slice(next, closeIdx + 2);
          parts.push({ type: 'math', content: block });
          i = closeIdx + 2;
          continue;
        } else {
          parts.push({ type: 'text', content: text.slice(next) });
          break;
        }
      }
    }

    return parts;
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
    // Check for proper LaTeX delimiters only
    // Match \( ... \) or $ ... $ (but not $$ ... $$)
    const inlinePattern = /(\\\([\s\S]*?\\\)|(?<!\\)\$[^$\n]+(?<!\\)\$)/;
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
    html = html.replace(/`([^`]+)`/g, '<code style="background-color: transparent; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1<\/code>');
    
    // Apply header styling if this is a header
    if (isHeader) {
      const fontSize = headerLevel === 2 ? '18px' : '16px';
      const fontWeight = headerLevel === 2 ? 'bold' : '600';
      const color = headerLevel === 2 ? '#007AFF' : '#333';
      html = `<div style="font-size: ${fontSize}; font-weight: ${fontWeight}; color: ${color}; margin-top: ${headerLevel === 2 ? '12px' : '8px'}; margin-bottom: ${headerLevel === 2 ? '6px' : '4px'}; text-align: left;">${html}</div>`;
    }
    
    // Preserve simple line breaks for multi-line support
    html = html.replace(/\n/g, '<br/>');
    return html;
  };

  const parts = isStreaming ? parseContentStreaming(content) : parseContent(content);

  return (
    <View style={[styles.container, style]}>
      {parts.map((part, index) => {
        if (part.type === 'math') {
          // Check if this is pure LaTeX content
          const isPure = isPureLatex(part.content);
          const containerStyle = isPure ? { 
            backgroundColor: 'transparent',
            borderRadius: 0,
            padding: 0,
            marginVertical: 4
          } : {};
          
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
          // Render minimal inline markdown (**bold**, *italic*, `code`) and LaTeX within Text
          const renderInlineMarkdown = (text: string) => {
            // Parse text into segments: regular text, markdown formatting, and LaTeX
            const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\\\([\s\S]*?\\\)|(?<!\\)\$[^$\n]+(?<!\\)\$)/g;
            const elements: React.ReactNode[] = [];
            let lastIndex = 0;
            let match: RegExpExecArray | null;
            
            while ((match = pattern.exec(text)) !== null) {
              // Add text before the match
              if (match.index > lastIndex) {
                elements.push(text.slice(lastIndex, match.index));
              }
              
              const token = match[0];
              
              // Handle LaTeX expressions
              if (token.match(/\\\([\s\S]*?\\\)/) || token.match(/(?<!\\)\$[^$\n]+(?<!\\)\$/)) {
                // Render LaTeX inline using WebView
                const html = inlineMarkdownToHtml(token);
                elements.push(
                  <LatexWebView
                    key={`${index}-latex-${lastIndex}`}
                    latex={html}
                    style={[style, { height: 20, marginHorizontal: 2 }]}
                    align="left"
                  />
                );
              }
              // Handle markdown formatting
              else if (token.startsWith('**')) {
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
                    backgroundColor: 'transparent', 
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
            
            // Add remaining text
            if (lastIndex < text.length) {
              elements.push(text.slice(lastIndex));
            }
            
            return elements;
          };

          // Preserve line breaks; if a line contains inline math, render via WebView with MathJax
          const lines = markdownLike.split('\n');
          
          // Group consecutive numbered steps together
          const processLines = () => {
            const elements: React.ReactNode[] = [];
            let i = 0;
            
            while (i < lines.length) {
              const line = lines[i];
              
              // Skip empty lines
              if (line.trim() === '') {
                i++;
                continue;
              }
              
              const header = parseMarkdownHeader(line);
              
              // Handle markdown headers
              if (header) {
                const html = inlineMarkdownToHtml(header.text, true, header.level);
                elements.push(
                  <View key={`${index}-h-${i}`} style={styles.headerContainer}>
                    <LatexWebView
                      latex={html}
                      style={style}
                      align="left"
                    />
                  </View>
                );
                i++;
                continue;
              }
              
              // Check if this is the start of a numbered step sequence
              if (isNumberedStep(line)) {
                const stepLines: string[] = [];
                
                // Collect all consecutive numbered steps
                while (i < lines.length && isNumberedStep(lines[i])) {
                  stepLines.push(lines[i]);
                  i++;
                }
                
                // Render all steps in a single container
                elements.push(
                  <View key={`${index}-steps-${i}`} style={styles.stepGroupContainer}>
                    {stepLines.map((stepLine, stepIndex) => {
                      return (
                        <View key={`${index}-step-${i}-${stepIndex}`} style={styles.stepContainer}>
                          <Text style={[styles.text, style]}>
                            {renderInlineMarkdown(stepLine)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
                continue;
              }
              
              // Handle regular lines (non-headers, non-steps)
              elements.push(
                <View key={`${index}-l-${i}`} style={styles.textContainer}>
                  <Text style={[styles.text, style]}>
                    {renderInlineMarkdown(line)}
                  </Text>
                </View>
              );
              
              i++;
            }
            
            return elements;
          };
          
          return (
            <View key={index} style={{ alignSelf: 'stretch' }}>
              {processLines()}
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
    lineHeight: 22,
    textAlign: 'left',
    marginBottom: 4,
  },
  mathWebViewContainer: {
    marginVertical: 3,
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
    paddingVertical: 2,
    paddingHorizontal: 12,
    marginVertical: 1,
    marginLeft: 8,
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
  },
  stepGroupContainer: {
    alignSelf: 'stretch',
    marginBottom: 6,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 12,
    marginBottom: 6,
  },
  subsectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  headerContainer: {
    alignSelf: 'stretch',
    marginBottom: 2,
  },
  textContainer: {
    alignSelf: 'stretch',
    marginBottom: 2,
  },
  noteBlock: {
    backgroundColor: 'transparent',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    padding: 8,
    marginVertical: 4,
    borderRadius: 4,
  },
  warningBlock: {
    backgroundColor: 'transparent',
    borderLeftWidth: 4,
    borderLeftColor: '#ff8c00',
    padding: 8,
    marginVertical: 4,
    borderRadius: 4,
  },
  codeBlock: {
    backgroundColor: 'transparent',
    padding: 8,
    marginVertical: 4,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
});
