export interface Employee {
  employeeId: string;
  name: string;
  department: string;
  cloudinaryFolder: string;
}

export const employees: Employee[] = [
  {
    employeeId: '3S001',
    name: 'Jishnu',
    department: 'Tech',
    cloudinaryFolder: '3S001'
  },
  {
    employeeId: '3S002',
    name: 'Ravi Sharma',
    department: 'Tech',
    cloudinaryFolder: '3S002'
  },
  {
    employeeId: '3S003',
    name: 'Mithilesh Choudhary',
    department: 'Sales',
    cloudinaryFolder: '3S003'
  },
  {
    employeeId: '3S004',
    name: 'Tavleen Kaur',
    department: 'Sales',
    cloudinaryFolder: '3S004'
  },
  {
    employeeId: '3S005',
    name: 'Vedant',
    department: 'Design',
    cloudinaryFolder: '3S005'
  },
  {
    employeeId: '3S006',
    name: 'Anas Quadri',
    department: 'Management',
    cloudinaryFolder: '3S006'
  },
];
