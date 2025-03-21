import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import cloudinary from '@/lib/cloudinary';
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

    const { name, path } = await req.json();

    // If path already includes the user's folder, use it directly
    // Otherwise, prepend the user's folder
    const folderPath = path
      ? path.startsWith(user.cloudinaryFolder)
        ? `${path}/${name}`
        : `${user.cloudinaryFolder}/${path}/${name}`
      : `${user.cloudinaryFolder}/${name}`;

    // Create folder in Cloudinary
    const result = await cloudinary.api.create_folder(folderPath);

    if (!result || !result.path) {
      return NextResponse.json(
        { message: 'Failed to create folder' },
        { status: 500 }
      );
    }

    return NextResponse.json({ path: result.path });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { message: 'Failed to create folder' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const user = verifyToken(authHeader);
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { message: 'Path is required' },
        { status: 400 }
      );
    }

    // Only allow deleting folders within user's cloudinary folder
    if (!path.startsWith(user.cloudinaryFolder)) {
      return NextResponse.json(
        { message: 'Access denied: Folder does not belong to your storage' },
        { status: 403 }
      );
    }

    // Delete folder from Cloudinary
    const result = await cloudinary.api.delete_folder(path);

    if (!result || result.deleted[0] !== path) {
      return NextResponse.json(
        { message: 'Failed to delete folder' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { message: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
