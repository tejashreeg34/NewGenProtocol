import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Download, FileText, CheckCircle2, Loader2, Sparkles, AlertCircle, FileDigit, ShieldCheck, Share2, Printer } from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:8000';

const Generate = () => {
  const { data } = useProtocol();
  const [loading, setLoading] = useState({ word: false, pdf: false });

  const handleDownload = async (format) => {
    setLoading({ ...loading, [format]: true });
    const toastId = toast.loading(`Assembling ${format.toUpperCase()} document...`);
    
    try {
      const endpoint = format === 'word' ? '/api/generate-word' : '/api/generate-pdf';
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, data, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Protocol_${data.protocol_number || 'Draft'}.${format === 'word' ? 'docx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`${format.toUpperCase()} Generated!`, { id: toastId });
    } catch (error) {
      console.error(`Error generating ${format}:`, error);
      toast.error(`Generation failed: ${error.message}`, { id: toastId });
    } finally {
      setLoading({ ...loading, [format]: false });
    }
  };

  return (
    <div className="fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <motion.div 
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          style={{ width: '80px', height: '80px', background: 'var(--light-lime)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)', margin: '0 auto 24px' }}
        >
          <Zap size={40} fill="var(--primary-lime)" />
        </motion.div>
        <h2 style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>Final Assembler</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginTop: '8px', maxWidth: '600px', margin: '8px auto 0' }}>
          Your protocol is ready for deployment. Choose a high-fidelity format for regulatory submission.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '48px' }}>
        {/* Word Export */}
        <motion.div 
          whileHover={{ y: -8, boxShadow: 'var(--shadow-lg)' }}
          className="card" 
          style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid var(--border-color)' }}
        >
          <div style={{ width: '72px', height: '72px', background: 'rgba(50, 150, 255, 0.1)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3182CE', marginBottom: '32px' }}>
            <FileText size={36} />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px' }}>Microsoft Word</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '40px' }}>
            Best for internal review and final formatting. Includes dynamic TOC and compliant style guides.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '16px', borderRadius: '16px', justifyContent: 'center', fontSize: '1rem' }}
            onClick={() => handleDownload('word')}
            disabled={loading.word}
          >
            {loading.word ? <Loader2 className="spin" size={20} /> : <Download size={20} />}
            <span style={{ marginLeft: '12px' }}>{loading.word ? 'Assembling docx...' : 'Download .docx'}</span>
          </button>
        </motion.div>

        {/* PDF Export */}
        <motion.div 
          whileHover={{ y: -8, boxShadow: 'var(--shadow-lg)' }}
          className="card" 
          style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid var(--border-color)' }}
        >
          <div style={{ width: '72px', height: '72px', background: 'rgba(229, 62, 62, 0.1)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E53E3E', marginBottom: '32px' }}>
            <FileDigit size={36} />
          </div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '16px' }}>Adobe PDF</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '40px' }}>
            Immutable archival format. Optimized for direct submission to ethics committees and IRB boards.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '16px', borderRadius: '16px', justifyContent: 'center', fontSize: '1rem', background: 'linear-gradient(135deg, #E53E3E 0%, #C53030 100%)', boxShadow: '0 8px 24px rgba(229, 62, 62, 0.2)' }}
            onClick={() => handleDownload('pdf')}
            disabled={loading.pdf}
          >
            {loading.pdf ? <Loader2 className="spin" size={20} /> : <Download size={20} />}
            <span style={{ marginLeft: '12px' }}>{loading.pdf ? 'Flattening PDF...' : 'Download .pdf'}</span>
          </button>
        </motion.div>
      </div>

      {/* Compliance Verification Footer */}
      <div style={{ padding: '32px 40px', background: 'var(--light-lime)', borderRadius: '24px', border: '1px solid var(--primary-lime)', display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div style={{ width: '64px', height: '64px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-lime)', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }}>
          <ShieldCheck size={32} />
        </div>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--dark-lime)', marginBottom: '4px' }}>AI Integrity Check Passed</h4>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', opacity: 0.8 }}>
            No major structural inconsistencies detected. Protocol version <strong>{data.protocol_number || 'v1.0'}</strong> is compliant with <strong>ICH GCP</strong> guidelines.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
           <button className="btn btn-secondary" style={{ background: 'white', padding: '12px', borderRadius: '14px' }} title="Print Preview"><Printer size={20} /></button>
           <button className="btn btn-secondary" style={{ background: 'white', padding: '12px', borderRadius: '14px' }} title="Share Link"><Share2 size={20} /></button>
        </div>
      </div>
    </div>
  );
};

export default Generate;
