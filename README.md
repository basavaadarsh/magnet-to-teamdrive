# TorrentDrive

TorrentDrive is a web application that allows you to mirror torrent content directly to a Google Team Drive (Shared Drive).

## Features

- Upload torrent files or paste magnet links for downloading
- Connect to Google Drive API with OAuth for secure Team Drive access
- Real-time download and upload progress tracking with WebSockets
- Optional ZIP compression before uploading to Team Drive
- Background task processing for concurrent operations
- Detailed logging and status updates for each transfer
- File/folder cleanup after successful uploads
- Responsive design that works across all devices

## Project Structure

```
├── client/                 # Frontend React application
│   ├── src/                
│   │   ├── components/     # React components
│   │   ├── context/        # React context providers
│   │   ├── utils/          # Utility functions
│   │   └── App.tsx         # Main application component
│   └── ...
│
├── server/                 # Backend Node.js application
│   ├── config/             # Configuration files
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── utils/              # Utility functions
│   ├── downloads/          # Downloaded torrent files (gitignored)
│   ├── temp/               # Temporary files (gitignored)
│   └── index.js            # Server entry point
└── ...
```

## Setup and Installation

### Prerequisites

- Node.js 16.x or higher
- Google Cloud Platform account with Drive API enabled
- Google OAuth 2.0 credentials

### Frontend Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env.local` file with the following content:
   ```
   VITE_API_URL=http://localhost:3001/api
   VITE_WS_URL=ws://localhost:3001
   ```

3. Start the development server:
   ```
   npm run dev
   ```

### Backend Setup

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```

4. Update the `.env` file with your Google OAuth credentials.

5. Create necessary directories:
   ```
   mkdir -p config downloads temp
   ```

6. Place your Google OAuth credentials in `server/config/credentials.json`.

7. Start the server:
   ```
   npm run dev
   ```

## Usage

1. Open the application in your browser at `http://localhost:5173`.
2. Connect your Google account by clicking the "Connect" button.
3. Paste a magnet link or upload a .torrent file.
4. Enter your Google Team Drive ID.
5. Select whether to zip the content before uploading.
6. Click "Start Transfer" to begin the process.
7. Monitor the transfer progress in the "Active Transfers" tab.

## License

MIT