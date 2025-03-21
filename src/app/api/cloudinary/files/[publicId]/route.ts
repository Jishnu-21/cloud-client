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

export async function DELETE(
  req: Request,
  { params }: { params: { publicId: string } }
) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const user = verifyToken(authHeader);
    const publicId = decodeURIComponent(params.publicId);

    // Check if file belongs to user
    if (!publicId.startsWith(user.cloudinaryFolder)) {
      return NextResponse.json(
        { message: 'Access denied: File does not belong to your storage' },
        { status: 403 }
      );
    }

    // Delete the file from Cloudinary
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
