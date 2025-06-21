
'use server';

import { z } from 'zod';
import { createGlobalAnnouncement, getGlobalAnnouncements, deleteGlobalAnnouncement } from '@/lib/db';
import { auth } from '@/lib/authEdge';
import { revalidatePath } from 'next/cache';

export async function getGlobalAnnouncementsAction() {
    return await getGlobalAnnouncements();
}

const CreateAnnouncementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(255),
  content: z.string().min(10, "Content must be at least 10 characters."),
});

export async function createGlobalAnnouncementAction(
  prevState: { success: boolean; error: string | null; fieldErrors: any },
  formData: FormData
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return { success: false, error: 'You do not have permission to perform this action.', fieldErrors: {} };
  }

  const validatedFields = CreateAnnouncementSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await createGlobalAnnouncement({
      authorUuid: session.user.uuid,
      title: validatedFields.data.title,
      content: validatedFields.data.content,
    });
    revalidatePath('/announcements');
    return { success: true, error: null, fieldErrors: {} };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create announcement.', fieldErrors: {} };
  }
}

export async function deleteGlobalAnnouncementAction(
  prevState: { success: boolean, error: string | null },
  formData: FormData
) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return { success: false, error: 'You do not have permission to perform this action.' };
  }

  const announcementUuid = formData.get('announcementUuid') as string;
  if (!announcementUuid) {
    return { success: false, error: 'Announcement ID is missing.' };
  }

  try {
    const success = await deleteGlobalAnnouncement(announcementUuid);
    if (success) {
      revalidatePath('/announcements');
      return { success: true, error: null };
    }
    return { success: false, error: 'Failed to delete announcement.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'An unknown error occurred.' };
  }
}
