
'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface MarkdownTaskListRendererProps {
  content: string;
  onContentChange: (newContent: string) => void;
  disabled?: boolean;
}

interface TaskItem {
  text: string;
  checked: boolean;
  originalIndex: number; // To map back to the original line in the content string
}

export const MarkdownTaskListRenderer: React.FC<MarkdownTaskListRendererProps> = ({
  content,
  onContentChange,
  disabled = false,
}) => {
  const lines = content.split('\n');

  const handleToggle = (itemIndex: number, lineOriginalIndex: number) => {
    const newLines = [...lines];
    const currentLine = newLines[lineOriginalIndex];

    if (currentLine.match(/^\s*\*\s*\[x\]\s*/i)) {
      newLines[lineOriginalIndex] = currentLine.replace(/^\s*\*\s*\[x\]\s*/i, '* [ ] ');
    } else if (currentLine.match(/^\s*\*\s*\[ \]\s*/i)) {
      newLines[lineOriginalIndex] = currentLine.replace(/^\s*\*\s*\[ \]\s*/i, '* [x] ');
    } else {
      // Not a standard task list item, do nothing or handle as error
      return;
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
          const currentItemIndex = taskItemCounter++;
          return (
            <div key={index} className="flex items-start" style={{ paddingLeft: `${indent.length * 0.5}em` }}>
              <Checkbox
                id={`task-item-${index}`}
                checked={true}
                onCheckedChange={() => handleToggle(currentItemIndex, index)}
                className="mr-2 mt-1 shrink-0"
                disabled={disabled}
                aria-label={`Sub-task: ${text}, checked`}
              />
              <label htmlFor={`task-item-${index}`} className="flex-grow text-sm text-muted-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70 has-[button:disabled]:cursor-not-allowed">
                <span className="line-through">{text}</span>
              </label>
            </div>
          );
        } else if (matchUnchecked) {
          const indent = matchUnchecked[1];
          const text = matchUnchecked[2];
          const currentItemIndex = taskItemCounter++;
          return (
            <div key={index} className="flex items-start" style={{ paddingLeft: `${indent.length * 0.5}em` }}>
              <Checkbox
                id={`task-item-${index}`}
                checked={false}
                onCheckedChange={() => handleToggle(currentItemIndex, index)}
                className="mr-2 mt-1 shrink-0"
                disabled={disabled}
                aria-label={`Sub-task: ${text}, not checked`}
              />
              <label htmlFor={`task-item-${index}`} className="flex-grow text-sm text-muted-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70 has-[button:disabled]:cursor-not-allowed">
                {text}
              </label>
            </div>
          );
        }
        // Render non-task lines as plain text
        // We use a span to ensure whitespace-pre-wrap applies correctly even to non-task lines.
        return (
          <span key={index} className="block text-sm text-muted-foreground">{line || ' '}</span>
        );
      })}
    </div>
  );
};

