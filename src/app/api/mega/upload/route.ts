import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { megaClient } from '@/lib/mega';
import { JwtUser } from '@/types/auth';
import { promises as fs } from 'fs';
import { join } from 'path';
import os from 'os';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TEMP_DIR = join(os.tmpdir(), 'cloud-uploads');

// Middleware to verify JWT token
const verifyToken = (authHeader: string | null): JwtUser => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.split(' ')[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token');
  }
  return decoded as JwtUser;
};

// Configure for uploads within Vercel Hobby plan limits
export const maxDuration = 60; // 60 seconds maximum for hobby plan
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Add custom configuration for files
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');

    // Verify JWT token
    const user = verifyToken(authHeader);

    // Initialize MEGA client if needed
    await megaClient.initialize({
      email: process.env.MEGA_EMAIL || '',
      password: process.env.MEGA_PASSWORD || '',
    });

    // Get form data
    const formData = await req.formData();
    const chunk = formData.get('chunk') as File;
    const fileName = formData.get('fileName') as string;
    const fileId = formData.get('fileId') as string;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const uploadPath = formData.get('path') as string || '';

    if (!chunk || !fileName || !fileId || isNaN(chunkIndex) || isNaN(totalChunks)) {
      throw new Error('Invalid chunk data');
    }

    // Create temp directory if it doesn't exist
    await fs.mkdir(TEMP_DIR, { recursive: true });
    
    // Save chunk to temp file
    const chunkPath = join(TEMP_DIR, `${fileId}-${chunkIndex}`);
    const buffer = Buffer.from(await chunk.arrayBuffer());
    await fs.writeFile(chunkPath, buffer);

    // If this is the last chunk, combine all chunks and upload
    if (chunkIndex === totalChunks - 1) {
      const chunks = [];
      for (let i = 0; i < totalChunks; i++) {
        const tempChunkPath = join(TEMP_DIR, `${fileId}-${i}`);
        const chunkData = await fs.readFile(tempChunkPath);
        chunks.push(chunkData);
        await fs.unlink(tempChunkPath); // Clean up chunk file
      }

      const completeBuffer = Buffer.concat(chunks);
      const completeFile = new File([completeBuffer], fileName);

      // If path already includes the user's folder, use it directly
      const folderPath = uploadPath.startsWith(user.employeeId)
        ? uploadPath
        : uploadPath
          ? `${user.employeeId}/${uploadPath}`
          : user.employeeId;

      const result = await megaClient.uploadFile(completeFile, folderPath);
      return NextResponse.json({ success: true, file: result });
    }

    return NextResponse.json({ success: true, message: 'Chunk received' });
  } catch (error) {
    console.error('Error in upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}
