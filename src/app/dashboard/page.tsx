'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import axios from 'axios';
import { 
  FolderPlusIcon, 
  ArrowUpTrayIcon, 
  FolderIcon, 
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

interface File {
  public_id: string;
  format: string;
  resource_type: string;
  secure_url: string;
  created_at: string;
}

interface Folder {
  name: string;
  path: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  const handleTokenError = () => {
    localStorage.removeItem('token');
    router.push('/');
    toast.error('Session expired. Please login again.');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      handleTokenError();
      return;
    }
    fetchFiles();
  }, [currentPath]);

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleTokenError();
        return;
      }
      const response = await axios.get('http://localhost:5000/api/cloudinary/files', {
        params: { path: currentPath },
        headers: { Authorization: `Bearer ${token}` }
      });
      setFiles(response.data.files || []);
      setFolders(response.data.folders || []);
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleTokenError();
        return;
      }
      toast.error('Failed to fetch files: ' + (error.response?.data?.message || error.message));
      console.error('Error fetching files:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const formData = new FormData();
    formData.append('file', files[0]);
    if (currentPath) {
      formData.append('path', currentPath);
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleTokenError();
        return;
      }
      await axios.post('http://localhost:5000/api/cloudinary/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      toast.success('File uploaded successfully');
      fetchFiles();
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleTokenError();
        return;
      }
      toast.error('Failed to upload file: ' + (error.response?.data?.message || error.message));
      console.error('Error uploading file:', error);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleTokenError();
        return;
      }
      await axios.post('http://localhost:5000/api/cloudinary/folder', {
        name: newFolderName,
        path: currentPath
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewFolderName('');
      setIsCreatingFolder(false);
      toast.success('Folder created successfully');
      fetchFiles();
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleTokenError();
        return;
      }
      toast.error('Failed to create folder: ' + (error.response?.data?.message || error.message));
      console.error('Error creating folder:', error);
    }
  };

  const deleteFolder = async () => {
    if (!selectedFolder) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleTokenError();
        return;
      }
      await axios.delete('http://localhost:5000/api/cloudinary/folder', {
        params: { path: selectedFolder.path },
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsDeletingFolder(false);
      setSelectedFolder(null);
      toast.success('Folder deleted successfully');
      if (currentPath === selectedFolder.path) {
        navigateUp();
      } else {
        fetchFiles();
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleTokenError();
        return;
      }
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      toast.error('Failed to delete folder: ' + errorMessage);
      console.error('Error deleting folder:', error);
      setIsDeletingFolder(true);
    }
  };

  const deleteFile = async (publicId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleTokenError();
        return;
      }
      await axios.delete(`http://localhost:5000/api/cloudinary/files/${publicId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('File deleted successfully');
      fetchFiles();
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleTokenError();
        return;
      }
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      toast.error('Failed to delete file: ' + errorMessage);
      console.error('Error deleting file:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const navigateToFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const navigateUp = () => {
    const pathParts = currentPath.split('/');
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
  };

  const downloadFile = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-vercel-black">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-vercel-text">Cloud Storage</h1>
              <p className="text-sm text-vercel-text-secondary mt-1">
                Current path: {currentPath || 'Root'}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="inline-flex items-center px-4 py-2 border border-vercel-border rounded-md shadow-sm text-sm font-medium text-vercel-text bg-vercel-card hover:bg-vercel-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vercel-primary transition-colors"
              >
                <FolderPlusIcon className="h-5 w-5 mr-2" />
                New Folder
              </button>
              <label className="inline-flex items-center px-4 py-2 border border-vercel-border rounded-md shadow-sm text-sm font-medium text-vercel-button-text bg-vercel-button hover:bg-vercel-button-hover hover:text-vercel-button-text-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vercel-primary cursor-pointer transition-colors">
                <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                Upload File
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-vercel-border rounded-md shadow-sm text-sm font-medium text-vercel-text bg-vercel-error hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>

          {isCreatingFolder && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center">
              <div className="bg-vercel-card rounded-lg px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border border-vercel-border">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-vercel-text">Create New Folder</h3>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-vercel-border bg-vercel-dark text-vercel-text shadow-sm focus:border-vercel-primary focus:ring-vercel-primary sm:text-sm"
                        placeholder="Folder name"
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={createFolder}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-vercel-button text-base font-medium text-vercel-button-text hover:bg-vercel-button-hover hover:text-vercel-button-text-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vercel-primary sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingFolder(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-vercel-border shadow-sm px-4 py-2 bg-vercel-card text-base font-medium text-vercel-text hover:bg-vercel-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vercel-primary sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {isDeletingFolder && selectedFolder && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center">
              <div className="bg-vercel-card rounded-lg px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border border-vercel-border">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-vercel-text">Delete Folder</h3>
                    <div className="mt-2">
                      <p className="text-sm text-vercel-text-secondary">
                        Are you sure you want to delete the folder "{selectedFolder.name}"? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={deleteFolder}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-vercel-error text-base font-medium text-vercel-text hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeletingFolder(false);
                      setSelectedFolder(null);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-vercel-border shadow-sm px-4 py-2 bg-vercel-card text-base font-medium text-vercel-text hover:bg-vercel-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vercel-primary sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-vercel-card shadow rounded-lg border border-vercel-border">
            {currentPath && (
              <div className="px-4 py-3 border-b border-vercel-border">
                <button
                  onClick={navigateUp}
                  className="text-vercel-link hover:text-vercel-link-hover transition-colors"
                >
                  ← Back to Parent Folder
                </button>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
              {folders.map((folder) => (
                <div
                  key={folder.path}
                  className="flex items-center justify-between p-4 rounded-lg border border-vercel-border hover:bg-vercel-dark group transition-colors"
                >
                  <div
                    className="flex items-center space-x-3 cursor-pointer flex-grow"
                    onClick={() => navigateToFolder(folder.path)}
                  >
                    <FolderIcon className="h-6 w-6 text-vercel-primary" />
                    <span className="text-vercel-text">{folder.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFolder(folder);
                      setIsDeletingFolder(true);
                    }}
                    className="text-vercel-error hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
              
              {files.map((file) => (
                <div
                  key={file.public_id}
                  className="flex flex-col p-4 space-y-2 rounded-lg border border-vercel-border group hover:bg-vercel-dark transition-colors"
                >
                  <div className="relative">
                    {file.resource_type === 'image' ? (
                      <a href={file.secure_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={file.secure_url}
                          alt={file.public_id}
                          className="h-32 w-full object-cover rounded border border-vercel-border"
                        />
                      </a>
                    ) : (
                      <div className="h-32 w-full flex items-center justify-center bg-vercel-black rounded border border-vercel-border">
                        <span className="text-vercel-text-secondary text-lg font-medium">
                          {file.format ? file.format.toUpperCase() : file.resource_type?.toUpperCase() || 'FILE'}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => downloadFile(file.secure_url, file.public_id.split('/').pop() || 'download')}
                        className="p-1 rounded-full bg-vercel-card text-vercel-primary hover:text-white transition-colors"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteFile(file.public_id)}
                        className="p-1 rounded-full bg-vercel-card text-vercel-error hover:text-red-400 transition-colors"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-vercel-text-secondary truncate flex-grow">
                      {file.public_id.split('/').pop()}
                    </div>
                  </div>
                </div>
              ))}
              
              {folders.length === 0 && files.length === 0 && (
                <div className="col-span-full text-center py-8 text-vercel-text-secondary">
                  This folder is empty. Upload files or create a new folder to get started.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
