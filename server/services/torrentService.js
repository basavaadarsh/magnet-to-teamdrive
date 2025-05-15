import WebTorrent from 'webtorrent';
import { join, basename } from 'path';
import { mkdir, rm } from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createZipArchive } from '../utils/archive.js';
import { uploadToTeamDrive } from './googleDriveService.js';

// Setup paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const downloadDir = resolve(__dirname, '../downloads');
const tempDir = resolve(__dirname, '../temp');

// Create WebTorrent client
let client;
let io;
const activeTorrents = new Map();

// Initialize WebTorrent client
export function setupWebTorrentClient(socketIo) {
  io = socketIo;
  client = new WebTorrent();
  
  // Ensure download and temp directories exist
  Promise.all([
    mkdir(downloadDir, { recursive: true }),
    mkdir(tempDir, { recursive: true })
  ]).catch(console.error);
  
  // Event listeners for the client
  client.on('error', err => {
    console.error('WebTorrent client error:', err.message);
  });
}

/**
 * Add a new torrent from magnet link or torrent file
 * @param {string} source - Magnet link or path to torrent file
 * @param {string} teamDriveId - Google Team Drive ID
 * @param {boolean} shouldZip - Whether to zip the downloaded content
 * @returns {Promise<string>} - The torrent ID
 */
