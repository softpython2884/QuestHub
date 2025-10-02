
'use server';

import { z } from 'zod';
import { createReminder, getRemindersForUser, deleteReminder } from '@/lib/db';
import { auth } from '@/lib/authEdge';
import { revalidatePath } from 'next/cache';

export async function getRemindersAction() {
    const session = await auth();
    if (!session?.user?.uuid) {
        return { error: 'Authentication required.' };
    }
    return getRemindersForUser(session.user.uuid);
}

const CreateReminderSchema = z.object({
  content: z.string().min(3, "Reminder content must be at least 3 characters.").max(500),
  remindAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format.",
  }),
});

export async function createReminderAction(
  prevState: { success: boolean; error: string | null; fieldErrors?: any },
  formData: FormData
) {
  const session = await auth();
  if (!session?.user?.uuid) {
    return { success: false, error: 'You must be logged in to create a reminder.' };
  }

  const validatedFields = CreateReminderSchema.safeParse({
    content: formData.get('content'),
    remindAt: formData.get('remindAt'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await createReminder({
      userUuid: session.user.uuid,
      content: validatedFields.data.content,
      remindAt: new Date(validatedFields.data.remindAt).toISOString(),
    });
    revalidatePath('/reminders');
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create reminder.' };
  }
}

export async function deleteReminderAction(uuid: string) {
    const session = await auth();
    if (!session?.user?.uuid) {
        return { success: false, error: 'Permission denied.' };
    }
    try {
        const success = await deleteReminder(uuid, session.user.uuid);
        if (success) {
            revalidatePath('/reminders');
            return { success: true };
        }
        return { success: false, error: 'Reminder not found or you do not have permission to delete it.' };
    } catch (error: any) {
        return { success: false, error: error.message || 'Failed to delete reminder.' };
    }
}
