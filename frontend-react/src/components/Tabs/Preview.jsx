import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, RefreshCw, Download, FileText, Share2, Printer, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, FileCheck } from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:8000';

const Preview = () => {
  const { data } = useProtocol();
  const [html, setHtml] = useState('<p style="text-align: center; color: #888; font-style: italic; margin-top: 100px;">Synchronizing with rendering engine...</p>');
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(100);

  const fetchPreview = async () => {
    setLoading(true);
    const toastId = toast.loading('Assembling high-fidelity preview...');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/render-preview`, data);
      setHtml(response.data.html || '<p style="text-align: center; margin-top: 100px;">No content available for preview.</p>');
      toast.success('Document rendered successfully', { id: toastId });
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to connect to rendering engine', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, []);

  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header / Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--primary-lime)', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.1em' }}>LIVE BROADCAST</span>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-lime)', animation: 'pulse 2s infinite' }}></div>
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Document Preview</h2>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '4px', marginRight: '12px' }}>
            <button className="btn-icon" style={{ height: '36px', width: '36px' }} onClick={() => setZoom(z => Math.max(50, z - 10))} title="Zoom Out"><ZoomOut size={16} /></button>
            <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: '60px', justifyContent: 'center' }}>{zoom}%</div>
            <button className="btn-icon" style={{ height: '36px', width: '36px' }} onClick={() => setZoom(z => Math.min(200, z + 10))} title="Zoom In"><ZoomIn size={16} /></button>
          </div>
          
          <button className="btn btn-secondary" onClick={() => window.print()} style={{ borderRadius: '12px', padding: '10px 16px' }}>
            <Printer size={16} /> Print
          </button>
          <button className="btn btn-secondary" onClick={fetchPreview} disabled={loading} style={{ borderRadius: '12px', padding: '10px 16px' }}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> {loading ? 'Rendering...' : 'Refresh'}
          </button>
          <button className="btn btn-primary" style={{ borderRadius: '12px', padding: '10px 20px', boxShadow: '0 4px 12px rgba(50, 205, 50, 0.15)' }}>
            <Share2 size={16} /> Share Preview
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div style={{ 
        flex: 1, 
        background: '#D1D5DB', 
        borderRadius: '24px', 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)',
        border: '1px solid rgba(0,0,0,0.1)'
      }}>
         {/* Internal Bar */}
         <div style={{ 
           height: '48px', 
           background: '#F9FAFB', 
           borderBottom: '1px solid #E5E7EB', 
           display: 'flex', 
           alignItems: 'center', 
           padding: '0 24px',
           justifyContent: 'space-between',
           flexShrink: 0
         }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#4B5563' }}>
                  <FileText size={14} /> Protocol_Draft_Final.pdf
               </div>
               <div style={{ height: '16px', width: '1px', background: '#D1D5DB' }}></div>
               <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9CA3AF' }}>Status: <span style={{ color: 'var(--primary-lime)' }}>High Fidelity Render</span></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <button className="btn-icon" style={{ height: '32px', width: '32px', background: 'transparent', border: 'none' }}><ChevronLeft size={16} /></button>
               <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4B5563' }}>PAGE 1 / 14</span>
               <button className="btn-icon" style={{ height: '32px', width: '32px', background: 'transparent', border: 'none' }}><ChevronRight size={16} /></button>
               <div style={{ height: '16px', width: '1px', background: '#D1D5DB', margin: '0 8px' }}></div>
               <button className="btn-icon" style={{ height: '32px', width: '32px', background: 'transparent', border: 'none' }}><Maximize2 size={16} /></button>
            </div>
         </div>
         
         {/* Scrollable Document Area */}
         <div style={{ 
           flex: 1, 
           padding: '60px 20px', 
           overflowY: 'auto', 
           display: 'flex', 
           flexDirection: 'column',
           alignItems: 'center',
           background: '#E5E7EB'
         }}>
            <AnimatePresence mode="wait">
              <motion.div 
                key={loading ? 'loading' : 'content'}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                style={{ 
                  width: '100%', 
                  maxWidth: `${800 * (zoom / 100)}px`, 
                  background: 'white', 
                  boxShadow: '0 20px 50px rgba(0,0,0,0.15)', 
                  padding: `${80 * (zoom / 100)}px`,
                  fontFamily: '"Times New Roman", Times, serif',
                  lineHeight: '1.6',
                  color: '#1a1a1a',
                  position: 'relative',
                  transformOrigin: 'top center'
                }}
              >
                 {loading ? (
                   <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)', zIndex: 10 }}>
                      <RefreshCw className="spin" size={48} color="var(--primary-lime)" />
                      <p style={{ marginTop: '20px', fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'Inter' }}>Generating High-Fidelity Render...</p>
                   </div>
                 ) : (
                   <div 
                     style={{ fontSize: `${1 * (zoom / 100)}rem` }}
                     dangerouslySetInnerHTML={{ __html: html }} 
                   />
                 )}
              </motion.div>
            </AnimatePresence>
         </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Preview;
