import React from 'react';
import { motion } from 'framer-motion';
import { 
  List, ChevronRight, FileText, CheckSquare, FileSpreadsheet, 
  ClipboardList, Activity, Map, Clock
} from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';

const TableOfContents = () => {
  const { data, navigateTo } = useProtocol();
  const sections = data.sections || {};

  const tocItems = [
    { 
      id: 'core', 
      label: 'Core Information', 
      items: [
        { id: 'title-page', label: 'Title Page', icon: FileText, tab: 'title-page' },
        { id: 'approval', label: 'Approval & Agreement', icon: CheckSquare, tab: 'approval' },
      ]
    },
    {
      id: 'summary',
      label: 'Executive Summary',
      items: [
        { id: 'synopsis', label: 'Patient Synopsis', icon: FileSpreadsheet, tab: 'synopsis' },
        { id: 'schema', label: 'Study Schema', icon: Map, tab: 'synopsis' },
        { id: 'soa', label: 'Schedule of Activities', icon: Clock, tab: 'synopsis' },
      ]
    },
    {
      id: 'protocol-sections',
      label: 'Protocol Details',
      items: Object.entries(sections).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([id, section]) => ({
        id: `section-${id}`,
        label: `${id}. ${section.title}`,
        icon: ClipboardList,
        tab: 'sections',
        sectionId: id,
        subsections: (section.subsections || []).map((sub, sIdx) => ({
          label: `${id}.${sIdx + 1} ${sub.title}`,
          sectionId: id,
          subIndex: sIdx
        }))
      }))
    }
  ];

  return (
    <div className="fade-in" style={{ paddingBottom: '60px' }}>
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: 'var(--primary-lime)', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>NAVIGATION HUB</span>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-color)' }}></div>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem' }}>STRUCTURED OVERVIEW</span>
        </div>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Table of Contents</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '4px' }}>Complete hierarchical roadmap of your clinical protocol.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {tocItems.map((group, gIdx) => (
          <motion.div 
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gIdx * 0.1 }}
            className="card"
            style={{ padding: '32px' }}
          >
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-lime)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {group.label}
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)', opacity: 0.5 }}></div>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {group.items.map((item, iIdx) => (
                <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <motion.div 
                    whileHover={{ x: 6 }}
                    onClick={() => navigateTo(item.tab, item.sectionId)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '14px', 
                      padding: '12px 16px', 
                      borderRadius: '12px', 
                      cursor: 'pointer',
                      background: 'var(--bg-gray)',
                      transition: 'all 0.2s ease'
                    }}
                    className="toc-item"
                  >
                    <div style={{ background: 'white', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)', boxShadow: 'var(--shadow-sm)' }}>
                      <item.icon size={16} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', flex: 1 }}>{item.label}</span>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </motion.div>

                  {item.subsections && item.subsections.length > 0 && (
                    <div style={{ marginLeft: '46px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
                      {item.subsections.map((sub, sIdx) => (
                        <motion.div 
                          key={sIdx}
                          whileHover={{ color: 'var(--primary-lime)', x: 4 }}
                          onClick={() => navigateTo('sections', sub.sectionId, sub.subIndex)}
                          style={{ 
                            fontSize: '0.85rem', 
                            color: 'var(--text-muted)', 
                            fontWeight: 500, 
                            cursor: 'pointer',
                            padding: '4px 0'
                          }}
                        >
                          {sub.label}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TableOfContents;
