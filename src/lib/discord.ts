
'use server';

import type { DiscordEmbed, DiscordWebhookPayload } from "@/types";
import { getUserDiscordToken } from "./db";

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
            console.error(`[DiscordService] Failed to send webhook notification. Status: ${response.status}`, errorBody);
            return { success: false, error: `Discord API returned status ${response.status}.` };
        }
        
        console.log(`[DiscordService] Webhook notification sent successfully to ...${webhookUrl.slice(-6)}`);
        return { success: true };
        
    } catch (error: any) {
        console.error("[DiscordService] Error sending webhook notification:", error);
        return { success: false, error: error.message || "An unknown error occurred while sending the webhook notification." };
    }
}

export async function sendDiscordDirectMessage(userUuid: string, payload: DiscordWebhookPayload): Promise<{ success: boolean; error?: string }> {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    if (!BOT_TOKEN) {
        console.warn("[DiscordService] DISCORD_BOT_TOKEN is not configured. Cannot send direct messages.");
        // Silently fail if not configured, as it's an optional feature
        return { success: false, error: "Bot token not configured on server." };
    }

    const discordAuthDetails = await getUserDiscordToken(userUuid);
    if (!discordAuthDetails?.discordUserId) {
        console.log(`[DiscordService] User ${userUuid} has not connected their Discord account. Cannot send DM.`);
        return { success: false, error: "User has not connected Discord." };
    }
    const discordUserId = discordAuthDetails.discordUserId;

    try {
        // 1. Create a DM channel
        const dmChannelResponse = await fetch('https://discord.com/api/v10/users/@me/channels', {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${BOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipient_id: discordUserId,
            }),
        });

        if (!dmChannelResponse.ok) {
            const errorBody = await dmChannelResponse.text();
            console.error(`[DiscordService] Failed to create DM channel with user ${discordUserId}. Status: ${dmChannelResponse.status}`, errorBody);
            return { success: false, error: `Failed to open DM channel with user.` };
        }
        const dmChannel = await dmChannelResponse.json();
        const channelId = dmChannel.id;

        // 2. Send the message
        const messageResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bot ${BOT_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!messageResponse.ok) {
            const errorBody = await messageResponse.text();
            console.error(`[DiscordService] Failed to send DM to channel ${channelId}. Status: ${messageResponse.status}`, errorBody);
            return { success: false, error: `Failed to send message to user.` };
        }
        
        console.log(`[DiscordService] DM sent successfully to user ${discordUserId}`);
        return { success: true };

    } catch (error: any) {
        console.error("[DiscordService] Error sending direct message:", error);
        return { success: false, error: error.message || "An unknown error occurred while sending the direct message." };
    }
}
