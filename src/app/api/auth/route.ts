import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import clientPromise from '@/lib/mongodb';
import { User, hashPassword, verifyPassword } from '@/models/User';
import { ObjectId } from 'mongodb';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to generate JWT token
const generateToken = (user: User) => {
  return jwt.sign(
    {
      sub: user._id?.toString(),
      employeeId: user.employeeId,
      name: user.name,
      department: user.department,
      cloudinaryFolder: user.employeeId
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export async function POST(request: Request) {
  try {
    const { employeeId, password } = await request.json();

    if (!employeeId || !password) {
      return NextResponse.json(
        { error: 'Employee ID and password are required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('cloudinary-app');
    const usersCollection = db.collection<User>('users');

    // Find user by employee ID
    const user = await usersCollection.findOne({ employeeId });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid employee ID or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid employee ID or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken(user);

    return NextResponse.json({
      token,
      user: {
        employeeId: user.employeeId,
        name: user.name,
        department: user.department,
        cloudinaryFolder: user.employeeId
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Register new user
export async function PUT(request: Request) {
  try {
    const { employeeId, password, name, department } = await request.json();

    if (!employeeId || !password || !name || !department) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('cloudinary-app');
    const usersCollection = db.collection<User>('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ employeeId });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Employee ID already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser: User = {
      employeeId,
      password: hashedPassword,
      name,
      department,
      cloudinaryFolder: employeeId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert user into database
    const result = await usersCollection.insertOne(newUser);
    
    if (!result.acknowledged) {
      throw new Error('Failed to create user');
    }

    // Generate JWT token
    const token = generateToken({ ...newUser, _id: result.insertedId });

    return NextResponse.json({
      token,
      user: {
        employeeId: newUser.employeeId,
        name: newUser.name,
        department: newUser.department,
        cloudinaryFolder: newUser.employeeId
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
