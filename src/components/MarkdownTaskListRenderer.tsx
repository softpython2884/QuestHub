
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface MarkdownTaskListRendererProps {
  content: string;
  onContentChange: (newContent: string) => void;
  disabled?: boolean;
}

export const MarkdownTaskListRenderer: React.FC<MarkdownTaskListRendererProps> = ({
  content: initialContent,
  onContentChange,
  disabled = false,
}) => {
  const [lines, setLines] = useState<string[]>(initialContent.split('\n'));

  // Sync with external changes to content
  useEffect(() => {
    setLines(initialContent.split('\n'));
  }, [initialContent]);

  const handleToggle = useCallback((lineIndex: number) => {
    const newLines = [...lines];
    const currentLine = newLines[lineIndex];
    let updatedLine = currentLine;

    if (currentLine.match(/^(\s*)\*\s*\[x\]\s*/i)) { // Checked to unchecked
      updatedLine = currentLine.replace(/^(\s*)\*\s*\[x\]\s*/i, '$1* [ ] ');
    } else if (currentLine.match(/^(\s*)\*\s*\[ \]\s*/i)) { // Unchecked to checked
      updatedLine = currentLine.replace(/^(\s*)\*\s*\[ \]\s*/i, '$1* [x] ');
    } else {
      return; // Not a task list item
    }
    
    newLines[lineIndex] = updatedLine;
    setLines(newLines); // Optimistic UI update
    onContentChange(newLines.join('\n')); // Propagate change for server save
  }, [lines, onContentChange]);


  let taskItemCounter = 0;

  return (
    <div className="space-y-1 whitespace-pre-wrap break-words">
      {lines.map((line, index) => {
        const matchChecked = line.match(/^(\s*)\*\s*\[x\]\s*(.*)/i);
        const matchUnchecked = line.match(/^(\s*)\*\s*\[ \]\s*(.*)/i);

        if (matchChecked) {
          const indent = matchChecked[1];
          const text = matchChecked[2];
          taskItemCounter++;
          const itemId = `task-item-${index}-${taskItemCounter}`;
          return (
            <div key={itemId} className="flex items-start" style={{ paddingLeft: `${indent.length * 0.5}em` }}>
              <Checkbox
                id={itemId}
                checked={true}
                onCheckedChange={() => !disabled && handleToggle(index)}
                className="mr-2 mt-1 shrink-0"
                disabled={disabled}
                aria-label={`Sub-task: ${text}, checked`}
              />
              <label
                htmlFor={itemId}
                className={cn(
                  "flex-grow text-sm text-muted-foreground",
                  !disabled && "cursor-pointer",
                  "line-through" // Strikethrough for checked items
                )}
                onClick={() => !disabled && handleToggle(index)} // Allow clicking label
              >
                {text}
              </label>
            </div>
          );
        } else if (matchUnchecked) {
          const indent = matchUnchecked[1];
          const text = matchUnchecked[2];
          taskItemCounter++;
          const itemId = `task-item-${index}-${taskItemCounter}`;
          return (
            <div key={itemId} className="flex items-start" style={{ paddingLeft: `${indent.length * 0.5}em` }}>
              <Checkbox
                id={itemId}
                checked={false}
                onCheckedChange={() => !disabled && handleToggle(index)}
                className="mr-2 mt-1 shrink-0"
                disabled={disabled}
                aria-label={`Sub-task: ${text}, not checked`}
              />
              <label
                htmlFor={itemId}
                 className={cn(
                  "flex-grow text-sm text-muted-foreground",
                  !disabled && "cursor-pointer"
                )}
                onClick={() => !disabled && handleToggle(index)} // Allow clicking label
              >
                {text}
              </label>
            </div>
          );
        }
        // Render non-task lines as plain text (though ideally, todoListMarkdown should only contain task items)
        // Ensure to only render if line is not empty, to avoid extra spacing for empty lines from split
        if (line.trim() !== '') {
            return (
              <span key={`${index}-text`} className="block text-sm text-muted-foreground">{line}</span>
            );
        }
        return null; // Return null for empty lines to avoid rendering anything
      })}
    </div>
  );
};

