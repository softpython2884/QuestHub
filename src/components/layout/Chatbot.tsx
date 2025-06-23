
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
import type { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const newHistory = [...messages, userMessage];
      const result = await workspaceAssistant({ history: newHistory });
      
      const aiMessage: ChatMessage = { role: 'model', content: result.response };
      setMessages((prev) => [...prev, aiMessage]);

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
          <ScrollArea className="flex-grow pr-4 -mr-4" ref={scrollAreaRef}>
            <div className="space-y-4 pr-4">
              {messages.map((message, index) => (
                <div key={index} className={cn('flex items-start gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                   {message.role === 'model' && (
                     <Avatar className="h-8 w-8">
                        <AvatarImage src="https://placehold.co/40x40.png" alt="Flowy" data-ai-hint="bot mascot" />
                        <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                   )}
                  <div className={cn('max-w-[80%] rounded-lg px-3 py-2 text-sm', message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm dark:prose-invert max-w-none break-words">
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
                          <AvatarImage src="https://placehold.co/40x40.png" alt="Flowy" data-ai-hint="bot mascot" />
                          <AvatarFallback>AI</AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2"/> Thinking...
                      </div>
                  </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
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
