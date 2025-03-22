import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export interface User {
  _id?: ObjectId;
  employeeId: string;
  password: string;
  name: string;
  department: string;
  cloudinaryFolder: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
