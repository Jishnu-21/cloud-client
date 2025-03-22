'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export default function Home() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get next available employee ID when switching to register mode
  useEffect(() => {
    if (isRegistering) {
      fetchNextEmployeeId();
    }
  }, [isRegistering]);

  const fetchNextEmployeeId = async () => {
    try {
      const response = await fetch('/api/employee-id');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get employee ID');
      }

      setEmployeeId(data.employeeId);
    } catch (error: any) {
      toast.error(error.message);
      setIsRegistering(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const endpoint = isRegistering ? '/api/auth' : '/api/auth';
      const method = isRegistering ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          isRegistering 
            ? { employeeId, password, name, department }
            : { employeeId, password }
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Save token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast.success(isRegistering ? 'Registration successful!' : 'Login successful!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = "appearance-none relative block w-full px-3 py-2 border border-vercel-border bg-vercel-card text-vercel-text placeholder-vercel-text-secondary focus:outline-none focus:ring-1 focus:ring-vercel-primary focus:border-vercel-primary transition-colors sm:text-sm";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-vercel-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-vercel-text">
            Employee Cloud Storage
          </h2>
          <p className="mt-2 text-center text-sm text-vercel-text-secondary">
            {isRegistering ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="employee-id" className="block text-sm font-medium text-vercel-text-secondary mb-1">
                Employee ID
              </label>
              <input
                id="employee-id"
                name="employeeId"
                type="text"
                required
                className={`${inputClasses} rounded-md`}
                placeholder="Enter your employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                readOnly={isRegistering}
              />
              {isRegistering && (
                <p className="mt-1 text-xs text-vercel-text-secondary">
                  Your employee ID has been automatically assigned
                </p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-vercel-text-secondary mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`${inputClasses} rounded-md`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>
            {isRegistering && (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-vercel-text-secondary mb-1">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className={`${inputClasses} rounded-md`}
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-vercel-text-secondary mb-1">
                    Department
                  </label>
                  <input
                    id="department"
                    name="department"
                    type="text"
                    required
                    className={`${inputClasses} rounded-md`}
                    placeholder="Enter your department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-white text-sm font-medium rounded-md text-black bg-white hover:bg-black hover:text-white hover:border-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white disabled:opacity-50 transition-all"
            >
              {isLoading ? (
                'Loading...'
              ) : (
                isRegistering ? 'Register' : 'Sign in'
              )}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setEmployeeId('');
              setPassword('');
              setName('');
              setDepartment('');
            }}
            className="text-gray-400 hover:text-white transition-colors font-medium"
          >
            {isRegistering
              ? 'Already have an account? Sign in'
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
