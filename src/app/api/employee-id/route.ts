import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { User } from '@/models/User';

export async function GET() {
  try {
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('cloudinary-app');
    const usersCollection = db.collection<User>('users');

    // Get all employee IDs
    const users = await usersCollection.find({}, { projection: { employeeId: 1 } }).toArray();
    const existingIds = users.map(user => user.employeeId);

    // Find the next available ID
    let nextId = 1;
    while (existingIds.includes(`3S${nextId.toString().padStart(3, '0')}`)) {
      nextId++;
    }

    // Check if we've exceeded the limit
    if (nextId > 12) {
      return NextResponse.json(
        { error: 'No more employee IDs available' },
        { status: 400 }
      );
    }

    const newEmployeeId = `3S${nextId.toString().padStart(3, '0')}`;
    return NextResponse.json({ employeeId: newEmployeeId });
  } catch (error) {
    console.error('Error getting next employee ID:', error);
    return NextResponse.json(
      { error: 'Failed to get next employee ID' },
      { status: 500 }
    );
  }
}
