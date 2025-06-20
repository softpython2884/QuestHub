
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-project-ideas.ts';
import '@/ai/flows/summarize-project-documentation.ts';
// import '@/ai/flows/flag-api-key-risks.ts'; // Removed
import '@/ai/flows/generate-document-content.ts';
import '@/ai/flows/generate-project-scaffold.ts'; 
import '@/ai/flows/edit-file-content-ai.ts'; // Added new flow

