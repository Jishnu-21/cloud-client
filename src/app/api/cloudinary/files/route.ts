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
  bytes: number;
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
    const folderPath = path.startsWith(user.employeeId)
      ? path
      : path
        ? `${user.employeeId}/${path}`
        : user.employeeId;

    // Get all resource types (images, videos, and raw files)
    const [imageResources, videoResources, rawResources] = await Promise.all([
      cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath,
        max_results: 500,
        resource_type: 'image',
      }).catch(() => ({ resources: [] })),
      
      cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath,
        max_results: 500,
        resource_type: 'video',
      }).catch(() => ({ resources: [] })),
      
      cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath,
        max_results: 500,
        resource_type: 'raw',
      }).catch(() => ({ resources: [] })),
    ]);

    // Combine all resources
    const allResources = [
      ...imageResources.resources,
      ...videoResources.resources,
      ...rawResources.resources,
    ].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Get subfolders
    const { folders } = await cloudinary.api.sub_folders(folderPath);

    return NextResponse.json({
      files: allResources.map(resource => ({
        id: resource.public_id,
        name: resource.public_id.split('/').pop() || '',
        path: resource.public_id,
        size: resource.bytes,
        type: 'file',
        created_at: resource.created_at,
        secure_url: resource.secure_url,
      })),
      folders: folders.map((folder: CloudinaryFolder) => ({
        id: folder.path,
        name: folder.name,
        path: folder.path,
        size: 0,
        type: 'folder',
        created_at: new Date().toISOString(),
        secure_url: '',
      })),
    });
  } catch (error: any) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch files' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const user = verifyToken(authHeader);

    const { publicId, isVideo } = await req.json();

    // Ensure the user can only delete files in their folder
    if (!publicId.startsWith(user.employeeId)) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this file' },
        { status: 403 }
      );
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: isVideo ? 'video' : 'image',
    });

    if (result.result === 'ok') {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    );
  }
}
