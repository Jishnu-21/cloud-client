import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import cloudinary from '@/lib/cloudinary';
import { JwtUser } from '@/types/auth';

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
  created_at: string;
}

interface CloudinaryFolder {
  name: string;
  path: string;
}

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

export async function GET(req: Request) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const user = verifyToken(authHeader);
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path') || '';

    // If path already includes the user's folder, use it directly
    // Otherwise, prepend the user's folder
    const folderPath = path.startsWith(user.cloudinaryFolder)
      ? path
      : path
        ? `${user.cloudinaryFolder}/${path}`
        : user.cloudinaryFolder;

    // Get files and folders from Cloudinary
    const { resources } = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 500
    });

    // Get subfolders
    const { folders } = await cloudinary.api.sub_folders(folderPath);

    return NextResponse.json({
      files: (resources as CloudinaryResource[]).map(resource => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url,
        resource_type: resource.resource_type,
        format: resource.format,
        created_at: resource.created_at
      })),
      folders: (folders as CloudinaryFolder[]).map(folder => ({
        name: folder.name,
        path: folder.path
      }))
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { message: 'Failed to fetch files' },
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
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return NextResponse.json(
        { message: 'File public_id is required' },
        { status: 400 }
      );
    }

    // Check if file belongs to user
    if (!publicId.startsWith(user.cloudinaryFolder)) {
      return NextResponse.json(
        { message: 'Access denied: File does not belong to your storage' },
        { status: 403 }
      );
    }

    // Delete the file
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true
    });

    if (result.result !== 'ok') {
      return NextResponse.json(
        { message: 'Failed to delete file from Cloudinary' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { message: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
