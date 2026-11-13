import React from 'react';

interface MarkdownViewerProps {
  markdown: string;
  className?: string;
}

function renderInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-300 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ markdown, className = '' }) => {
  const lines = markdown.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Blank line
    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      elements.push(
        <pre
          key={`code-${i}`}
          className="my-3 p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Markdown table
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      const parseRow = (row: string) =>
        row
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim());

      const headers = parseRow(tableLines[0]);
      const rows = tableLines.slice(2).map(parseRow);

      elements.push(
        <div key={`tbl-${i}`} className="my-4 overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-mono">
                {headers.map((h, idx) => (
                  <th key={idx} className="px-3.5 py-2.5 font-semibold">
                    {renderInlineFormatting(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {rows.map((cells, rIdx) => (
                <tr key={rIdx} className="bg-slate-950/60 hover:bg-slate-900/50 transition-colors">
                  {cells.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2.5 text-slate-300">
                      {renderInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="text-xl font-bold text-white tracking-tight mt-2 mb-3 pb-2 border-b border-slate-800">
          {renderInlineFormatting(line.slice(2))}
        </h2>
      );
      i += 1;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="text-base font-bold text-cyan-300 mt-5 mb-2">
          {renderInlineFormatting(line.slice(3))}
        </h3>
      );
      i += 1;
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="text-sm font-semibold text-orange-400 mt-4 mb-1.5">
          {renderInlineFormatting(line.slice(4))}
        </h4>
      );
      i += 1;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="my-3 pl-3.5 py-1.5 border-l-2 border-teal-500 bg-slate-900/50 text-xs text-slate-300 italic rounded-r"
        >
          {renderInlineFormatting(line.slice(2))}
        </blockquote>
      );
      i += 1;
      continue;
    }

    // Bullet list
    if (line.trimStart().startsWith('- ') || line.trimStart().startsWith('* ')) {
      const listItems: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trimStart().startsWith('- ') || lines[i].trimStart().startsWith('* '))
      ) {
        listItems.push(lines[i].trimStart().slice(2));
        i += 1;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1.5 pl-4 text-xs sm:text-sm text-slate-300 list-disc marker:text-orange-500">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line.trimStart())) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trimStart())) {
        listItems.push(lines[i].trimStart().replace(/^\d+\.\s/, ''));
        i += 1;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-2 space-y-2 pl-5 text-xs sm:text-sm text-slate-300 list-decimal marker:text-cyan-400 marker:font-mono">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
        {renderInlineFormatting(line)}
      </p>
    );
    i += 1;
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};
