import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, FileText, ClipboardList, CheckSquare, 
  FileSpreadsheet, Eye, ShieldCheck, Zap, BrainCircuit, List, Upload
} from 'lucide-react';

import { useProtocol } from '../../context/ProtocolContext';

const Sidebar = ({ activeTab, onTabChange, isOpen, setIsOpen }) => {
  const { user } = useProtocol();
  const tabs = [
    { id: 'import',         label: 'Import Document',    icon: Upload },
    { id: 'title-page',     label: 'Title Page',         icon: FileText },
    { id: 'approval',       label: 'Approval & Agreement', icon: CheckSquare },
    { id: 'synopsis',       label: 'Synopsis',           icon: FileSpreadsheet },
    { id: 'toc',            label: 'Table of Contents',  icon: List },
    { id: 'sections',       label: 'Protocol Sections',  icon: ClipboardList },
    { id: 'qc',             label: 'Quality Report',     icon: ShieldCheck },
    { id: 'preview',        label: 'Document Preview',   icon: Eye },
    { id: 'generate',       label: 'Generate Final',     icon: Zap },
    { id: 'interpretation', label: 'Interpretation',     icon: BrainCircuit },
    { id: 'dashboard',      label: 'Intelligence',       icon: Activity },
  ];

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(user?.full_name || user?.username || 'User');

  return (
    <>
      {isOpen && (
        <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-logo">
        <motion.div 
          initial={{ rotate: -20 }}
          animate={{ rotate: 0 }}
          style={{ 
            background: 'var(--lime-gradient)', 
            width: '36px', 
            height: '36px', 
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}
        >
          <Activity size={22} />
        </motion.div>
        <span style={{ fontFamily: 'Outfit' }}>GenProtocol</span>
      </div>
      
      <nav style={{ flex: 1 }}>
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.div
              key={tab.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-nav"
                  style={{ 
                    position: 'absolute', 
                    left: 0, 
                    width: '4px', 
                    height: '20px', 
                    background: 'white', 
                    borderRadius: '0 4px 4px 0' 
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '12px', 
            background: 'var(--light-lime)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontWeight: 700,
            color: 'var(--dark-lime)',
            fontSize: '0.85rem'
          }}>{initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || user?.username || 'Guest'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {user?.status || 'Lead Investigator'}
            </div>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
