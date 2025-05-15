import React, { useState } from 'react';
import { FileUp as FileUpload, Magnet as MagnetLink } from 'lucide-react';
import Header from './components/Header';
import UploadForm from './components/UploadForm';
import TransferList from './components/TransferList';
import Footer from './components/Footer';
import { ThemeProvider } from './context/ThemeContext';
import { TransferProvider } from './context/TransferContext';
import { WebSocketProvider } from './context/WebSocketContext';

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'transfers'>('upload');

  return (
    <ThemeProvider>
      <WebSocketProvider>
        <TransferProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col">
            <Header />
            
            <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                  <button
                    className={`flex items-center gap-2 py-3 px-6 text-sm font-medium transition-colors ${
                      activeTab === 'upload' 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setActiveTab('upload')}
                  >
                    <FileUpload size={16} />
                    New Transfer
                  </button>
                  <button
                    className={`flex items-center gap-2 py-3 px-6 text-sm font-medium transition-colors ${
                      activeTab === 'transfers' 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onClick={() => setActiveTab('transfers')}
                  >
                    <MagnetLink size={16} />
                    Active Transfers
                  </button>
                </div>
                
                <div className="p-6">
                  {activeTab === 'upload' ? (
                    <UploadForm />
                  ) : (
                    <TransferList />
                  )}
                </div>
              </div>
            </main>
            
            <Footer />
          </div>
        </TransferProvider>
      </WebSocketProvider>
    </ThemeProvider>
  );
}

export default App;