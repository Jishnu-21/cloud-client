import { JwtPayload } from 'jsonwebtoken';

export interface JwtUser extends JwtPayload {
  employeeId: string;
  name: string;
  department: string;
  cloudinaryFolder: string;
}
