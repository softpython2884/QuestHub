
'use server';

import {
  createGlobalDocument,
  getGlobalDocuments,
  getGlobalDocumentByUuid,
  updateGlobalDocument,
  deleteGlobalDocument
} from '@/lib/db';
import { auth } from '@/lib/authEdge';
import { revalidatePath } from 'next/cache';

export async function getGlobalDocumentsAction() {
  return getGlobalDocuments();
}

export async function getGlobalDocumentAction(uuid: string) {
  return getGlobalDocumentByUuid(uuid);
}

export async function saveGlobalDocumentAction(uuid: string | null, title: string, content: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Authentication required." };
  }

  try {
    let savedDocument;
    if (uuid) {
      // Check permission for updating
      const existingDoc = await getGlobalDocumentByUuid(uuid);
      if (!existingDoc) return { error: "Document not found." };
      if (existingDoc.authorUuid !== session.user.uuid && session.user.role !== 'admin') {
        return { error: "You do not have permission to edit this document." };
      }
      savedDocument = await updateGlobalDocument(uuid, title, content);
    } else {
      savedDocument = await createGlobalDocument({
        authorUuid: session.user.uuid,
        title,
        content,
      });
    }
    revalidatePath('/documentation');
    revalidatePath(`/documentation/${savedDocument?.uuid}`);
    return { document: savedDocument };
  } catch (error: any) {
    return { error: error.message || "Failed to save document." };
  }
}

export async function deleteGlobalDocumentAction(uuid: string) {
    const session = await auth();
    if (!session?.user) {
        return { error: "Authentication required." };
    }

    const doc = await getGlobalDocumentByUuid(uuid);
    if (!doc) {
        return { error: "Document not found." };
    }

    if (doc.authorUuid !== session.user.uuid && session.user.role !== 'admin') {
        return { error: "You do not have permission to delete this document." };
    }
    
    try {
        await deleteGlobalDocument(uuid);
        revalidatePath('/documentation');
        return { success: true };
    } catch (error: any) {
        return { error: error.message || "Failed to delete document." };
    }
}
