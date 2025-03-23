'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@mui/material';

interface MegaFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: 'file' | 'folder';
  created_at: string;
  secure_url: string;
}

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  file: MegaFile | null;
}

export default function FilePreviewModal({ open, onClose, file }: FilePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset loading state when file changes
    if (file) {
      setIsLoading(true);
      setError(null);

      // If it's a MEGA link, we know we can't embed it directly
      if (file.secure_url && file.secure_url.includes('mega.nz')) {
        setIsLoading(false);
      }
    }
  }, [file?.id]);

  if (!open || !file) return null;

  const getFileType = (fileName: string): string => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  const fileType = getFileType(file.name);
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
  const isVideo = ['mp4', 'webm', 'mov'].includes(fileType);
  const isPDF = fileType === 'pdf';
  const isMegaLink = file.secure_url && file.secure_url.includes('mega.nz');

  // Function to open MEGA in a new tab/window
  const openInNewTab = () => {
    window.open(file.secure_url, '_blank', 'noopener,noreferrer');
  };

  // Function to redirect the current window to MEGA
  const openInSameWindow = () => {
    window.location.href = file.secure_url;
  };

  const renderPreview = () => {
    // Special handling for MEGA links - show a prompt to open it
    if (isMegaLink) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 p-8 text-center">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center max-w-md">
            <svg className="w-16 h-16 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">MEGA Content</h3>
            <p className="text-gray-400 mb-6">
              This file is hosted on MEGA.nz and needs to be opened directly on their website.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button 
                onClick={openInNewTab}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-center"
              >
                Open in New Tab
              </button>
              <button 
                onClick={openInSameWindow}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-center"
              >
                Open in This Window
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show loading state for non-MEGA files
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    // For all other file types
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 p-8 text-center">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center max-w-md">
          {error ? (
            <>
              <svg className="w-16 h-16 text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-xl font-medium text-white mb-2">Preview Not Available</h3>
              <p className="text-gray-400 mb-4">
                {error}
              </p>
            </>
          ) : (
            <>
              <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-medium text-white mb-2">Preview Not Available</h3>
              <p className="text-gray-400 mb-4">
                This file cannot be previewed directly.
              </p>
            </>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <a 
              href={file.secure_url} 
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-center"
              download={file.name}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        style: { backgroundColor: '#1f2937', color: 'white', maxHeight: '90vh' }
      }}
    >
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white truncate flex-1 mr-4">
          {file.name}
        </h2>
        <div className="flex items-center gap-2">
          {isMegaLink ? (
            <button
              onClick={openInNewTab}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
            >
              Open in MEGA
            </button>
          ) : (
            <a
              href={file.secure_url}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
              download={file.name}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <DialogContent className="p-0 flex items-center justify-center" style={{ height: 'calc(90vh - 80px)' }}>
        {renderPreview()}
      </DialogContent>
    </Dialog>
  );
}