export function addTorrent(source, teamDriveId, shouldZip) {
  return new Promise((resolve, reject) => {
    try {
      // Create unique folder for this download
      const torrentId = `torrent-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const downloadPath = join(downloadDir, torrentId);
      
      mkdir(downloadPath, { recursive: true })
        .then(() => {
          // Add the torrent to the client
          client.add(source, { path: downloadPath }, torrent => {
            console.log(`Torrent added: ${torrent.name}`);
            
            // Store torrent info
            activeTorrents.set(torrentId, {
              torrent,
              teamDriveId,
              shouldZip,
              downloadPath,
              status: 'downloading',
              downloadProgress: 0,
              uploadProgress: 0,
              logs: [`Started downloading: ${torrent.name}`]
            });
            
            // Set up progress tracking
            const updateInterval = setInterval(() => {
              const torrentInfo = activeTorrents.get(torrentId);
              if (!torrentInfo) {
                clearInterval(updateInterval);
                return;
              }
              
              const downloadProgress = Math.round(torrent.progress * 100);
              
              // Update status
              torrentInfo.downloadProgress = downloadProgress;
              torrentInfo.logs.push(`Download progress: ${downloadProgress}%`);
              
              // Emit progress update via Socket.IO
              io.emit('torrent:progress', {
                id: torrentId,
                name: torrent.name,
                downloadProgress,
                uploadProgress: torrentInfo.uploadProgress,
                status: torrentInfo.status,
                logs: torrentInfo.logs
              });
              
              // If download is complete, start uploading to Google Drive
              if (downloadProgress === 100 && torrentInfo.status === 'downloading') {
                torrentInfo.status = 'processing';
                torrentInfo.logs.push('Download complete. Processing files...');
                
                // Upload to Google Drive
                handleCompletedDownload(torrentId, torrent, teamDriveId, shouldZip)
                  .catch(err => {
                    console.error(`Upload error for ${torrentId}:`, err);
                    torrentInfo.status = 'error';
                    torrentInfo.logs.push(`Error: ${err.message}`);
                    
                    io.emit('torrent:progress', {
                      id: torrentId,
                      name: torrent.name,
                      downloadProgress: 100,
                      uploadProgress: 0,
                      status: 'error',
                      logs: torrentInfo.logs
                    });
                  });
              }
            }, 1000);
            
            // Handle torrent completion
            torrent.on('done', () => {
              console.log(`Torrent completed: ${torrent.name}`);
              
              const torrentInfo = activeTorrents.get(torrentId);
              if (torrentInfo) {
                torrentInfo.downloadProgress = 100;
                torrentInfo.logs.push('Download complete');
              }
            });
            
            // Handle torrent errors
            torrent.on('error', err => {
              console.error(`Torrent error for ${torrent.name}:`, err.message);
              
              const torrentInfo = activeTorrents.get(torrentId);
              if (torrentInfo) {
                torrentInfo.status = 'error';
                torrentInfo.logs.push(`Error: ${err.message}`);
                
                io.emit('torrent:progress', {
                  id: torrentId,
                  name: torrent.name,
                  downloadProgress: torrentInfo.downloadProgress,
                  uploadProgress: 0,
                  status: 'error',
                  logs: torrentInfo.logs
                });
              }
              
              clearInterval(updateInterval);
            });
            
            resolve(torrentId);
          });
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Handle completed torrent download by processing and uploading to Google Drive
 * @param {string} torrentId - The torrent ID
 * @param {WebTorrent.Torrent} torrent - The WebTorrent torrent object
 * @param {string} teamDriveId - Google Team Drive ID
 * @param {boolean} shouldZip - Whether to zip the content
 */
async function handleCompletedDownload(torrentId, torrent, teamDriveId, shouldZip) {
  const torrentInfo = activeTorrents.get(torrentId);
  if (!torrentInfo) return;
  
  torrentInfo.status = 'processing';
  
  try {
    let sourcePath = torrentInfo.downloadPath;
    let uploadName = torrent.name;
    
    // Zip the content if requested
    if (shouldZip) {
      torrentInfo.logs.push('Creating ZIP archive...');
      
      io.emit('torrent:progress', {
        id: torrentId,
        name: torrent.name,
        downloadProgress: 100,
        uploadProgress: 0,
        status: 'processing',
        logs: torrentInfo.logs
      });
      
      const zipPath = join(tempDir, `${torrent.name}.zip`);
      await createZipArchive(sourcePath, zipPath);
      
      sourcePath = zipPath;
      uploadName = `${torrent.name}.zip`;
      
      torrentInfo.logs.push('ZIP archive created successfully');
    }
    
    // Start upload to Google Drive
    torrentInfo.status = 'uploading';
    torrentInfo.logs.push(`Starting upload to Google Drive Team Drive: ${teamDriveId}`);
    
    io.emit('torrent:progress', {
      id: torrentId,
      name: torrent.name,
      downloadProgress: 100,
      uploadProgress: 0,
      status: 'uploading',
      logs: torrentInfo.logs
    });
    
    // Upload to Google Drive with progress tracking
    await uploadToTeamDrive(
      sourcePath, 
      uploadName, 
      teamDriveId, 
      (progress) => {
        torrentInfo.uploadProgress = progress;
        torrentInfo.logs.push(`Upload progress: ${progress}%`);
        
        io.emit('torrent:progress', {
          id: torrentId,
          name: torrent.name,
          downloadProgress: 100,
          uploadProgress: progress,
          status: 'uploading',
          logs: torrentInfo.logs
        });
      }
    );
    
    // Upload complete
    torrentInfo.status = 'completed';
    torrentInfo.uploadProgress = 100;
    torrentInfo.logs.push('Upload to Google Drive completed successfully');
    
    io.emit('torrent:progress', {
      id: torrentId,
      name: torrent.name,
      downloadProgress: 100,
      uploadProgress: 100,
      status: 'completed',
      logs: torrentInfo.logs
    });
    
    // Clean up downloaded files
    await cleanupFiles(torrentId, shouldZip ? sourcePath : null);
  } catch (error) {
    console.error(`Error handling completed download for ${torrentId}:`, error);
    
    torrentInfo.status = 'error';
    torrentInfo.logs.push(`Error: ${error.message}`);
    
    io.emit('torrent:progress', {
      id: torrentId,
      name: torrent.name,
      downloadProgress: 100,
      uploadProgress: torrentInfo.uploadProgress,
      status: 'error',
      logs: torrentInfo.logs
    });
  }
}

/**
 * Clean up downloaded files after upload
 * @param {string} torrentId - The torrent ID
 * @param {string|null} zipPath - Path to the ZIP file if created
 */
async function cleanupFiles(torrentId, zipPath) {
  const torrentInfo = activeTorrents.get(torrentId);
  if (!torrentInfo) return;
  
  try {
    // Remove the torrent from WebTorrent
    const torrent = torrentInfo.torrent;
    if (torrent) {
      torrent.destroy();
    }
    
    // Remove download directory
    await rm(torrentInfo.downloadPath, { recursive: true, force: true });
    
    // Remove ZIP file if created
    if (zipPath) {
      await rm(zipPath, { force: true });
    }
    
    console.log(`Cleaned up files for ${torrentId}`);
  } catch (error) {
    console.error(`Error cleaning up files for ${torrentId}:`, error);
  }
}

/**
 * Get status of a specific torrent
 * @param {string} torrentId - The torrent ID
 * @returns {object|null} Torrent status or null if not found
 */
export function getTorrentStatus(torrentId) {
  const torrentInfo = activeTorrents.get(torrentId);
  if (!torrentInfo) return null;
  
  const { torrent, status, downloadProgress, uploadProgress, logs } = torrentInfo;
  
  return {
    id: torrentId,
    name: torrent.name,
    status,
    downloadProgress,
    uploadProgress,
    size: torrent.length ? `${(torrent.length / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
    timeRemaining: torrent.timeRemaining ? Math.floor(torrent.timeRemaining / 1000) : 0,
    logs
  };
}

/**
 * Get all active torrents
 * @returns {Array} Array of torrent status objects
 */
export function getAllTorrents() {
  const torrents = [];
  
  for (const [id, info] of activeTorrents.entries()) {
    const { torrent, status, downloadProgress, uploadProgress } = info;
    
    torrents.push({
      id,
      name: torrent.name,
      status,
      downloadProgress,
      uploadProgress,
      size: torrent.length ? `${(torrent.length / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
      timeRemaining: torrent.timeRemaining ? Math.floor(torrent.timeRemaining / 1000) : 0
    });
  }
  
  return torrents;
}

/**
 * Remove a torrent from the client and clean up files
 * @param {string} torrentId - The torrent ID
 */
export async function removeTorrent(torrentId) {
  const torrentInfo = activeTorrents.get(torrentId);
  if (!torrentInfo) {
    throw new Error('Torrent not found');
  }
  
  // Remove from client
  if (torrentInfo.torrent) {
    torrentInfo.torrent.destroy();
  }
  
  // Clean up files
  try {
    await rm(torrentInfo.downloadPath, { recursive: true, force: true });
  } catch (error) {
    console.error(`Error removing download directory for ${torrentId}:`, error);
  }
  
  // Remove from active torrents
  activeTorrents.delete(torrentId);
  
  return { success: true };
}