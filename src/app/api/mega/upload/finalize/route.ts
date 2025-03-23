import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { megaClient } from '@/lib/mega';
import { JwtUser } from '@/types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');

    // Verify JWT token
    const user = verifyToken(authHeader);

    // Get request body
    const body = await req.json();
    const { fileId, fileName, path } = body;

    if (!fileId || !fileName) {
      throw new Error('Missing required fields');
    }

    // Verify file exists in MEGA
    await megaClient.initialize({
      email: process.env.MEGA_EMAIL || '',
      password: process.env.MEGA_PASSWORD || '',
    });

    const folderPath = path.startsWith(user.employeeId)
      ? path
      : path
        ? `${user.employeeId}/${path}`
        : user.employeeId;

    const files = await megaClient.listFiles(folderPath);
    const uploadedFile = files.find(f => f.name === fileName);

    if (!uploadedFile) {
      throw new Error('File upload verification failed');
    }

    return NextResponse.json({
      success: true,
      file: uploadedFile,
    });
  } catch (error) {
    console.error('Error in finalize:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Finalize failed' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}
