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

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const user = verifyToken(authHeader);
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path') || '';

    // Initialize MEGA client if not already initialized
    await megaClient.initialize({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD,
    });

    // If path already includes the user's folder, use it directly
    // Otherwise, prepend the user's folder
    const folderPath = path.startsWith(user.employeeId)
      ? path
      : path
        ? `${user.employeeId}/${path}`
        : user.employeeId;

    const files: MegaFileInfo[] = await megaClient.listFiles(folderPath);

    // Separate files and folders
    const folders = files.filter(item => item.type === 'folder');
    const filesList = files.filter(item => item.type === 'file');

    return NextResponse.json({
      files: filesList,
      folders: folders,
    });
  } catch (error: any) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch files' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    );
  }
}

export async function DELETE(req: Request): Promise<NextResponse> {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const user = verifyToken(authHeader);

    const { fileId, isFolder } = await req.json();

    // Initialize MEGA client if not already initialized
    await megaClient.initialize({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD,
    });

    if (isFolder) {
      await megaClient.deleteFolder(fileId);
    } else {
      await megaClient.deleteFile(fileId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    );
  }
}
