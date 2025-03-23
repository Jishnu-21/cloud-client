'use client';

import { Dialog } from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        style: { 
          backgroundColor: '#000',
          color: 'white', 
          maxWidth: '400px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
        }
      }}
      sx={{
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }
      }}
    >
      <div className="p-6 bg-black">
        <h2 className="text-xl font-semibold mb-3 text-white">{title}</h2>
        <p className="text-gray-400 mb-6">{message}</p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white rounded-md transition-colors border border-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </Dialog>
  );
}
