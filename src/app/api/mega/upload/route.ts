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

// Instead, use the new route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Get form data with streaming support
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string || '';

    if (!file) {
      throw new Error('No file provided');
    }

    // If path already includes the user's folder, use it directly
    const folderPath = path.startsWith(user.employeeId)
      ? path
      : path
        ? `${user.employeeId}/${path}`
        : user.employeeId;

    // Upload file to MEGA
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create a new File object from the buffer
    const uploadFile = new File([buffer], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });

    const result = await megaClient.uploadFile(uploadFile, folderPath);

    return NextResponse.json({ success: true, file: result });
  } catch (error) {
    console.error('Error in upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}
