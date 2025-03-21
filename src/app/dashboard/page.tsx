'use client';

import { useState, useEffect, useRef } from 'react';
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

interface CloudinaryFile {
  public_id: string;
  secure_url: string;
  resource_type: string;
  format: string;
  created_at: string;
  original_filename?: string;
}

interface Folder {
  name: string;
  path: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [files, setFiles] = useState<CloudinaryFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const response = await axios.get('/api/cloudinary/files', {
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
      toast.error('Failed to fetch files');
      console.error('Error fetching files:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    const formData = new FormData();
    formData.append('file', file);
    if (currentPath) {
      formData.append('path', currentPath);
    }
  
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleTokenError();
        return;
      }
  
      // Show loading toast
      const loadingToast = toast.loading('Uploading file...');
  
      // Upload the file
      const response = await axios.post('/api/cloudinary/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      // Create a proper file object with the information we have
      const newFile = {
        public_id: response.data.publicId,
        secure_url: response.data.url,
        resource_type: response.data.resource_type || 'image',
        format: response.data.format || file.name.split('.').pop() || '',
        created_at: new Date().toISOString(),
        original_filename: response.data.original_filename || file.name
      };
  
      // Update files state with the new file
      setFiles(prevFiles => [...prevFiles, newFile]);
  
      // Update loading toast to success
      toast.update(loadingToast, {
        render: "File uploaded successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000
      });

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleTokenError();
        return;
      }
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      toast.error('Failed to upload file: ' + errorMessage);
      console.error('Error uploading file:', error);
      
      // Also reset the file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleDeleteFolder = async (folder: Folder) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleTokenError();
        return;
      }

      setIsDeletingFolder(true);
      setSelectedFolder(folder);

      await axios.delete('/api/cloudinary/folder', {
        params: { path: folder.path },
        headers: { Authorization: `Bearer ${token}` }
      });

      setSelectedFolder(null);
      setIsDeletingFolder(false);
      fetchFiles();
      toast.success('Folder deleted successfully');
    } catch (error: any) {
      setSelectedFolder(null);
      setIsDeletingFolder(false);
      if (error.response?.status === 401) {
        handleTokenError();
        return;
      }
      toast.error('Failed to delete folder');
      console.error('Error deleting folder:', error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleTokenError();
        return;
      }

      setIsCreatingFolder(true);
      await axios.post('/api/cloudinary/folder', {
        name: newFolderName,
        path: currentPath
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNewFolderName('');
      setIsCreatingFolder(false);
      fetchFiles();
      toast.success('Folder created successfully');
    } catch (error: any) {
      setIsCreatingFolder(false);
      if (error.response?.status === 401) {
        handleTokenError();
        return;
      }
      toast.error('Failed to create folder');
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
      await axios.delete('/api/cloudinary/folder', {
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

  const handleDeleteFile = async (publicId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleTokenError();
        return;
      }
  
      const response = await axios.delete(`/api/cloudinary/files/${encodeURIComponent(publicId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      setFiles(prevFiles => prevFiles.filter(file => file.public_id !== publicId));
      toast.success('File deleted successfully');
    } catch (error: any) {
      if (error.response?.status === 401) {
        handleTokenError();
        return;
      }
      toast.error('Failed to delete file');
      console.error('Error deleting file:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
    toast.success('Logged out successfully');
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

  const getFileName = (file: CloudinaryFile) => {
    if (!file || !file.public_id) {
      return 'Untitled';
    }
    return file.public_id.split('/').pop() || 'Untitled';
  };

  const handleFolderClick = (folder: Folder) => {
    setCurrentPath(folder.path);
  };

  const handleNavigateUp = () => {
    if (!currentPath) return;
    const pathParts = currentPath.split('/');
    pathParts.pop();
    setCurrentPath(pathParts.join('/'));
  };

  return (
    <div className="min-h-screen bg-vercel-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 animate-fade-in">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-vercel-text tracking-tight">Cloud Storage</h1>
            {currentPath && (
              <button
                onClick={handleNavigateUp}
                className="p-2 rounded-lg bg-vercel-card text-vercel-text hover:bg-vercel-card-hover transition-all duration-200 ease-in-out transform hover:scale-105"
              >
                Go Back
              </button>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-vercel-card text-vercel-text hover:bg-vercel-card-hover transition-all duration-200 ease-in-out transform hover:scale-105"
            >
              <FolderPlusIcon className="h-5 w-5" />
              <span>New Folder</span>
            </button>
            <label className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-vercel-primary text-vercel-button-text hover:bg-vercel-button-hover hover:text-vercel-button-text-hover transition-all duration-200 ease-in-out transform hover:scale-105 cursor-pointer">
              <ArrowUpTrayIcon className="h-5 w-5" />
              <span>Upload File</span>
              <input
                type="file"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
              />
            </label>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-vercel-error text-white hover:bg-red-600 transition-all duration-200 ease-in-out transform hover:scale-105"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {currentPath && (
          <div className="mb-6 p-4 rounded-lg bg-vercel-card animate-slide-in">
            <div className="flex items-center space-x-2 text-vercel-text">
              <button 
                onClick={() => setCurrentPath('')}
                className="hover:text-vercel-primary transition-colors"
              >
                Root
              </button>
              {currentPath.split('/').map((part, index, array) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-vercel-text-secondary">/</span>
                  <button
                    onClick={() => setCurrentPath(array.slice(0, index + 1).join('/'))}
                    className="hover:text-vercel-primary transition-colors"
                  >
                    {part}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Folders Grid */}
        {folders.length > 0 && (
          <div className="mb-8 animate-fade-in">
            <h2 className="text-xl font-semibold text-vercel-text mb-4">Folders</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {folders.map((folder) => (
                <div
                  key={folder.path}
                  className="relative group p-4 rounded-lg bg-vercel-card hover:bg-vercel-card-hover transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-lg card-hover"
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleFolderClick(folder)}
                      className="flex items-center space-x-2 text-vercel-text group-hover:text-vercel-primary transition-colors flex-grow truncate pr-2"
                    >
                      <FolderIcon className="h-6 w-6 flex-shrink-0" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder)}
                      disabled={isDeletingFolder && selectedFolder?.path === folder.path}
                      className="p-1.5 rounded-full bg-vercel-card text-vercel-error hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files Grid */}
        {files.length > 0 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-semibold text-vercel-text mb-4">Files</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files.map((file) => (
                <div
                  key={file.public_id}
                  className="relative group p-4 rounded-lg bg-vercel-card hover:bg-vercel-card-hover transition-all duration-200 ease-in-out transform hover:-translate-y-1 hover:shadow-lg card-hover"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-vercel-text truncate flex-grow pr-2" title={file.original_filename || file.public_id.split('/').pop()}>
                      {file.original_filename || file.public_id.split('/').pop()}
                    </span>
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={file.secure_url}
                        download={file.original_filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-full bg-vercel-card text-vercel-text hover:text-vercel-primary transition-colors"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                      </a>
                      <button
                        onClick={() => handleDeleteFile(file.public_id)}
                        className="p-1.5 rounded-full bg-vercel-card text-vercel-error hover:text-red-400 transition-colors"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  {file.resource_type === 'image' && (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-vercel-black group-hover:ring-2 ring-vercel-primary transition-all">
                      <img
                        src={file.secure_url}
                        alt={file.original_filename || 'Image'}
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {files.length === 0 && folders.length === 0 && (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-vercel-card mb-4">
              <FolderIcon className="h-8 w-8 text-vercel-text-secondary" />
            </div>
            <h3 className="text-xl font-semibold text-vercel-text mb-2">No files or folders</h3>
            <p className="text-vercel-text-secondary mb-6">Upload a file or create a new folder to get started</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setIsCreatingFolder(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-vercel-card text-vercel-text hover:bg-vercel-card-hover transition-all duration-200 ease-in-out transform hover:scale-105"
              >
                <FolderPlusIcon className="h-5 w-5" />
                <span>New Folder</span>
              </button>
              <label className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-vercel-primary text-vercel-button-text hover:bg-vercel-button-hover hover:text-vercel-button-text-hover transition-all duration-200 ease-in-out transform hover:scale-105 cursor-pointer">
                <ArrowUpTrayIcon className="h-5 w-5" />
                <span>Upload File</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Create Folder Modal */}
        {isCreatingFolder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-vercel-card rounded-lg p-6 w-full max-w-md animate-slide-in">
              <h3 className="text-lg font-semibold text-vercel-text mb-4">Create New Folder</h3>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full p-3 mb-4 rounded-lg bg-vercel-black text-vercel-text border border-vercel-border focus:outline-none focus:ring-2 focus:ring-vercel-primary transition-all"
                autoFocus
              />
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setNewFolderName('');
                    setIsCreatingFolder(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-vercel-black text-vercel-text hover:bg-vercel-card-hover transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 rounded-lg bg-vercel-primary text-vercel-button-text hover:bg-vercel-button-hover hover:text-vercel-button-text-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}