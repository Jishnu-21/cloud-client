import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { megaClient } from '@/lib/mega';
import { JwtUser } from '@/types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const MEGA_EMAIL = process.env.MEGA_EMAIL;
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;

if (!MEGA_EMAIL || !MEGA_PASSWORD) {
  throw new Error('MEGA credentials not configured');
}

// Middleware to verify JWT token
function verifyToken(authHeader: string | null): JwtUser {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JwtUser;
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function POST(req: Request) {
  try {
    // Verify JWT token
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const user = verifyToken(authHeader);

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file');
    const path = formData.get('path');

    if (!file || !(file instanceof File)) {
      throw new Error('No valid file provided');
    }

    // Get base path for the user
    const basePath = user.isAdmin ? '' : user.employeeId;
    const fullPath = path?.toString() || basePath;

    // Initialize MEGA client if needed
    try {
      await megaClient.initialize({ email: MEGA_EMAIL!, password: MEGA_PASSWORD! });
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('already initialized')) {
        throw error;
      }
    }

    // Upload file
    const uploadedFile = await megaClient.uploadFile(file, fullPath);

    return NextResponse.json(uploadedFile);
  } catch (error: any) {
    console.error('Error in POST /api/files/upload:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    );
  }
}
