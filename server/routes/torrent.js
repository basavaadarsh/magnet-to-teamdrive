import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { 
  addTorrent, 
  getTorrentStatus, 
  getAllTorrents, 
  removeTorrent 
} from '../services/torrentService.js';
import { 
  uploadToTeamDrive, 
  getTeamDrives 
} from '../services/googleDriveService.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Get all torrents
router.get('/', ensureAuthenticated, async (req, res, next) => {
  try {
    const torrents = await getAllTorrents();
    res.json({ torrents });
  } catch (error) {
    next(error);
  }
});

// Get torrent status
router.get(
  '/:id',
  ensureAuthenticated,
  param('id').isString().withMessage('Invalid torrent ID'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const status = await getTorrentStatus(req.params.id);
      if (!status) {
        return res.status(404).json({ error: { message: 'Torrent not found' } });
      }
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
);

// Add torrent from magnet link
router.post(
  '/magnet',
  ensureAuthenticated,
  body('magnetLink').isString().notEmpty().withMessage('Magnet link is required'),
  body('teamDriveId').isString().notEmpty().withMessage('Team Drive ID is required'),
  body('shouldZip').isBoolean().withMessage('shouldZip must be a boolean'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { magnetLink, teamDriveId, shouldZip } = req.body;
      const torrentId = await addTorrent(magnetLink, teamDriveId, shouldZip);
      res.status(201).json({ id: torrentId });
    } catch (error) {
      next(error);
    }
  }
);

// Add torrent from file
router.post(
  '/file',
  ensureAuthenticated,
  (req, res, next) => {
    req.upload.single('torrent')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: { message: err.message } });
      }
      next();
    });
  },
  body('teamDriveId').isString().notEmpty().withMessage('Team Drive ID is required'),
  body('shouldZip').isBoolean().withMessage('shouldZip must be a boolean'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: { message: 'Torrent file is required' } });
    }

    try {
      const { teamDriveId, shouldZip } = req.body;
      const torrentId = await addTorrent(req.file.path, teamDriveId, shouldZip);
      res.status(201).json({ id: torrentId });
    } catch (error) {
      next(error);
    }
  }
);

// Remove torrent
router.delete(
  '/:id',
  ensureAuthenticated,
  param('id').isString().withMessage('Invalid torrent ID'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      await removeTorrent(req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

// Get all team drives
router.get('/drives/team', ensureAuthenticated, async (req, res, next) => {
  try {
    const teamDrives = await getTeamDrives();
    res.json({ teamDrives });
  } catch (error) {
    next(error);
  }
});

export default router;