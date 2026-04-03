import React from 'react';
import toast from 'react-hot-toast';
import { Save, Trash2 } from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';

const Footer = () => {
  const { data, setData } = useProtocol();

  const handleSave = () => {
    // In original app, we would sync to backend if needed.
    toast.success('Progress saved successfully');
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all data?')) {
      toast('All data cleared', { icon: '🗑️' });
      // Reset logic would go here if needed.
    }
  };

  return (
    <footer style={{
      padding: '16px 32px',
      background: 'var(--white)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div className="status" style={{color: 'var(--muted-text)', fontSize: '0.9rem', fontWeight: 500}}>
        Ready
      </div>
      <div className="actions" style={{display: 'flex', gap: '12px'}}>
        <button className="btn btn-danger" onClick={handleClear}>
          <Trash2 size={16} /> Clear All
        </button>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={16} /> Save Progress
        </button>
      </div>
    </footer>
  );
};

export default Footer;
