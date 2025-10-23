import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { useTheme } from '../contexts/ThemeContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { ClipboardIcon, CheckIcon } from './icons';
import { Source } from '../types';
import { getTextDirection } from '../utils/textDirection';

interface CodeBlockProps {
  className?: string;
  children: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ className, children }) => {
    const { theme } = useTheme();
    const { t } = useLocalization();
    const [copied, setCopied] = useState(false);
    const textToCopy = String(children).replace(/\n$/, '');

    const language = className?.replace(/language-/, '');

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="my-6 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/70 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-800">
                <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">{language || 'code'}</span>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors">
                    {copied ? (
                        <>
                            <CheckIcon className="w-4 h-4 text-green-500" />
                            {t('search.copied')}
                        </>
                    ) : (
                        <>
                            <ClipboardIcon className="w-4 h-4" />
                            {t('search.copy')}
                        </>
                    )}
                </button>
            </div>
            <SyntaxHighlighter
                style={theme === 'dark' ? oneDark : oneLight}
                language={language}
                PreTag="div"
                customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                codeTagProps={{ style: { fontFamily: 'inherit', fontSize: '0.875rem' } }}
            >
                {textToCopy}
            </SyntaxHighlighter>
        </div>
    );
};

const Blockquote: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const content = React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === 'p') {
            return React.cloneElement(child as React.ReactElement<any>, { className: 'm-0 leading-relaxed' });
        }
        return <p className="m-0 leading-relaxed">{child}</p>;
    });
    return (
        <blockquote className="border-l-4 border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-800/40 rounded-r-lg not-italic px-4 py-3 my-8">
            {content}
        </blockquote>
    );
};

interface MarkdownRendererProps {
  content: string;
  sources?: Source[] | null;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, sources }) => {
  const direction = getTextDirection(content);

  return (
    <div
      dir={direction}
      className="text-base select-text"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6 mt-8" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-5 mt-12 border-b border-slate-200 dark:border-slate-700 pb-2" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 mt-10" {...props} />,
            p: ({node, ...props}) => <p className="leading-loose my-6 text-slate-700 dark:text-slate-300" {...props} />,
            strong: ({node, ...props}) => <strong className="font-bold text-slate-900 dark:text-slate-100" {...props} />,
            blockquote: ({node, ...props}) => <Blockquote {...props} />,
            ul: ({node, ...props}) => <ul className="my-6 list-disc list-outside pl-6 space-y-3" {...props} />,
            ol: ({node, ...props}) => <ol className="my-6 list-decimal list-outside pl-6 space-y-3" {...props} />,
            li: ({node, ...props}) => <li className="pl-2 text-slate-700 dark:text-slate-300 marker:text-brand-500" {...props} />,
          
            code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                if (match) {
                    return <CodeBlock className={className}>{children}</CodeBlock>;
                }
                // Inline code
                return (
                    <code className="text-emerald-600 dark:text-amber-400 bg-slate-100 dark:bg-slate-800 rounded-md px-1.5 py-1 font-mono text-[0.9em]" {...props}>
                        {children}
                    </code>
                );
            },
          a: ({ node, ...props }) => {
            if (props.href && props.href.startsWith('#citation-') && sources) {
              const sourceIndex = parseInt(props.href.replace('#citation-', ''), 10);
              const source = sources?.[sourceIndex];
              if (source === undefined) return <span>{`[${props.children}]`}</span>;
              
              const citationNumber = sourceIndex + 1;
              const safeTitle = source.title.replace(/"/g, '&quot;');
              const ariaLabel = `Source ${citationNumber}: ${safeTitle}`;

              return (
                <sup className="citation">
                  <button
                    className="citation-trigger"
                    data-source-index={sourceIndex}
                    title={safeTitle}
                    aria-label={ariaLabel}
                  >
                    {citationNumber}
                  </button>
                </sup>
              );
            }
            // Render normal links, ensuring they open in a new tab
            return <a className="text-sky-600 dark:text-sky-400 font-semibold no-underline hover:underline transition-colors" target="_blank" rel="noopener noreferrer" {...props} />;
          },
          pre: ({ children }) => <>{children}</>
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};