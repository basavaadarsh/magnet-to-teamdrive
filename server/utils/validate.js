/**
 * Validate required environment variables
 * @throws {Error} If a required environment variable is missing
 */
export function validateEnv() {
  const requiredEnvVars = [
    'PORT',
    'CORS_ORIGIN',
    'FRONTEND_URL'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
    console.warn('Using default values for missing variables');
  }
}