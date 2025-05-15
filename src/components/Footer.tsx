import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
      <div className="container mx-auto px-4">
        <p>
          TorrentDrive &copy; {new Date().getFullYear()} | Made with <span className="text-red-500">♥</span>{' '}
          for productivity
        </p>
        <p className="mt-1 text-xs">
          <a
            href="#"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Privacy Policy
          </a>{' '}
          &bull;{' '}
          <a
            href="#"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Terms of Service
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;