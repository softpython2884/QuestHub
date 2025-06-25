
import { getConversationsAction } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { ChatLayoutClient } from './_components/ChatLayoutClient';

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
    <ChatLayoutClient conversations={conversationsResult}>
        {children}
    </ChatLayoutClient>
  );
}
