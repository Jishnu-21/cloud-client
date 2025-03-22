import { cookies } from 'next/headers';

export async function getAuth() {
  try {
    const cookieStore = cookies();
    const employeeId = cookieStore.get('employeeId')?.value;

    if (!employeeId) {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      user: { employeeId }
    };
  } catch (error) {
    return { isAuthenticated: false };
  }
}
