
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import mime from 'mime';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  // Join the slug parts and decode URI components to handle spaces correctly
  const slug = params.slug.map(segment => decodeURIComponent(segment)).join('/');

  // Construct the full path to the requested file within the 'themes' directory
  const themePath = path.join(process.cwd(), 'themes', slug);

  try {
    // Check if the file exists
    await fs.access(themePath);
    const stats = await fs.stat(themePath);

    if (stats.isFile()) {
      const fileContent = await fs.readFile(themePath);
      // Determine content type based on file extension
      const contentType = mime.getType(themePath) || 'application/octet-stream';
      
      return new NextResponse(fileContent, {
        status: 200,
        headers: { 'Content-Type': contentType },
      });
    }
    
    // If it's a directory or something else, it's a bad request
    return new NextResponse('Not a file', { status: 400 });

  } catch (error) {
    // If fs.access or fs.stat throws, the file doesn't exist
    console.error(`Theme file not found: ${themePath}`, error);
    return new NextResponse('Not Found', { status: 404 });
  }
}
