
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
  // Internal state to manage lines for optimistic UI updates
  const [lines, setLines] = useState<string[]>(initialContent.split('\n'));

  // Sync with external changes to content (e.g., after saving via dialog)
  useEffect(() => {
    setLines(initialContent.split('\n'));
  }, [initialContent]);

  const handleToggle = useCallback((lineIndex: number) => {
    if (disabled) return;

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
    onContentChange(newLines.join('\n')); // Propagate change for server save (will be debounced by parent)
  }, [lines, onContentChange, disabled]);


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
                onCheckedChange={() => handleToggle(index)}
                className="mr-2 mt-1 shrink-0"
                disabled={disabled}
                aria-label={`Sub-task: ${text}, checked`}
              />
              <label
                htmlFor={itemId}
                className={cn(
                  "flex-grow text-sm text-muted-foreground",
                  !disabled && "cursor-pointer",
                  "line-through" 
                )}
                onClick={() => handleToggle(index)} 
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
                onCheckedChange={() => handleToggle(index)}
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
                onClick={() => handleToggle(index)} 
              >
                {text}
              </label>
            </div>
          );
        }
        
        if (line.trim() !== '') {
            return (
              <span key={`${index}-text`} className="block text-sm text-muted-foreground">{line}</span>
            );
        }
        return null; 
      })}
    </div>
  );
};
