import { NextResponse } from 'next/server';
import { employees } from '@/lib/db';
import jwt from 'jsonwebtoken';
import { JwtUser } from '@/types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: Request) {
  try {
    const { employeeId } = await req.json();

    const employee = employees.find(emp => emp.employeeId === employeeId);
    if (!employee) {
      return NextResponse.json(
        { message: 'Invalid employee ID' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { 
        employeeId: employee.employeeId,
        name: employee.name,
        department: employee.department,
        cloudinaryFolder: employee.cloudinaryFolder
      } as JwtUser,
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ employees });
}
