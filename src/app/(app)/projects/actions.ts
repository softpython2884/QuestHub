
'use server';

import type { Project } from "@/types";
import { getProjectsForUser as dbGetProjectsForUser } from "@/lib/db";

export async function fetchProjectsAction(userUuid: string | undefined): Promise<Project[]> {
  if (!userUuid) return [];
  try {
    return await dbGetProjectsForUser(userUuid);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return [];
  }
}
