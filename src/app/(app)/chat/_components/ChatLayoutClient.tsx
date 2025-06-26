'use client';
import { useParams } from 'next/navigation';
import { ChatSidebar } from './ChatSidebar';
import type { Conversation } from '@/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatLayoutClient({
  children,
  conversations,
}: {
  children: React.ReactNode;
  conversations: Conversation[];
}) {
  const params = useParams();
  const hasConversationId = !!params.conversationId;

  return (
    <div className="grid h-[calc(100vh-theme(spacing.24))] md:grid-cols-[auto,1fr]">
      {/* Sidebar - hidden on mobile when a chat is open */}
      <div className={cn('h-full', hasConversationId ? 'hidden md:block' : 'block')}>
        <ChatSidebar initialConversations={conversations} />
      </div>

      {/* Main Content - hidden on mobile when no chat is open */}
      <div className={cn('flex flex-col h-full', !hasConversationId && 'hidden md:block')}>
        {children}
      </div>
    </div>
  );
}
