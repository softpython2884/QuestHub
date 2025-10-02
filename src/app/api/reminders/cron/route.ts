
import { type NextRequest, NextResponse } from 'next/server';
import { getDueReminders, markReminderAsTriggered } from '@/lib/db';
import { sendDiscordDirectMessage } from '@/lib/discord';

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        console.error('[CRON] CRON_SECRET is not set. Aborting.');
        return NextResponse.json({ error: 'Cron service not configured.' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const dueReminders = await getDueReminders();
        
        if (dueReminders.length === 0) {
            return NextResponse.json({ message: 'No due reminders.' });
        }

        console.log(`[CRON] Found ${dueReminders.length} due reminders to process.`);

        let successCount = 0;
        let errorCount = 0;

        for (const reminder of dueReminders) {
            try {
                // Here, we would trigger the actual push notification.
                // For now, we'll simulate it with a Discord DM if configured.
                await sendDiscordDirectMessage(reminder.userUuid, {
                    embeds: [{
                        title: "🔔 Reminder from FlowUp",
                        description: reminder.content,
                        color: 16776960, // Yellow
                        timestamp: new Date().toISOString(),
                    }]
                });

                await markReminderAsTriggered(reminder.uuid);
                successCount++;
                console.log(`[CRON] Processed reminder ${reminder.uuid} for user ${reminder.userUuid}`);
            } catch (error) {
                errorCount++;
                console.error(`[CRON] Failed to process reminder ${reminder.uuid}:`, error);
            }
        }

        return NextResponse.json({ 
            message: `Processed ${dueReminders.length} reminders.`,
            successCount,
            errorCount 
        });

    } catch (error: any) {
        console.error('[CRON] Unhandled error during reminder processing:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
