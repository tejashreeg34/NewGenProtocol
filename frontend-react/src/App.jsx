import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import { Save, Trash2 } from 'lucide-react';

import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

import TitlePage from './components/Tabs/TitlePage';
import ProtocolSections from './components/Tabs/ProtocolSections';
import ApprovalAgreement from './components/Tabs/ApprovalAgreement';
import Synopsis from './components/Tabs/Synopsis';
import Preview from './components/Tabs/Preview';
import QCReport from './components/Tabs/QCReport';
import Generate from './components/Tabs/Generate';
import Interpretation from './components/Tabs/Interpretation';
import Dashboard from './components/Tabs/Dashboard';
import TableOfContents from './components/Tabs/TableOfContents';
import ImportDocument from './components/Tabs/ImportDocument';
import { useProtocol } from './context/ProtocolContext';
import GlobalModal from './components/Common/GlobalModal';
import LoginPage from './components/Auth/LoginPage';

function App() {
  const { activeTab, setActiveTab, openModal, isAuthenticated } = useProtocol();
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

  const handleGlobalSave = () => {
    toast.success('Progress saved');
  };

  const handleGlobalClear = () => {
    openModal({
      title: 'Clear Section Data?',
      message: 'Are you sure you want to clear all data in this section? This action cannot be undone.',
      icon: 'trash',
      onConfirm: () => {
        toast('Section data cleared', { icon: '🗑️' });
      }
    });
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'import':         return <ImportDocument />;
      case 'title-page':    return <TitlePage />;
      case 'approval':      return <ApprovalAgreement />;
      case 'synopsis':      return <Synopsis />;
      case 'toc':           return <TableOfContents />;
      case 'sections':      return <ProtocolSections />;
      case 'qc':            return <QCReport />;
      case 'preview':       return <Preview />;
      case 'generate':      return <Generate />;
      case 'interpretation':return <Interpretation />;
      case 'dashboard':     return <Dashboard />;
      default:              return <ImportDocument />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <LoginPage />
      </div>
    );
  }

  return (
    <div className="app-container">
      <GlobalModal />
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

          {/* Section Action Bar - hidden on read-only tabs */}
          {!['qc', 'preview', 'generate', 'interpretation', 'toc', 'import'].includes(activeTab) && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button className="btn" onClick={handleGlobalClear} style={{ background: 'transparent', color: '#EF4444', border: '1px solid #EF4444', padding: '8px 16px', fontSize: '0.85rem' }}>
                <Trash2 size={16} /> Clear Section Data
              </button>
              <button className="btn btn-primary" onClick={handleGlobalSave} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <Save size={16} /> Save Progress
              </button>
            </div>
          )}
        </div>
      </main>
      
      <Toaster 
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--dark-lime)',
            color: 'white',
            borderRadius: '12px',
            border: 'none',
            boxShadow: 'var(--shadow-lg)',
            padding: '16px',
            fontFamily: 'Inter',
            fontWeight: 600
          },
          success: {
            iconTheme: {
              primary: 'white',
              secondary: 'var(--dark-lime)',
            },
          },
        }}
      />
    </div>
  );
}

export default App;
