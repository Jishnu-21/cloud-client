'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import axios from 'axios';

interface Employee {
  employeeId: string;
  name: string;
  department: string;
}

export default function Home() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/auth');
      setEmployees(response.data.employees);
    } catch (error: any) {
      toast.error('Failed to fetch employees');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/auth', {
        employeeId: selectedId
      });
      localStorage.setItem('token', response.data.token);
      router.push('/dashboard');
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-vercel-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-vercel-text">
            Employee Cloud Storage
          </h2>
          <p className="mt-2 text-center text-sm text-vercel-text-secondary">
            Select your employee ID to access your cloud storage
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm">
            <select
              id="employee-id"
              name="employeeId"
              required
              className="appearance-none relative block w-full px-3 py-2 border border-vercel-border bg-vercel-card text-vercel-text rounded-md focus:outline-none focus:ring-2 focus:ring-vercel-primary focus:border-vercel-primary sm:text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="" className="bg-vercel-card">Select Employee ID</option>
              {employees.map((emp) => (
                <option 
                  key={emp.employeeId} 
                  value={emp.employeeId}
                  className="bg-vercel-card"
                >
                  {emp.employeeId} - {emp.name} ({emp.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={!selectedId}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-vercel-button-text bg-vercel-button hover:bg-vercel-button-hover hover:text-vercel-button-text-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vercel-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
