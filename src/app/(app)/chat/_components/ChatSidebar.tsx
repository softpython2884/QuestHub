
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Conversation } from '@/types';
import { cn } from '@/lib/utils';
import { Users, Hash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatSidebarProps {
  initialConversations: Conversation[];
}

export function ChatSidebar({ initialConversations }: ChatSidebarProps) {
  const params = useParams();
  const activeConversationId = params.conversationId as string;

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    return (names[0][0] + (names.length > 1 ? names[names.length - 1][0] : '')).toUpperCase();
  };

  return (
    <div className="w-full max-w-xs border-r bg-muted/20">
      <div className="p-4">
        <h2 className="text-xl font-semibold tracking-tight">Conversations</h2>
      </div>
      <ScrollArea className="h-[calc(100%-4rem)]">
        <div className="p-2 space-y-1">
          {initialConversations.map(convo => (
            <Link
              key={convo.uuid}
              href={`/chat/${convo.uuid}`}
              className={cn(
                'flex items-center gap-3 rounded-lg p-2 text-sm transition-all hover:bg-muted',
                activeConversationId === convo.uuid && 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
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
      </ScrollArea>
    </div>
  );
}
