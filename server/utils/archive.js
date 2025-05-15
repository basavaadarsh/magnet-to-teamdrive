import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { stat } from 'fs/promises';

/**
 * Create a ZIP archive of a directory or file
 * @param {string} source - Path to source directory or file
 * @param {string} destination - Path to destination ZIP file
 * @returns {Promise<void>}
 */
export function createZipArchive(source, destination) {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if source exists
      await stat(source);
      
      // Create a file to stream archive data to
      const output = createWriteStream(destination);
      const archive = archiver('zip', {
        zlib: { level: 5 } // Compression level
      });
      
      // Listen for all archive data to be written
      output.on('close', () => {
        console.log(`Archive created: ${destination}, size: ${archive.pointer()} bytes`);
        resolve();
      });
      
      // Good practice to catch warnings
      archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
          console.warn('Archive warning:', err);
        } else {
          reject(err);
        }
      });
      
      // Handle errors
      archive.on('error', (err) => {
        reject(err);
      });
      
      // Pipe archive data to the output file
      archive.pipe(output);
      
      // Determine if source is a file or directory
      const stats = await stat(source);
      
      if (stats.isDirectory()) {
        // Archive a directory
        archive.directory(source, false);
      } else {
        // Archive a single file
        archive.file(source, { name: source.split('/').pop() });
      }
      
      // Finalize the archive
      await archive.finalize();
    } catch (error) {
      reject(error);
    }
  });
}