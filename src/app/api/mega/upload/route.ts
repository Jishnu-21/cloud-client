import { NextResponse } from 'next/server';
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

export async function POST(req: Request) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const user = verifyToken(authHeader);

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // If path already includes the user's folder, use it directly
    // Otherwise, prepend the user's folder
    const folderPath = path.startsWith(user.employeeId)
      ? path
      : path
        ? `${user.employeeId}/${path}`
        : user.employeeId;

    // Initialize MEGA client
    await megaClient.initialize({
      email: process.env.MEGA_EMAIL || '',
      password: process.env.MEGA_PASSWORD || '',
    });

    // Upload file
    const result = await megaClient.uploadFile(file, folderPath);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    );
  }
}
