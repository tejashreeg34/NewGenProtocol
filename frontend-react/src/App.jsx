import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';

import TitlePage from './components/Tabs/TitlePage';
import ProtocolSections from './components/Tabs/ProtocolSections';
import ApprovalAgreement from './components/Tabs/ApprovalAgreement';
import Synopsis from './components/Tabs/Synopsis';
import Preview from './components/Tabs/Preview';
import QCReport from './components/Tabs/QCReport';
import Generate from './components/Tabs/Generate';
import Interpretation from './components/Tabs/Interpretation';
import Dashboard from './components/Tabs/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState('title-page');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'title-page': return <TitlePage />;
      case 'approval': return <ApprovalAgreement />;
      case 'synopsis': return <Synopsis />;
      case 'sections': return <ProtocolSections />;
      case 'qc': return <QCReport />;
      case 'preview': return <Preview />;
      case 'generate': return <Generate />;
      case 'interpretation': return <Interpretation />;
      case 'dashboard': return <Dashboard />;
      default: return <TitlePage />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
      />
      
      <main className="main-content">
        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <div className="content-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
        
        <Footer />
      </main>
      
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'white',
            color: 'var(--text-main)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-lg)',
            padding: '16px',
            fontFamily: 'Inter'
          },
        }}
      />
    </div>
  );
}

export default App;
