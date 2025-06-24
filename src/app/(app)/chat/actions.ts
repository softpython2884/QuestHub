
'use server';

import {
    getConversationsForUser,
    getMessagesForConversation,
    createMessage,
    markConversationAsRead,
} from '@/lib/db';
import { getCurrentUserUuid } from '@/lib/authEdge';
import { revalidatePath } from 'next/cache';
import type { Conversation, Message } from '@/types';

export async function getConversationsAction(): Promise<Conversation[] | { error: string }> {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) return { error: "Authentication required" };
    
    try {
        return await getConversationsForUser(userUuid);
    } catch (e: any) {
        return { error: e.message || "Failed to fetch conversations." };
    }
}

export async function getMessagesAction(conversationUuid: string): Promise<Message[] | { error: string }> {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) return { error: "Authentication required" };

    try {
        // Mark conversation as read when messages are fetched
        await markConversationAsRead(conversationUuid, userUuid);
        // Revalidate the chat path to update the sidebar unread status for all users
        revalidatePath('/chat');
        return await getMessagesForConversation(conversationUuid);
    } catch (e: any) {
        return { error: e.message || "Failed to fetch messages." };
    }
}

export async function sendMessageAction(conversationUuid: string, content: string): Promise<Message | { error: string }> {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) return { error: "Authentication required" };
    if (!content.trim()) return { error: "Message cannot be empty." };

    try {
        const newMessage = await createMessage(conversationUuid, userUuid, content.trim());
        // Revalidate the chat layout to update the last message in the sidebar
        revalidatePath('/chat');
        return newMessage;
    } catch (e: any) {
        return { error: e.message || "Failed to send message." };
    }
}
