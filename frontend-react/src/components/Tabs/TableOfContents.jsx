import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  List, ChevronRight, ChevronDown, FileText, CheckSquare, FileSpreadsheet, 
  ClipboardList, Activity, Map, Clock, BookOpen
} from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';

// ─────────────────────────────────────────────────────────────────
// Dynamic TOC Tree Node (recursive)
// ─────────────────────────────────────────────────────────────────
const TocTreeNode = ({ node, depth = 0, navigateTo, sections }) => {
  const [isOpen, setIsOpen] = useState(depth < 2); // auto-expand top 2 levels
  const hasChildren = node.children && node.children.length > 0;

  // Try to map section number to an actual extracted section id
  const handleClick = () => {
    if (!node.number) return;
    const topNum = node.number.split('.')[0];
    if (sections && sections[topNum]) {
      if (node.number.includes('.')) {
        // subsection — find the matching subsection index by title
        const sec = sections[topNum];
        const subIdx = (sec.subsections || []).findIndex(
          s => s.title?.toLowerCase().trim() === node.title?.toLowerCase().trim()
        );
        navigateTo('sections', topNum, subIdx >= 0 ? subIdx : null);
      } else {
        navigateTo('sections', topNum);
      }
    }
  };

  const indentPx = depth * 20;
  const isTopLevel = depth === 0;

  return (
    <div>
      <motion.div
        whileHover={{ backgroundColor: 'rgba(var(--primary-lime-rgb, 50,205,50), 0.07)', x: depth === 0 ? 4 : 2 }}
        onClick={hasChildren ? () => setIsOpen(o => !o) : handleClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          paddingLeft: `${16 + indentPx}px`,
          paddingRight: '16px',
          paddingTop: isTopLevel ? '12px' : '8px',
          paddingBottom: isTopLevel ? '12px' : '8px',
          borderRadius: '10px',
          cursor: 'pointer',
          borderBottom: isTopLevel ? '1px solid var(--border-color)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Expand/Collapse chevron (only for parents) */}
        {hasChildren ? (
          <span style={{ color: 'var(--text-muted)', flexShrink: 0, width: '16px' }}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span style={{ width: '16px', flexShrink: 0 }} />
        )}

        {/* Section number badge */}
        {node.number && (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            color: isTopLevel ? 'var(--dark-lime)' : 'var(--text-muted)',
            background: isTopLevel ? 'var(--light-lime)' : 'var(--bg-gray)',
            padding: '2px 7px',
            borderRadius: '6px',
            flexShrink: 0,
            letterSpacing: '0.02em',
            minWidth: '28px',
            textAlign: 'center',
          }}>
            {node.number}
          </span>
        )}

        {/* Title */}
        <span
          style={{
            flex: 1,
            fontSize: isTopLevel ? '0.95rem' : '0.85rem',
            fontWeight: isTopLevel ? 700 : 500,
            color: 'var(--text-main)',
            lineHeight: '1.4',
          }}
          onClick={!hasChildren ? handleClick : undefined}
        >
          {node.title}
        </span>

        {/* Navigate arrow for leaf nodes */}
        {!hasChildren && node.number && (
          <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0, opacity: 0.5 }} />
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden',
              marginLeft: `${depth === 0 ? 16 : 8}px`,
              borderLeft: depth === 0 ? '2px solid var(--border-color)' : '1px solid var(--border-color)',
              paddingLeft: '4px',
              marginBottom: depth === 0 ? '4px' : 0,
            }}
          >
            {node.children.map((child, idx) => (
              <TocTreeNode
                key={idx}
                node={child}
                depth={depth + 1}
                navigateTo={navigateTo}
                sections={sections}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Static fallback groups (for DOCX / no toc_tree)
// ─────────────────────────────────────────────────────────────────
const STATIC_BASE_GROUPS = [
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
  }
];

const STATIC_PROTOCOL_DETAILS = (sections) => ({
  id: 'protocol-sections',
  label: 'Protocol Details',
  items: Object.entries(sections).filter(([id]) => id !== '0').sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([id, section]) => ({
    id: `section-${id}`,
    label: `${id}. ${section.title}`,
    icon: ClipboardList,
    tab: 'sections',
    sectionId: id,
    subsections: (section.subsections || []).map((sub, sIdx) => ({
      label: sub.number ? `${sub.number} ${sub.title}` : `${id}.${sIdx + 1} ${sub.title}`,
      sectionId: id,
      subIndex: sIdx
    }))
  }))
});

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
const TableOfContents = () => {
  const { data, navigateTo } = useProtocol();
  const sections = data.sections || {};

  // Check for LLM-parsed toc_tree
  const tocTree = sections['0']?.toc_tree;
  const hasDynamicToc = Array.isArray(tocTree) && tocTree.length > 0;

  return (
    <div className="fade-in" style={{ paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: 'var(--primary-lime)', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>NAVIGATION HUB</span>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border-color)' }}></div>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem' }}>
            {hasDynamicToc ? 'EXTRACTED FROM PDF' : 'STRUCTURED OVERVIEW'}
          </span>
        </div>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Table of Contents</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '4px' }}>
          {hasDynamicToc
            ? 'Hierarchical structure extracted directly from the protocol PDF.'
            : 'Complete hierarchical roadmap of your clinical protocol.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {[...STATIC_BASE_GROUPS, ...(hasDynamicToc ? [] : [STATIC_PROTOCOL_DETAILS(sections)])].map((group, gIdx) => (
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
                      display: 'flex', alignItems: 'center', gap: '14px', 
                      padding: '12px 16px', borderRadius: '12px', 
                      cursor: 'pointer', background: 'var(--bg-gray)',
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
                          style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, cursor: 'pointer', padding: '4px 0' }}
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

        {hasDynamicToc && (
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="card"
             style={{ padding: '32px' }}
           >
             <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-lime)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
               Protocol Details
               <div style={{ flex: 1, height: '1px', background: 'var(--border-color)', opacity: 0.5 }}></div>
             </h3>
             <div style={{ padding: '0px' }}>
               {tocTree.map((node, idx) => (
                 <TocTreeNode
                   key={idx}
                   node={node}
                   depth={0}
                   navigateTo={navigateTo}
                   sections={sections}
                 />
               ))}
             </div>
           </motion.div>
        )}
      </div>
    </div>
  );
};

export default TableOfContents;
