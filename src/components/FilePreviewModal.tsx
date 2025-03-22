'use client';

import React from 'react';
import { Dialog, DialogContent } from '@mui/material';
import { CloudinaryResource } from '@/types/cloudinary';
import { DocumentIcon, VideoCameraIcon } from '@heroicons/react/24/outline';

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  file: CloudinaryResource | null;
}

export default function FilePreviewModal({ open, onClose, file }: FilePreviewModalProps) {
  if (!file) return null;

  const renderPreview = () => {
    const fileType = file.format?.toLowerCase();
    
    // Image preview
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)) {
      return (
        <div className="flex items-center justify-center h-full bg-black">
          <img
            src={file.secure_url}
            alt={file.public_id}
            className="max-w-full max-h-[calc(100vh-120px)] object-contain"
          />
        </div>
      );
    }
    
    // Video preview
    if (['mp4', 'webm', 'mov'].includes(fileType)) {
      return (
        <div className="flex items-center justify-center h-full bg-black">
          <video
            controls
            className="max-w-full max-h-[calc(100vh-120px)]"
          >
            <source src={file.secure_url} type={`video/${fileType}`} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
    
    // PDF preview
    if (fileType === 'pdf') {
      return (
        <div className="flex flex-col h-full bg-black">
          <iframe
            src={`${file.secure_url}#view=FitH`}
            className="w-full flex-1 bg-black"
            title="PDF Preview"
          />
        </div>
      );
    }

    // Default: Download link for other file types
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black text-gray-300">
        <DocumentIcon className="h-16 w-16 text-white mb-4" />
        <a
          href={file.secure_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-gray-700 text-white hover:bg-gray-900 transition-colors"
        >
          Download File
        </a>
      </div>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        style: {
          backgroundColor: '#000',
          color: '#fff',
          height: 'calc(100vh - 64px)'
        }
      }}
    >
      <div className="flex justify-between items-center p-2 border-b border-gray-800">
        <h2 className="text-sm text-gray-300 px-2">
          {file.public_id.split('/').pop()}
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      <DialogContent className="p-0 bg-black">
        {renderPreview()}
      </DialogContent>
    </Dialog>
  );
}
