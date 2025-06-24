
import { MessageSquareDashed } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function ChatPage() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageSquareDashed className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold">Select a conversation</h2>
            <p className="text-muted-foreground max-w-sm">
                Choose a conversation from the sidebar to start chatting, or start a new one from the Team page.
            </p>
             <Button asChild variant="link" className="mt-2">
                <Link href="/team">Go to Team Page</Link>
            </Button>
        </div>
    );
}
