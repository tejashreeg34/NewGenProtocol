import React from 'react';
import { Search, Bell, Settings, ChevronDown, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

const Header = ({ toggleSidebar }) => {
  return (
    <header className="header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button 
          onClick={toggleSidebar}
          className="header-menu-btn"
          style={{ 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-main)',
            padding: '4px'
          }}
        >
          <Menu size={24} />
        </button>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ 
            position: 'absolute', 
            left: '14px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: 'var(--text-muted)' 
          }} />
          <input 
            type="text" 
            placeholder="Search resources..." 
            style={{ 
              padding: '12px 16px 12px 42px', 
              borderRadius: '12px', 
              border: 'none', 
              background: '#F3F4F6',
              width: '100%',
              maxWidth: '320px',
              fontSize: '0.9rem',
              outline: 'none',
              fontFamily: 'Inter'
            }} 
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <motion.div whileHover={{ scale: 1.1 }} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
          <Bell size={20} />
        </motion.div>
        <motion.div whileHover={{ scale: 1.1 }} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
          <Settings size={20} />
        </motion.div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          padding: '6px 12px', 
          borderRadius: '10px', 
          background: 'white',
          border: '1px solid var(--border-color)',
          cursor: 'pointer'
        }}>
          <div style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '8px', 
            background: 'var(--lime-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: 800
          }}>V2</div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Draft</span>
          <ChevronDown size={14} color="var(--text-muted)" />
        </div>
      </div>
    </header>
  );
};

export default Header;
