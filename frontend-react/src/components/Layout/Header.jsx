import React from 'react';
import { LogOut, Menu, User } from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import { motion } from 'framer-motion';

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useProtocol();

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
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right', display: 'none', sm: 'block' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{user?.full_name || 'Clinical User'}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.username || 'Researcher'}</div>
          </div>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '10px', 
            background: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10B981',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <User size={20} />
          </div>
        </div>

        <motion.div 
          onClick={logout}
          whileHover={{ scale: 1.1, color: '#EF4444' }} 
          style={{ cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}
          title="Logout"
        >
          <LogOut size={20} />
        </motion.div>
      </div>
    </header>
  );
};

export default Header;
