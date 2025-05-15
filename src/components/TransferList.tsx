import React, { useContext } from 'react';
import { FileDown, Upload, Check, AlertCircle, XCircle, Clock, MoreVertical } from 'lucide-react';
import { TransferContext } from '../context/TransferContext';
import { formatDistance } from '../utils/date';

const TransferList: React.FC = () => {
  const { transfers, removeTransfer } = useContext(TransferContext);

  if (transfers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <FileDown size={28} className="text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No transfers yet</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Start a new transfer by adding a magnet link or torrent file.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Active Transfers</h2>
      
      <div className="space-y-4">
        {transfers.map((transfer) => (
          <div 
            key={transfer.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <StatusIcon status={transfer.status} />
                  
                  <div>
                    <h3 className="font-medium">{transfer.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {transfer.size} • Added {formatDistance(transfer.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-2">
                    {getStatusLabel(transfer.status)}
                  </span>
                  <div className="relative">
                    <button className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              </div>
              
              {(transfer.status === 'downloading' || transfer.status === 'uploading') && (
                <div className="mt-3">
                  {transfer.status === 'downloading' && (
                    <ProgressBar 
                      progress={transfer.downloadProgress} 
                      label={`Downloading: ${transfer.downloadProgress}%`}
                      variant="blue"
                    />
                  )}
                  
                  {transfer.status === 'uploading' && (
                    <ProgressBar 
                      progress={transfer.uploadProgress} 
                      label={`Uploading to Drive: ${transfer.uploadProgress}%`}
                      variant="green"
                    />
                  )}
                </div>
              )}
              
              <div className="mt-3 flex justify-between items-center">
                <div>
                  <button
                    onClick={() => {
                      // Toggle logs expand would go here
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Show logs
                  </button>
                </div>
                
                {transfer.status === 'completed' && (
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View in Drive
                  </a>
                )}
                
                {transfer.status === 'error' && (
                  <button
                    onClick={() => removeTransfer(transfer.id)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'downloading':
      return (
        <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <FileDown size={18} className="text-blue-600 dark:text-blue-400" />
        </div>
      );
    case 'uploading':
      return (
        <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <Upload size={18} className="text-green-600 dark:text-green-400" />
        </div>
      );
    case 'completed':
      return (
        <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <Check size={18} className="text-green-600 dark:text-green-400" />
        </div>
      );
    case 'error':
      return (
        <div className="w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <XCircle size={18} className="text-red-600 dark:text-red-400" />
        </div>
      );
    case 'queued':
      return (
        <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <Clock size={18} className="text-gray-600 dark:text-gray-400" />
        </div>
      );
    default:
      return (
        <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <AlertCircle size={18} className="text-gray-600 dark:text-gray-400" />
        </div>
      );
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'downloading':
      return 'Downloading';
    case 'uploading':
      return 'Uploading';
    case 'completed':
      return 'Completed';
    case 'error':
      return 'Failed';
    case 'queued':
      return 'Queued';
    default:
      return 'Unknown';
  }
};

interface ProgressBarProps {
  progress: number;
  label: string;
  variant: 'blue' | 'green';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, label, variant }) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      fill: 'bg-blue-600 dark:bg-blue-500',
      text: 'text-blue-700 dark:text-blue-400'
    },
    green: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      fill: 'bg-green-600 dark:bg-green-500',
      text: 'text-green-700 dark:text-green-400'
    }
  };
  
  const colors = colorClasses[variant];

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className={colors.text}>{label}</span>
        <span className={colors.text}>{progress}%</span>
      </div>
      <div className={`h-2 rounded-full ${colors.bg} overflow-hidden`}>
        <div 
          className={`h-full ${colors.fill} rounded-full transition-all duration-300 ease-out`} 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default TransferList;