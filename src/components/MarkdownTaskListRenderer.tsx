
'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface MarkdownTaskListRendererProps {
  content: string;
  onContentChange: (newContent: string) => void;
  disabled?: boolean;
}

export const MarkdownTaskListRenderer: React.FC<MarkdownTaskListRendererProps> = ({
  content,
  onContentChange,
  disabled = false,
}) => {
  const lines = content.split('\n');

  const handleToggle = (lineOriginalIndex: number) => {
    const newLines = [...lines];
    const currentLine = newLines[lineOriginalIndex];

    if (currentLine.match(/^(\s*)\*\s*\[x\]\s*/i)) { // Checked to unchecked
      newLines[lineOriginalIndex] = currentLine.replace(/^(\s*)\*\s*\[x\]\s*/i, '$1* [ ] ');
    } else if (currentLine.match(/^(\s*)\*\s*\[ \]\s*/i)) { // Unchecked to checked
      newLines[lineOriginalIndex] = currentLine.replace(/^(\s*)\*\s*\[ \]\s*/i, '$1* [x] ');
    } else {
      return; // Not a task list item
    }
    onContentChange(newLines.join('\n'));
  };

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
          return (
            <div key={`${index}-${taskItemCounter}`} className="flex items-start" style={{ paddingLeft: `${indent.length * 0.5}em` }}>
              <Checkbox
                id={`task-item-${index}-${taskItemCounter}`}
                checked={true}
                onCheckedChange={() => handleToggle(index)}
                className="mr-2 mt-1 shrink-0"
                disabled={disabled}
                aria-label={`Sub-task: ${text}, checked`}
              />
              <label
                htmlFor={`task-item-${index}-${taskItemCounter}`}
                className={cn(
                  "flex-grow text-sm text-muted-foreground has-[button:disabled]:cursor-not-allowed",
                  !disabled && "cursor-pointer",
                  "line-through" // Strikethrough for checked items
                )}
              >
                {text}
              </label>
            </div>
          );
        } else if (matchUnchecked) {
          const indent = matchUnchecked[1];
          const text = matchUnchecked[2];
          taskItemCounter++;
          return (
            <div key={`${index}-${taskItemCounter}`} className="flex items-start" style={{ paddingLeft: `${indent.length * 0.5}em` }}>
              <Checkbox
                id={`task-item-${index}-${taskItemCounter}`}
                checked={false}
                onCheckedChange={() => handleToggle(index)}
                className="mr-2 mt-1 shrink-0"
                disabled={disabled}
                aria-label={`Sub-task: ${text}, not checked`}
              />
              <label
                htmlFor={`task-item-${index}-${taskItemCounter}`}
                 className={cn(
                  "flex-grow text-sm text-muted-foreground has-[button:disabled]:cursor-not-allowed",
                  !disabled && "cursor-pointer"
                )}
              >
                {text}
              </label>
            </div>
          );
        }
        // Render non-task lines as plain text
        return (
          <span key={`${index}-text`} className="block text-sm text-muted-foreground">{line || ' '}</span>
        );
      })}
    </div>
  );
};
