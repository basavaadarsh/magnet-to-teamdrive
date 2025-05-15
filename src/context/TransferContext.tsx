import React, { createContext, useState, useEffect } from 'react';

export interface Transfer {
  id: string;
  name: string;
  magnetLink: string;
  teamDriveId: string;
  shouldZip: boolean;
  torrentFile: string | null;
  status: 'queued' | 'downloading' | 'uploading' | 'completed' | 'error';
  downloadProgress: number;
  uploadProgress: number;
  size: string;
  createdAt: Date;
  logs: string[];
}

interface TransferContextType {
  transfers: Transfer[];
  addTransfer: (transfer: Transfer) => void;
  updateTransfer: (id: string, updates: Partial<Transfer>) => void;
  removeTransfer: (id: string) => void;
}

export const TransferContext = createContext<TransferContextType>({
  transfers: [],
  addTransfer: () => {},
  updateTransfer: () => {},
  removeTransfer: () => {},
});

export const TransferProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transfers, setTransfers] = useState<Transfer[]>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const savedTransfers = localStorage.getItem('transfers');
      if (savedTransfers) {
        try {
          const parsed = JSON.parse(savedTransfers);
          // Convert string dates back to Date objects
          return parsed.map((t: any) => ({
            ...t,
            createdAt: new Date(t.createdAt)
          }));
        } catch (error) {
          console.error('Failed to parse saved transfers', error);
        }
      }
    }
    return [];
  });

  useEffect(() => {
    // Save to localStorage when transfers change
    localStorage.setItem('transfers', JSON.stringify(transfers));
  }, [transfers]);

  // Simulate progress updates for demo purposes
  useEffect(() => {
    const progressing = transfers.filter(t => 
      t.status === 'downloading' || t.status === 'uploading'
    );
    
    if (progressing.length === 0) return;
    
    const interval = setInterval(() => {
      setTransfers(current => 
        current.map(transfer => {
          if (transfer.status === 'downloading') {
            const newProgress = transfer.downloadProgress + Math.random() * 5;
            
            if (newProgress >= 100) {
              return {
                ...transfer,
                downloadProgress: 100,
                status: 'uploading',
                logs: [...transfer.logs, 'Download completed. Starting upload...'],
                size: getRandomSize()
              };
            }
            
            return {
              ...transfer,
              downloadProgress: Math.min(newProgress, 99.9),
              logs: newProgress % 20 < 5 
                ? [...transfer.logs, `Downloading... ${Math.round(newProgress)}%`] 
                : transfer.logs
            };
          }
          
          if (transfer.status === 'uploading') {
            const newProgress = transfer.uploadProgress + Math.random() * 3;
            
            if (newProgress >= 100) {
              return {
                ...transfer,
                uploadProgress: 100,
                status: 'completed',
                logs: [...transfer.logs, 'Upload completed successfully.']
              };
            }
            
            return {
              ...transfer,
              uploadProgress: Math.min(newProgress, 99.9),
              logs: newProgress % 20 < 5 
                ? [...transfer.logs, `Uploading to Google Drive... ${Math.round(newProgress)}%`] 
                : transfer.logs
            };
          }
          
          return transfer;
        })
      );
    }, 1000);
    
    return () => clearInterval(interval);
  }, [transfers]);

  const addTransfer = (transfer: Transfer) => {
    setTransfers(current => [...current, transfer]);
  };

  const updateTransfer = (id: string, updates: Partial<Transfer>) => {
    setTransfers(current => 
      current.map(transfer => 
        transfer.id === id ? { ...transfer, ...updates } : transfer
      )
    );
  };

  const removeTransfer = (id: string) => {
    setTransfers(current => current.filter(transfer => transfer.id !== id));
  };

  return (
    <TransferContext.Provider value={{ transfers, addTransfer, updateTransfer, removeTransfer }}>
      {children}
    </TransferContext.Provider>
  );
};

// Helper to generate random file sizes for demo
const getRandomSize = () => {
  const sizes = ['256 MB', '1.2 GB', '4.7 GB', '8.5 GB', '12.3 GB'];
  return sizes[Math.floor(Math.random() * sizes.length)];
};