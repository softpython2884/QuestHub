
'use server';

import {
  createGlobalDocument,
  getGlobalDocuments,
  getGlobalDocumentByUuid,
  updateGlobalDocument,
  deleteGlobalDocument,
  getLinkableProjects,
  createOrGetGlobalTag,
  clearTagsForGlobalDocument,
  linkTagToGlobalDocument,
  clearProjectLinkForGlobalDocument,
  linkProjectToGlobalDocument,
  toggleGlobalDocumentPinStatus,
  getDocAlbums,
  createDocAlbum,
  associateDocumentWithAlbum,
  removeDocumentFromAlbum,
} from '@/lib/db';
import { auth } from '@/lib/authEdge';
import { revalidatePath } from 'next/cache';
import type { Project, GlobalDocument, DocAlbum } from '@/types';


export async function getKnowledgeBaseData(): Promise<{ docs: GlobalDocument[], albums: DocAlbum[] }> {
  const docs = await getGlobalDocuments();
  const albums = await getDocAlbums();
  return { docs, albums };
}

export async function getGlobalDocumentAction(uuid: string) {
  return getGlobalDocumentByUuid(uuid);
}

export async function saveGlobalDocumentAction(
  uuid: string | null,
  title: string,
  content: string,
  tagsString?: string | null,
  linkedProjectUuid?: string | null,
  albumUuid?: string | null,
) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Authentication required." };
  }

  try {
    let docIdToUpdate: string;

    if (uuid) {
      const existingDoc = await getGlobalDocumentByUuid(uuid);
      if (!existingDoc) return { error: "Document not found." };
      if (existingDoc.authorUuid !== session.user.uuid && session.user.role !== 'admin') {
        return { error: "You do not have permission to edit this document." };
      }
      await updateGlobalDocument(uuid, title, content);
      docIdToUpdate = uuid;
    } else {
      const newDoc = await createGlobalDocument({
        authorUuid: session.user.uuid,
        title,
        content,
      });
      docIdToUpdate = newDoc.uuid;
    }

    // Handle tags
    await clearTagsForGlobalDocument(docIdToUpdate);
    if (tagsString) {
      const tagNames = tagsString.split(',').map(t => t.trim()).filter(Boolean);
      for (const name of tagNames) {
        const tag = await createOrGetGlobalTag(name);
        await linkTagToGlobalDocument(docIdToUpdate, tag.uuid);
      }
    }
    
    // Handle project link
    await clearProjectLinkForGlobalDocument(docIdToUpdate);
    if (linkedProjectUuid && linkedProjectUuid !== 'none') {
        await linkProjectToGlobalDocument(docIdToUpdate, linkedProjectUuid);
    }
    
    // Handle album association
    if (albumUuid && albumUuid !== 'no-album') {
        await associateDocumentWithAlbum(docIdToUpdate, albumUuid);
    } else {
        await removeDocumentFromAlbum(docIdToUpdate);
    }


    const finalDocument = await getGlobalDocumentByUuid(docIdToUpdate);

    revalidatePath('/documentation');
    if (finalDocument) {
        revalidatePath(`/documentation/${finalDocument.uuid}`);
    }
    
    return { document: finalDocument };

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

export async function getLinkableProjectsForUserAction(): Promise<Pick<Project, 'uuid' | 'name'>[]> {
    const session = await auth();
    const userUuid = session?.user?.uuid;
    return getLinkableProjects(userUuid);
}

export async function toggleGlobalDocumentPinAction(uuid: string, currentPinStatus: boolean) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return { error: 'You do not have permission to perform this action.' };
  }
  
  try {
    const updatedDocument = await toggleGlobalDocumentPinStatus(uuid, !currentPinStatus);
    if (updatedDocument) {
        revalidatePath('/documentation');
        return { success: true, document: updatedDocument };
    }
    return { error: 'Failed to update pin status.' };
  } catch(error: any) {
    return { error: error.message || 'An unknown error occurred.' };
  }
}

export async function createAlbumAction(title: string, description: string | undefined) {
    const session = await auth();
    if (!session?.user) {
        return { error: 'Authentication required.' };
    }
    try {
        const newAlbum = await createDocAlbum(title, description, session.user.uuid);
        revalidatePath('/documentation');
        return { album: newAlbum };
    } catch(e: any) {
        return { error: e.message || "Failed to create album." };
    }
}
