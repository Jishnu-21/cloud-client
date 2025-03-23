import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { megaClient, MegaFileInfo } from '@/lib/mega';
import { JwtUser } from '@/types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const MEGA_EMAIL = process.env.MEGA_EMAIL || '';
const MEGA_PASSWORD = process.env.MEGA_PASSWORD || '';

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

// Define allowed methods
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');

    // Verify JWT token
    const user = verifyToken(authHeader);

    // Initialize MEGA client if needed
    await megaClient.initialize({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD,
    });

    // Get path from query params
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path') || '';

    // List files
    const files = await megaClient.listFiles(path);
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error in GET /api/mega/files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');

    // Verify JWT token
    const user = verifyToken(authHeader);

    // Initialize MEGA client if needed
    await megaClient.initialize({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD,
    });

    // Get data from request body
    const { name, path } = await req.json();

    // Create folder
    await megaClient.createFolder(name, path);
    
    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/mega/files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');

    // Verify JWT token
    const user = verifyToken(authHeader);

    // Initialize MEGA client if needed
    await megaClient.initialize({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD,
    });

    // Get file ID from query params
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('id');
    
    if (!fileId) {
      throw new Error('File ID is required');
    }

    // Delete file
    await megaClient.deleteFile(fileId);
    
    // Return success
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/mega/files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error ? 400 : 500 }
    );
  }
}

// Export allowed methods
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
