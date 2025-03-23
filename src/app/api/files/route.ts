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

// Helper function to initialize MEGA client
async function initializeMegaClient() {
  try {
    if (!megaClient.isInitialized) {
      console.log('Initializing MEGA client...');
      await megaClient.initialize({ email: MEGA_EMAIL!, password: MEGA_PASSWORD! });
      console.log('MEGA client initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize MEGA client:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    throw new Error('Failed to initialize MEGA storage');
  }
}

export async function GET(req: Request) {
  try {
    // Verify JWT token
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const user = verifyToken(authHeader);

    // Get path from query params
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');

    // Get base path for the user
    const basePath = user.isAdmin ? '' : user.employeeId;
    const fullPath = path || basePath;  // Don't combine if path is provided
    
    console.log(`Listing files for path: "${fullPath}"`);

    // Initialize MEGA client
    await initializeMegaClient();

    // List files
    const files = await megaClient.listFiles(fullPath);
    console.log(`Found ${files.length} files/folders in path "${fullPath}"`);

    return NextResponse.json({ files });
  } catch (error: any) {
    console.error('Error in GET /api/files:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // Verify JWT token
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const user = verifyToken(authHeader);

    // Get request body
    const body = await req.json();
    const { name, path } = body;

    if (!name || typeof name !== 'string') {
      throw new Error('Valid folder name is required');
    }

    if (path && typeof path !== 'string') {
      throw new Error('Path must be a string if provided');
    }

    // Get base path for the user
    const basePath = user.isAdmin ? '' : user.employeeId;
    const fullPath = path || basePath;  // Don't combine if path is provided

    console.log(`Creating folder "${name}" in path: "${fullPath}"`);

    // Initialize MEGA client
    await initializeMegaClient();

    // Create folder
    const folder = await megaClient.createFolder(name, fullPath);
    console.log('Folder created successfully:', folder);

    return NextResponse.json(folder);
  } catch (error: any) {
    console.error('Error in POST /api/files:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create folder' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    // Verify JWT token
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    const user = verifyToken(authHeader);

    // Get fileId from query params
    const { searchParams } = new URL(req.url);
    const nodeId = searchParams.get('fileId');
    const isFolder = searchParams.get('isFolder') === 'true';
    const path = searchParams.get('path');

    if (!nodeId && !path) {
      throw new Error('File ID or path is required');
    }

    // Initialize MEGA client
    await initializeMegaClient();

    console.log(`Deleting ${isFolder ? 'folder' : 'file'} ${path || nodeId}`);

    // Delete file or folder
    if (isFolder && path) {
      await megaClient.deleteFolder(path);
    } else if (nodeId) {
      await megaClient.deleteFile(nodeId);
    }
    
    console.log('Delete operation completed successfully');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/files:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete file/folder' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    );
  }
}