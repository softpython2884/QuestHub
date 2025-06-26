
'use client';
import type { Project } from '@/types';
import { createContext, useState, useContext, type ReactNode } from 'react';

export interface PageContextType {
  project?: Project;
  file?: { path: string; content: string; sha: string };
}

interface PageContextValue extends PageContextType {
  setPageContext: (context: PageContextType) => void;
}

const PageContext = createContext<PageContextValue | undefined>(undefined);

export const PageProvider = ({ children }: { children: ReactNode }) => {
  const [context, setContext] = useState<PageContextType>({});
  
  const setPageContext = (newContext: PageContextType) => {
    setContext(newContext);
  };
  
  return (
    <PageContext.Provider value={{ ...context, setPageContext }}>
      {children}
    </PageContext.Provider>
  );
};

export const usePageContext = () => {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error('usePageContext must be used within a PageProvider');
  }
  return context;
};
