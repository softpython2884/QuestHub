
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { searchGlobalAction, type SearchResult } from '@/app/(app)/actions/search';
import { FolderKanban, Settings, User } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce'; // Assuming you have a debounce hook

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  useEffect(() => {
    if (debouncedQuery.length > 0) {
      searchGlobalAction(debouncedQuery).then(setResults);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };
  
  const getIcon = (type: SearchResult['type']) => {
      switch(type) {
          case 'project': return <FolderKanban className="mr-2 h-4 w-4" />;
          case 'page': return <Settings className="mr-2 h-4 w-4" />;
          case 'user': return <User className="mr-2 h-4 w-4" />;
          default: return null;
      }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a command or search..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          {results.map((result) => (
            <CommandItem
              key={result.id}
              value={result.name}
              onSelect={() => runCommand(() => router.push(result.href))}
            >
              {getIcon(result.type)}
              <span>{result.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// A simple debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}
