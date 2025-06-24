
import { getConversationsAction } from './actions';
import { ChatSidebar } from './_components/ChatSidebar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const conversationsResult = await getConversationsAction();

  if ('error' in conversationsResult) {
    return (
        <div className="p-4">
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Chat</AlertTitle>
                <AlertDescription>{conversationsResult.error}</AlertDescription>
            </Alert>
        </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))]">
        <ChatSidebar initialConversations={conversationsResult} />
        <div className="flex-1 overflow-y-auto">
            {children}
        </div>
    </div>
  );
}
