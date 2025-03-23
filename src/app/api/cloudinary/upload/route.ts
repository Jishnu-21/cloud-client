import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import cloudinary from '@/lib/cloudinary';
import { JwtUser } from '@/types/auth';

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
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

export async function POST(req: Request) {
  try {
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const user = verifyToken(authHeader);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const path = formData.get('path') as string | null;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get file details
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // Determine resource type based on extension
    let resourceType: "raw" | "image" | "video" = "raw";
    const mimeType = file.type;

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
      resourceType = "image";
    } else if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension)) {
      resourceType = "video";
    }

    // Create a unique filename while preserving extension
    const timestamp = new Date().getTime();
    const baseFileName = fileName.substring(0, fileName.lastIndexOf('.'));
    const uniqueFileName = `${baseFileName}_${timestamp}`;

    // If path already includes the user's folder, use it directly
    // Otherwise, prepend the user's folder
    const uploadPath = path?.startsWith(user.cloudinaryFolder)
      ? path
      : path
        ? `${user.cloudinaryFolder}/${path}`
        : user.cloudinaryFolder;

    // Upload to Cloudinary with modified configuration
    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: uploadPath,
          resource_type: "raw",  // Force raw for document files
          use_filename: true,
          unique_filename: true,
          public_id: uniqueFileName,
          format: extension,
          type: 'upload',
          overwrite: true,
          raw_convert: 'asIs'  // Add this to prevent any automatic conversion
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            console.log('Cloudinary upload result:', result);
            resolve(result as CloudinaryUploadResult);
          }
        }
      );

      uploadStream.end(buffer);
    });

    return NextResponse.json({
      ...result,
      original_filename: fileName
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    );
  }
}
