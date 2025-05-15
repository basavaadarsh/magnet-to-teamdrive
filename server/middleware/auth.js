import { checkAuthStatus } from '../services/googleDriveService.js';

/**
 * Middleware to ensure the request is authenticated with Google
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
export async function ensureAuthenticated(req, res, next) {
  try {
    const isAuthenticated = await checkAuthStatus();
    
    if (!isAuthenticated) {
      return res.status(401).json({
        error: {
          message: 'Not authenticated with Google Drive',
          code: 'not_authenticated'
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('Authentication check error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to verify authentication status',
        code: 'auth_check_failed'
      }
    });
  }
}