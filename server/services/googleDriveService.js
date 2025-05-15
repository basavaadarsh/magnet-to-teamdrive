import { google } from 'googleapis';
import { createReadStream, createWriteStream } from 'fs';
import { stat, readFile, writeFile } from 'fs/promises';
import { join, basename } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Setup paths
const __dirname = dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = join(__dirname, '../config/credentials.json');
const TOKEN_PATH = join(__dirname, '../config/token.json');

// OAuth 2.0 scopes
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
];

let oAuth2Client = null;

/**
 * Create OAuth2 client from credentials file
 */
async function createOAuth2Client() {
  try {
    const content = await readFile(CREDENTIALS_PATH, 'utf8');
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    return new google.auth.OAuth2(
      client_id,
      client_secret,
      process.env.GOOGLE_REDIRECT_URI || redirect_uris[0]
    );
  } catch (error) {
    console.error('Error loading credentials:', error);
    throw new Error('Failed to load Google API credentials');
  }
}

/**
 * Get URL for OAuth authentication
 */
export async function getAuthUrl() {
  if (!oAuth2Client) {
    oAuth2Client = await createOAuth2Client();
  }
  
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

/**
 * Handle OAuth callback and save token
 */
export async function handleAuthCallback(code) {
  if (!oAuth2Client) {
    oAuth2Client = await createOAuth2Client();
  }
  
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  
  await writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  
  return { success: true };
}

/**
 * Check if authentication is valid
 */
export async function checkAuthStatus() {
  try {
    const drive = await getAuthenticatedDrive();
    await drive.about.get({ fields: 'user' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get authenticated Google Drive API instance
 */
async function getAuthenticatedDrive() {
  if (!oAuth2Client) {
    oAuth2Client = await createOAuth2Client();
  }
  
  try {
    const token = await readFile(TOKEN_PATH, 'utf8');
    oAuth2Client.setCredentials(JSON.parse(token));
  } catch (error) {
    throw new Error('Not authenticated with Google Drive');
  }
  
  return google.drive({ version: 'v3', auth: oAuth2Client });
}

/**
 * Get list of Team Drives
 */
export async function getTeamDrives() {
  const drive = await getAuthenticatedDrive();
  
  const res = await drive.drives.list({
    fields: 'drives(id,name,capabilities)',
    pageSize: 100
  });
  
  return res.data.drives || [];
}

/**
 * Validate Team Drive ID
 */
export async function validateTeamDrive(driveId) {
  try {
    const drive = await getAuthenticatedDrive();
    
    const res = await drive.drives.get({
      driveId,
      fields: 'id,name,capabilities'
    });
    
    return {
      valid: true,
      name: res.data.name,
      canUpload: res.data.capabilities?.canAddChildren || false
    };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Upload file to Team Drive
 */
export async function uploadToTeamDrive(filePath, teamDriveId, progressCallback) {
  const drive = await getAuthenticatedDrive();
  const fileSize = (await stat(filePath)).size;
  const fileStream = createReadStream(filePath);
  
  const fileMetadata = {
    name: basename(filePath),
    parents: [teamDriveId]
  };
  
  const media = {
    mimeType: 'application/octet-stream',
    body: fileStream
  };
  
  const res = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id,name,webViewLink',
    supportsAllDrives: true,
    uploadType: 'resumable'
  }, {
    onUploadProgress: evt => {
      if (progressCallback) {
        progressCallback(Math.round((evt.bytesRead / fileSize) * 100));
      }
    }
  });
  
  return {
    id: res.data.id,
    name: res.data.name,
    webViewLink: res.data.webViewLink
  };
}