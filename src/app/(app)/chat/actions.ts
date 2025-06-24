
'use server';

import {
    getConversationsForUser,
    getMessagesForConversation,
    createMessage,
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
    // TODO: Add a check to ensure the current user is part of this conversation
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) return { error: "Authentication required" };

    try {
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
        revalidatePath(`/chat/${conversationUuid}`);
        revalidatePath('/chat'); // Revalidate the layout to update last message
        return newMessage;
    } catch (e: any) {
        return { error: e.message || "Failed to send message." };
    }
}
