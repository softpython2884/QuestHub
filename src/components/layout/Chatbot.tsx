
'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { workspaceAssistant } from '@/ai/flows/workspace-assistant';
import type { ChatMessage, Project } from '@/types';
import { cn } from '@/lib/utils';
import { usePageContext } from '@/contexts/PageContext';
import { useRouter } from 'next/navigation';

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pageContext = usePageContext();
  const router = useRouter();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);
  
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const context = {
        pathname: window.location.pathname,
        projectUuid: pageContext.project?.uuid,
        projectName: pageContext.project?.name,
        filePath: pageContext.file?.path,
        fileContent: pageContext.file?.content,
      };
      
      const result = await workspaceAssistant({ history: newMessages, context });
      
      const aiMessage: ChatMessage = { role: 'model', content: result.response };
      setMessages((prev) => [...prev, aiMessage]);

      if (result.mutationOccurred) {
        console.log('[Chatbot] Mutation occurred, refreshing router.');
        router.refresh();
      }

    } catch (error) {
      const errorMessage: ChatMessage = { role: 'model', content: 'Sorry, I encountered an error. Please try again.' };
      setMessages((prev) => [...prev, errorMessage]);
      console.error('Chatbot error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bot className="text-primary"/>Flowy Assistant</DialogTitle>
            <DialogDescription>
              Your AI-powered workspace assistant. Ask me anything!
            </DialogDescription>
          </DialogHeader>
           <div className="flex-grow min-h-0">
            <ScrollArea className="h-full pr-4" ref={scrollAreaRef as React.RefObject<HTMLDivElement>}>
              <div className="space-y-4 pr-4">
                {messages.map((message, index) => (
                  <div key={index} className={cn('flex items-start gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {message.role === 'model' && (
                      <Avatar className="h-8 w-8">
                          <AvatarImage src="/favicon.png" alt="Flowy Avatar" />
                          <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={cn('max-w-[80%] rounded-lg px-3 py-2 text-sm break-words', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        className={cn(
                          'prose prose-sm max-w-none',
                          message.role === 'model' && 'dark:prose-invert'
                        )}
                        components={{
                          a: ({node, ...props}) => <a {...props} className={cn("text-inherit hover:opacity-80", message.role === 'user' ? 'underline' : 'text-primary underline')} target="_blank" rel="noopener noreferrer" />
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {message.role === 'user' && user && (
                      <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="user avatar" />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3 justify-start">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src="/favicon.png" alt="Flowy Avatar" />
                            <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2"/> Thinking...
                        </div>
                    </div>
                )}
              </div>
            </ScrollArea>
           </div>
          <DialogFooter className="flex-shrink-0">
            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your tasks, projects..."
                autoComplete="off"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => setIsOpen(true)}
      >
        <Bot className="h-7 w-7" />
        <span className="sr-only">Open AI Assistant</span>
      </Button>
    </>
  );
}
