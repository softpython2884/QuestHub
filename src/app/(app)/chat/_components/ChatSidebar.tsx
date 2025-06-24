
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conversation } from '@/types';
import { cn } from '@/lib/utils';
import { Users, Hash, AlertTriangle, MessageSquarePlus, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { getConversationsAction } from '../actions';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';


interface ChatSidebarProps {
  initialConversations: Conversation[];
}

export function ChatSidebar({ initialConversations }: ChatSidebarProps) {
  const params = useParams();
  const { toast } = useToast();
  const activeConversationId = params.conversationId as string;
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [isLoading, setIsLoading] = useState(initialConversations.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const pollConversations = async () => {
      if (document.hidden) return; // Don't poll if tab is not visible
      const result = await getConversationsAction();
      if ('error' in result) {
        if (error !== result.error) {
            setError(result.error);
            toast({ variant: 'destructive', title: 'Chat Error', description: 'Could not refresh conversations.'});
        }
      } else {
        setConversations(currentConversations => {
            if (JSON.stringify(result) !== JSON.stringify(currentConversations)) {
              return result;
            }
            return currentConversations;
        });
        if (error) setError(null);
      }
    };

    const intervalId = setInterval(pollConversations, 5000);

    return () => clearInterval(intervalId);
  }, [error, toast]);

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    return (names[0][0] + (names.length > 1 ? names[names.length - 1][0] : '')).toUpperCase();
  };
  
  const filteredConversations = conversations.filter(convo =>
    convo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-xs border-r bg-muted/20 flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold tracking-tight">Conversations</h2>
         <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search conversations..."
                className="pl-8 h-9 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-2 space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg p-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
            <div className="p-4 text-center text-destructive">
                <AlertTriangle className="mx-auto h-8 w-8 mb-2"/>
                <p className="text-sm font-semibold">Error</p>
                <p className="text-xs">{error}</p>
            </div>
        ) : filteredConversations.length === 0 ? (
             <div className="p-4 text-center text-muted-foreground mt-8">
                <MessageSquarePlus className="mx-auto h-10 w-10 mb-2"/>
                <h3 className="font-semibold">{searchTerm ? "No Results Found" : "No Conversations"}</h3>
                <p className="text-sm">{searchTerm ? "Try a different search term." : "Start a chat from the Team page."}</p>
             </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredConversations.map(convo => (
              <Link
                key={convo.uuid}
                href={`/chat/${convo.uuid}`}
                className={cn(
                  'flex items-center gap-3 rounded-lg p-2 text-sm transition-all hover:bg-muted',
                  activeConversationId === convo.uuid && 'bg-primary text-primary-foreground hover:bg-primary/90'
                )}
              >
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    {convo.avatar ? (
                      <AvatarImage src={convo.avatar} alt={convo.name} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                          {convo.type === 'project' ? <Hash className="h-5 w-5"/> : <Users className="h-5 w-5"/>}
                      </div>
                    )}
                    <AvatarFallback>{getInitials(convo.name)}</AvatarFallback>
                  </Avatar>
                   {convo.hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  )}
                </div>
                <div className="flex-1 truncate">
                  <p className="font-medium truncate">{convo.name}</p>
                  {convo.lastMessage && (
                    <p className={cn("text-xs truncate", activeConversationId === convo.uuid ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {convo.lastMessageAuthor}: {convo.lastMessage}
                    </p>
                  )}
                </div>
                {convo.lastMessageAt && (
                   <span className={cn("text-xs self-start", activeConversationId === convo.uuid ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {formatDistanceToNow(new Date(convo.lastMessageAt), { addSuffix: true })}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
