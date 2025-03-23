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
  ArrowRightOnRectangleIcon,
  EyeIcon,
  DocumentIcon,
  VideoCameraIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import ConfirmDialog from '@/components/ConfirmDialog';

interface MegaFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: 'file' | 'folder';
  created_at: string;
  secure_url: string;
}

interface User {
  employeeId: string;
  name: string;
  department: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [files, setFiles] = useState<MegaFile[]>([]);
  const [folders, setFolders] = useState<MegaFile[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<MegaFile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    file: MegaFile | null;
  }>({ open: false, file: null });

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
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userStr));
    fetchFiles();
  }, [currentPath, router]);

  const fetchFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleTokenError();
        return;
      }
      const response = await axios.get('/api/files', {
        params: { path: currentPath },
        headers: { Authorization: `Bearer ${token}` }
      });

      // Split files and folders
      const allItems = response.data.files || [];
      setFiles(allItems.filter((item: MegaFile) => item.type === 'file'));
      setFolders(allItems.filter((item: MegaFile) => item.type === 'folder'));
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
      const response = await axios.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });

      // Update files state with the new file
      setFiles(prevFiles => [...prevFiles, response.data]);
  
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
  
  const handleDeleteFolder = async (folder: MegaFile) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleTokenError();
        return;
      }

      setIsDeletingFolder(true);
      setSelectedFolder(folder);

      await axios.delete('/api/files', {
        params: { fileId: folder.id },
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
      await axios.post('/api/files', {
        name: newFolderName,
        path: currentPath,
        type: 'folder'
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

  const handleDeleteFile = async (file: MegaFile) => {
    setConfirmDelete({ open: true, file });
  };

  const confirmDeleteFile = async () => {
    if (!confirmDelete.file) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        handleTokenError();
        return;
      }

      const response = await axios.delete('/api/files', {
        params: { fileId: confirmDelete.file.id },
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.data.success) {
        throw new Error('Failed to delete file');
      }

      // Remove the deleted file from the state
      setFiles(files.filter(file => file.id !== confirmDelete.file?.id));
      toast.success('File deleted successfully');
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error(error.message || 'Failed to delete file. Please try again.');
      
      // Refresh the file list to ensure we're in sync
      fetchFiles();
    } finally {
      setConfirmDelete({ open: false, file: null });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
    toast.success('Logged out successfully');
  };

  const handleFolderClick = (folder: MegaFile) => {
    setCurrentPath(folder.path);
  };

  const handleNavigateUp = () => {
    if (!currentPath) return;
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

  const getFileName = (file: MegaFile) => {
    if (!file || !file.name) {
      return 'Untitled';
    }
    return file.name;
  };

  const getFileType = (fileName: string): string => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  const getFileIcon = (file: MegaFile) => {
    const fileType = getFileType(file.name);

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)) {
      return (
        <div className="aspect-[4/3] w-full overflow-hidden bg-gray-900 relative">
          <img
            src={file.secure_url}
            alt={file.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // If image fails to load, show document icon
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const div = document.createElement('div');
                div.className = 'absolute inset-0 flex flex-col items-center justify-center';
                div.innerHTML = `
                  <svg class="h-12 w-12 text-white mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span class="text-xs text-gray-400 uppercase tracking-wider">${fileType}</span>
                `;
                parent.appendChild(div);
              }
            }}
          />
        </div>
      );
    }

    if (['mp4', 'webm', 'mov'].includes(fileType)) {
      return (
        <div className="aspect-[4/3] w-full overflow-hidden bg-gray-900 flex flex-col items-center justify-center">
          <VideoCameraIcon className="h-12 w-12 text-white mb-2" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">{fileType}</span>
        </div>
      );
    }

    if (fileType === 'pdf') {
      return (
        <div className="aspect-[4/3] w-full overflow-hidden bg-gray-900 flex flex-col items-center justify-center">
          <DocumentIcon className="h-12 w-12 text-white mb-2" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">PDF</span>
        </div>
      );
    }

    return (
      <div className="aspect-[4/3] w-full overflow-hidden bg-gray-900 flex flex-col items-center justify-center">
        <DocumentIcon className="h-12 w-12 text-white mb-2" />
        <span className="text-xs text-gray-400 uppercase tracking-wider">{fileType || 'File'}</span>
      </div>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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
            <button
              onClick={() => setUser(null)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white text-black hover:bg-black hover:text-white border border-white transition-all z-10"
            >
              {user?.name?.charAt(0).toUpperCase()}
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
                  key={folder.id}
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
                      disabled={isDeletingFolder && selectedFolder?.id === folder.id}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="relative group bg-black hover:bg-gray-900 transition-all duration-200"
                >
                  {/* File Preview with Direct Link */}
                  <a 
                    href={file.secure_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block cursor-pointer relative"
                    title={`${file.name} (${formatFileSize(file.size)})`}
                  >
                    {getFileIcon(file)}
                    
                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex flex-col items-center text-white">
                        <ArrowDownTrayIcon className="h-8 w-8 mb-2" />
                        <span className="text-sm">{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                  </a>

                  {/* File Info & Actions */}
                  <div className="p-3 bg-black">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-300 truncate flex-1" title={file.name}>
                        {file.name}
                      </span>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 z-10">
                        <a
                          href={file.secure_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-gray-800"
                          title="Download"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteFile(file)}
                          className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-gray-800"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
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
        
        {/* Confirmation Dialog */}
        <ConfirmDialog
          open={confirmDelete.open}
          title="Delete File"
          message={`Are you sure you want to delete "${confirmDelete.file?.name}"? This action cannot be undone.`}
          onConfirm={confirmDeleteFile}
          onCancel={() => setConfirmDelete({ open: false, file: null })}
        />
      </div>
    </div>
  );
}