
'use client';

import { useEffect, useState, useRef, startTransition } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getMessagesAction, sendMessageAction, editMessageAction, deleteMessageAction } from '../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, MoreHorizontal, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';


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
    
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editedContent, setEditedContent] = useState('');
    const [deletingMessage, setDeletingMessage] = useState<Message | null>(null);

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
             setMessages(currentMessages => {
                if (JSON.stringify(freshMessages) !== JSON.stringify(currentMessages)) {
                    return freshMessages;
                }
                return currentMessages;
            });
        }, 3000);

        return () => clearInterval(poll);
    }, [conversationId, user]);


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
        const optimisticMessage: Message = {
            uuid: `optimistic-${Date.now()}`,
            conversationUuid: conversationId,
            authorUuid: user.uuid,
            authorName: user.name,
            authorAvatar: user.avatar,
            content: input.trim(),
            createdAt: new Date().toISOString(),
            pending: true,
        };
        
        startTransition(() => {
            setMessages(prev => [...prev, optimisticMessage]);
        });
        
        const result = await sendMessageAction(conversationId, input.trim());
        setInput('');
        
        if ('error' in result) {
             toast({ variant: 'destructive', title: 'Error', description: result.error });
             setMessages(prev => prev.filter(m => m.uuid !== optimisticMessage.uuid));
        } else {
            // Replace optimistic message with the real one from the server
            setMessages(prev => prev.map(m => m.uuid === optimisticMessage.uuid ? { ...result, pending: false } : m));
        }
        
        setTimeout(() => setIsSending(false), 1000); // Anti-spam delay
    };

    const handleStartEdit = (message: Message) => {
        setEditingMessage(message);
        setEditedContent(message.content);
    };
    
    const handleCancelEdit = () => {
        setEditingMessage(null);
        setEditedContent('');
    };

    const handleSaveEdit = async () => {
        if (!editingMessage || !editedContent.trim()) return;

        await editMessageAction(editingMessage.uuid, editedContent);
        // The revalidation will update the message list
        handleCancelEdit();
    };

    const handleDeleteMessage = async () => {
        if (!deletingMessage) return;
        await deleteMessageAction(deletingMessage.uuid);
        setDeletingMessage(null);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
    }
    
    return (
        <div className="flex flex-col h-full">
            {/* Header for mobile view */}
            <div className="p-2 border-b flex items-center gap-2 md:hidden sticky top-0 bg-background z-10">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/chat">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <h2 className="font-semibold text-base truncate">Chat</h2>
            </div>

            <ScrollArea className="flex-grow">
                <div className="p-4 space-y-4">
                    {messages.map(message => (
                        <div key={message.uuid} className={cn('group flex items-start gap-3', message.authorUuid === user?.uuid ? 'justify-end' : 'justify-start', message.pending && 'opacity-60')}>
                             {message.authorUuid === user?.uuid && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 shrink-0">
                                            <MoreHorizontal className="h-4 w-4"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => handleStartEdit(message)} disabled={message.isDeleted}>
                                            <Edit className="mr-2 h-4 w-4"/> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setDeletingMessage(message)} className="text-destructive" disabled={message.isDeleted}>
                                            <Trash2 className="mr-2 h-4 w-4"/> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                             )}

                            {message.authorUuid !== user?.uuid && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={message.authorAvatar} alt={message.authorName} />
                                    <AvatarFallback>{getInitials(message.authorName)}</AvatarFallback>
                                </Avatar>
                            )}

                            <div className={cn('rounded-lg px-3 py-2 text-sm break-words', message.authorUuid === user?.uuid ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                    {message.isDeleted ? (
                                        <p className="italic text-muted-foreground">This message has been deleted.</p>
                                    ) : editingMessage?.uuid === message.uuid ? (
                                        <div className="space-y-2">
                                            <Textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} rows={3} className="bg-background text-foreground"/>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
                                                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkGfm]} 
                                            className={cn(
                                                'prose prose-sm max-w-none',
                                                message.authorUuid === user?.uuid ? 'prose-primary-foreground' : 'dark:prose-invert'
                                            )}
                                            components={{
                                                a: ({node, ...props}) => <a {...props} className={cn("text-inherit hover:opacity-80", message.authorUuid === user?.uuid ? 'underline' : 'text-primary underline')} target="_blank" rel="noopener noreferrer" />
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    )}
                                </div>
                                 {message.isEdited && !message.isDeleted && (
                                    <span className="text-xs text-muted-foreground ml-2">(edited)</span>
                                 )}
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
            
            <AlertDialog open={!!deletingMessage} onOpenChange={(open) => !open && setDeletingMessage(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the message.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
