
'use server';

import type { DiscordEmbed, DiscordWebhookPayload } from "@/types";

export async function sendDiscordNotification(webhookUrl: string, payload: DiscordWebhookPayload): Promise<{ success: boolean; error?: string }> {
    if (!webhookUrl) {
        console.warn("[DiscordService] Attempted to send notification but webhook URL is missing.");
        return { success: false, error: "Webhook URL is not configured." };
    }

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[DiscordService] Failed to send notification. Status: ${response.status}`, errorBody);
            return { success: false, error: `Discord API returned status ${response.status}.` };
        }
        
        console.log(`[DiscordService] Notification sent successfully to webhook ending in ...${webhookUrl.slice(-6)}`);
        return { success: true };
        
    } catch (error: any) {
        console.error("[DiscordService] Error sending notification:", error);
        return { success: false, error: error.message || "An unknown error occurred while sending the notification." };
    }
}
