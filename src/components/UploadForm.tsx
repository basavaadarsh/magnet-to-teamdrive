import React, { useState, useContext, useRef, useEffect } from 'react';
import { Upload, FileUp, FolderUp, Check, X, AlertCircle } from 'lucide-react';
import { TransferContext } from '../context/TransferContext';

interface TeamDrive {
  id: string;
  name: string;
  capabilities: {
    canUpload: boolean;
  };
}

const UploadForm: React.FC = () => {
  const [magnetLink, setMagnetLink] = useState('');
  const [teamDriveId, setTeamDriveId] = useState('');
  const [shouldZip, setShouldZip] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [torrentFile, setTorrentFile] = useState<File | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [teamDrives, setTeamDrives] = useState<TeamDrive[]>([]);
  const [isLoadingDrives, setIsLoadingDrives] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { addTransfer } = useContext(TransferContext);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();
      setIsAuthenticated(data.isAuthenticated);
      
      if (data.isAuthenticated) {
        fetchTeamDrives();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const fetchTeamDrives = async () => {
    setIsLoadingDrives(true);
    try {
      const response = await fetch('/api/auth/drives');
      const data = await response.json();
      setTeamDrives(data.drives);
    } catch (error) {
      console.error('Error fetching team drives:', error);
    } finally {
      setIsLoadingDrives(false);
    }
  };

  const handleAuthClick = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      setErrorMessage('Failed to initiate Google authentication');
    }
  };

  const handleTeamDriveChange = async (id: string) => {
    setTeamDriveId(id);
    setErrorMessage(null);
    
    try {
      const response = await fetch(`/api/auth/drives/${id}/validate`);
      const data = await response.json();
      
      if (!data.valid) {
        setErrorMessage('Invalid Team Drive ID');
      } else if (!data.canUpload) {
        setErrorMessage('You do not have permission to upload to this Team Drive');
      }
    } catch (error) {
      console.error('Error validating team drive:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    if ((!magnetLink && !torrentFile) || !teamDriveId) {
      setErrorMessage("Please provide a magnet link or torrent file and select a Team Drive");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      if (torrentFile) {
        formData.append('torrent', torrentFile);
      }
      formData.append('teamDriveId', teamDriveId);
      formData.append('shouldZip', String(shouldZip));
      if (magnetLink) {
        formData.append('magnetLink', magnetLink);
      }
      
      const response = await fetch('/api/torrent', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to start transfer');
      }
      
      const { id } = await response.json();
      
      addTransfer({
        id,
        name: torrentFile?.name || magnetLink.split('&dn=')[1]?.split('&')[0] || 'Unknown',
        magnetLink: magnetLink || '',
        teamDriveId,
        shouldZip,
        torrentFile: torrentFile?.name || null,
        status: 'downloading',
        downloadProgress: 0,
        uploadProgress: 0,
        size: '0 MB',
        createdAt: new Date(),
        logs: ['Transfer started...']
      });
      
      // Reset form
      setMagnetLink('');
      setTorrentFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error starting transfer:', error);
      setErrorMessage('Failed to start transfer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTorrentFile(file);
      setMagnetLink('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.torrent')) {
      setTorrentFile(file);
      setMagnetLink('');
    } else {
      setErrorMessage("Please upload a valid .torrent file");
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeTorrentFile = () => {
    setTorrentFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Create New Transfer</h2>
      
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-start gap-2">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1">
          <label className="block text-sm font-medium">
            Magnet Link or Torrent File
          </label>

          {!torrentFile ? (
            <>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={openFileDialog}
              >
                <FileUp size={36} className="mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p className="text-sm mb-1">
                  Drag & drop a .torrent file here, or <span className="text-blue-600 dark:text-blue-400">click to browse</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Only .torrent files are accepted
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".torrent"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnetIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Or paste magnet link here..."
                  value={magnetLink}
                  onChange={(e) => setMagnetLink(e.target.value)}
                  className="pl-10 block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FolderUp size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{torrentFile.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round(torrentFile.size / 1024)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={removeTorrentFile}
                className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium">
            Google Team Drive
          </label>
          
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={handleAuthClick}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-600 dark:border-blue-500 bg-blue-600 dark:bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              Connect to Google Drive
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Check size={18} className="text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  Connected to Google Drive
                </span>
              </div>
              
              {isLoadingDrives ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading Team Drives...</p>
                </div>
              ) : (
                <select
                  value={teamDriveId}
                  onChange={(e) => handleTeamDriveChange(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:border-blue-400 dark:focus:ring-blue-400"
                >
                  <option value="">Select a Team Drive</option>
                  {teamDrives.map((drive) => (
                    <option key={drive.id} value={drive.id}>
                      {drive.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          
          <div className="pt-3">
            <div className="relative flex items-start">
              <div className="flex h-6 items-center">
                <input
                  id="shouldZip"
                  type="checkbox"
                  checked={shouldZip}
                  onChange={(e) => setShouldZip(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="shouldZip" className="font-medium">
                  Zip before uploading
                </label>
                <p className="text-gray-500 dark:text-gray-400">
                  Compress multiple files into a single ZIP archive
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`inline-flex w-full justify-center items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
            isLoading 
              ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
              : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 focus:ring-blue-500'
          }`}
        >
          {isLoading ? (
            <>
              <Spinner className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload size={18} />
              Start Transfer
            </>
          )}
        </button>
      </form>
    </div>
  );
};

const MagnetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M6 15l6 6 6-6m-6-6V3M8 9h8" />
  </svg>
);

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width="18"
    height="18"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

export default UploadForm;