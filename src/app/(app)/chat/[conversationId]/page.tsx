
'use client';

import { useEffect, useState, useRef, startTransition } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getMessagesAction, sendMessageAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ConversationPage() {
    const params = useParams();
    const conversationId = params.conversationId as string;
    const { user } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [input, setInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (conversationId) {
            setIsLoading(true);
            getMessagesAction(conversationId).then(result => {
                if ('error' in result) {
                    toast({ variant: 'destructive', title: 'Error', description: result.error });
                } else {
                    setMessages(result);
                }
                setIsLoading(false);
            });
        }
    }, [conversationId, toast]);
    
    useEffect(() => {
        if (!conversationId || !user) return;

        const poll = setInterval(async () => {
            if (document.hidden) return; // Don't poll if tab is not visible
            const freshMessages = await getMessagesAction(conversationId);
            if ('error' in freshMessages) {
                console.error('Polling error:', freshMessages.error);
                return;
            }
            // Only update if there are new messages we don't have locally
            if (freshMessages.length > messages.length) {
                setMessages(freshMessages);
            }
        }, 3000);

        return () => clearInterval(poll);
    }, [conversationId, user, messages.length]); // depend on messages.length to reset interval with new state


    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getInitials = (name?: string) => {
        if (!name) return '??';
        const names = name.split(' ');
        return (names[0][0] + (names.length > 1 ? names[names.length - 1][0] : '')).toUpperCase();
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !user || isSending) return;

        setIsSending(true);
        const currentInput = input;
        setInput('');

        const optimisticMessage: Message = {
            uuid: `optimistic-${Date.now()}`,
            conversationUuid: conversationId,
            authorUuid: user.uuid,
            authorName: user.name,
            authorAvatar: user.avatar,
            content: currentInput.trim(),
            createdAt: new Date().toISOString(),
            pending: true,
        };

        startTransition(() => {
            setMessages(prev => [...prev, optimisticMessage]);
        });
        
        try {
            const result = await sendMessageAction(conversationId, currentInput.trim());
            
            if ('error' in result) {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
                // Revert: remove optimistic message
                setMessages(prev => prev.filter(m => m.uuid !== optimisticMessage.uuid));
                setInput(currentInput);
            } else {
                // Success: replace optimistic message with the real one
                setMessages(prev => 
                    prev.map(m => 
                        m.uuid === optimisticMessage.uuid ? result : m
                    )
                );
            }
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Failed to send message. Please check your connection.' });
             setMessages(prev => prev.filter(m => m.uuid !== optimisticMessage.uuid));
             setInput(currentInput);
        } finally {
             setIsSending(false);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
    }
    
    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-grow">
                <div className="p-4 space-y-4">
                    {messages.map(message => (
                         <div key={message.uuid} className={cn('flex items-start gap-3', message.authorUuid === user?.uuid ? 'justify-end' : 'justify-start', message.pending && 'opacity-60')}>
                            {message.authorUuid !== user?.uuid && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={message.authorAvatar} alt={message.authorName} />
                                    <AvatarFallback>{getInitials(message.authorName)}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className="max-w-[75%] space-y-1">
                                {message.authorUuid !== user?.uuid && <p className="text-xs text-muted-foreground ml-2">{message.authorName}</p>}
                                <div className={cn('rounded-lg px-3 py-2 text-sm break-words', message.authorUuid === user?.uuid ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkGfm]} 
                                        className="prose prose-sm dark:prose-invert max-w-none"
                                        components={{
                                            a: ({node, ...props}) => <a {...props} className="underline text-inherit hover:opacity-80" target="_blank" rel="noopener noreferrer" />
                                        }}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                </div>
                            </div>
                            {message.authorUuid === user?.uuid && user && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>
             <div className="p-4 border-t bg-background">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Type a message..."
                        autoComplete="off"
                        disabled={isSending}
                    />
                    <Button type="submit" size="icon" disabled={!input.trim() || isSending}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                    </Button>
                </form>
            </div>
        </div>
    );
}
