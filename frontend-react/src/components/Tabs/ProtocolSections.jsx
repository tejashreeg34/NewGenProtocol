import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, Plus, Trash2, ChevronRight, ChevronDown,
  Image as ImageIcon, Save, HelpCircle, AlertCircle, 
  List, FileText, Activity, Shield, Users, Settings, BarChart, Info, BookOpen,
  Bold, ListOrdered, X, UploadCloud, ArrowLeft, AlertTriangle
} from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import toast from 'react-hot-toast';
import ScheduleOfActivities from '../SpecialSections/ScheduleOfActivities';

const SECTION_ICONS = {
  "1": Activity, "2": FileText, "3": BarChart, "4": Settings, "5": Users,
  "6": Shield, "7": AlertCircle, "8": ClipboardList, "9": List, "10": Info, "11": BookOpen
};

/* ─── Reusable Modal ─── */
const Modal = ({ open, onClose, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={onClose}
      >
        <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
          className="card" style={{ width: '440px', padding: '36px', marginBottom: 0 }} onClick={e => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const ProtocolSections = () => {
  const { data, updateNestedField, addMainSection, deleteSection, addSubsection, deleteSubsection } = useProtocol();

  const [view, setView] = useState('grid');
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [activeSubIndex, setActiveSubIndex] = useState(null);
  const [expandedSubs, setExpandedSubs] = useState({});

  // Modal states
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [addSubTargetId, setAddSubTargetId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'section'|'sub', id, subIdx?, name }
  const [showGuidance, setShowGuidance] = useState(false);

  const textareaRef = useRef(null);
  const sections = data.sections || {};
  const activeSection = sections[activeSectionId];

  const openEditor = (id, subIdx = null) => { setActiveSectionId(id); setActiveSubIndex(subIdx); setView('editor'); };
  const backToGrid = () => { setView('grid'); setActiveSectionId(null); setActiveSubIndex(null); };

  const insertText = (before, after = '') => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd, value } = textareaRef.current;
    const selected = value.substring(selectionStart, selectionEnd);
    const newText = value.substring(0, selectionStart) + before + selected + after + value.substring(selectionEnd);
    const isMain = activeSubIndex === null;
    if (isMain) updateNestedField(['sections', activeSectionId, 'main'], newText);
    else {
      const subs = [...(activeSection.subsections || [])];
      subs[activeSubIndex].content = newText;
      updateNestedField(['sections', activeSectionId, 'subsections'], subs);
    }
    setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.setSelectionRange(selectionStart + before.length, selectionEnd + before.length); }, 0);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'section') {
      deleteSection(deleteTarget.id);
      if (activeSectionId === deleteTarget.id) backToGrid();
    } else {
      deleteSubsection(deleteTarget.id, deleteTarget.subIdx);
      if (activeSubIndex === deleteTarget.subIdx) setActiveSubIndex(null);
    }
    toast.success(`"${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
  };

  /* ═══════════ GRID VIEW ═══════════ */
  const renderGrid = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '36px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '6px' }}>Protocol Sections</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Click any section to start editing. Expand to see subsections.</p>
        </div>
        <button className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(50,205,50,0.18)' }}
          onClick={() => { setNewTitle(''); setAddSectionOpen(true); }}>
          <Plus size={18} /> New Section
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(sections).sort(([a],[b]) => parseInt(a) - parseInt(b)).map(([id, section]) => {
          const Icon = SECTION_ICONS[id] || ClipboardList;
          const isExp = expandedSubs[id];
          const subs = section.subsections || [];
          return (
            <motion.div key={id} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 0 }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: parseInt(id) * 0.03 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '18px 24px', gap: '14px', cursor: 'pointer' }} className="hover-card" onClick={() => openEditor(id)}>
                <div style={{ background: 'var(--light-lime)', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)', flexShrink: 0 }}>
                  <Icon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{id}. {section.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subs.length} subsection{subs.length !== 1 ? 's' : ''} · {(section.main || '').split(/\s+/).filter(x=>x).length} words</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button className="btn-icon" title="Add subsection" onClick={e => { e.stopPropagation(); setAddSubTargetId(id); setNewTitle(''); setAddSubOpen(true); }}><Plus size={16} /></button>
                  {subs.length > 0 && <button className="btn-icon" onClick={e => { e.stopPropagation(); setExpandedSubs(p => ({...p, [id]: !p[id]})); }}>{isExp ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</button>}
                  <button className="btn-icon" title="Delete" onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'section', id, name: section.title }); }}><Trash2 size={14} color="#EF4444"/></button>
                </div>
              </div>
              <AnimatePresence>
                {isExp && subs.length > 0 && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden', background: 'var(--bg-gray)', borderTop: '1px solid var(--border-color)' }}>
                    {subs.map((sub, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '12px 24px 12px 80px', gap: '12px', cursor: 'pointer', borderBottom: idx < subs.length - 1 ? '1px solid var(--border-color)' : 'none' }} className="hover-card" onClick={() => openEditor(id, idx)}>
                        <span style={{ fontSize: '0.85rem', flex: 1, fontWeight: 500 }}>{id}.{idx+1} {sub.title}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(sub.content||'').split(/\s+/).filter(x=>x).length} words</span>
                        <X size={14} color="#EF4444" style={{ cursor: 'pointer', opacity: 0.7 }} onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'sub', id, subIdx: idx, name: sub.title }); }}/>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  /* ═══════════ EDITOR VIEW ═══════════ */
  const renderEditor = () => {
    if (!activeSection) return null;
    const isMain = activeSubIndex === null;
    const title = isMain ? activeSection.title : activeSection.subsections?.[activeSubIndex]?.title;
    const content = isMain ? activeSection.main : activeSection.subsections?.[activeSubIndex]?.content;
    const label = isMain ? `Section ${activeSectionId}` : `Subsection ${activeSectionId}.${activeSubIndex + 1}`;
    const subs = activeSection.subsections || [];

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ padding: '10px 16px', borderRadius: '14px' }} onClick={backToGrid}>
            <ArrowLeft size={16} /> All Sections
          </button>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary-lime)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{label}</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>{title}</h2>
          </div>
          <button className="btn btn-secondary" style={{ padding: '10px 18px', borderRadius: '14px' }} onClick={() => setShowGuidance(!showGuidance)}>
            <Info size={16} /> Guidance
          </button>
          <button className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: '14px', boxShadow: '0 6px 20px rgba(50,205,50,0.15)' }} onClick={() => toast.success('Changes saved')}>
            <Save size={16} /> Save
          </button>
        </div>

        {/* Guidance Banner (toggleable) */}
        <AnimatePresence>
          {showGuidance && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '16px 24px', background: 'var(--light-lime)', borderRadius: '16px', border: '1px solid var(--primary-lime)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Info size={18} color="var(--dark-lime)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-main)' }}>
                  Follow <strong>ICH-E6 (R2)</strong> guidelines. Use <strong>bullets</strong> for inclusion/exclusion criteria. Include relevant <strong>literature citations</strong>. Images can illustrate study schemas or flowcharts.
                </p>
                <X size={16} color="var(--text-muted)" style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => setShowGuidance(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subsection Chips */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <motion.div whileHover={{ y: -2 }} onClick={() => setActiveSubIndex(null)}
            style={{ padding: '8px 18px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: activeSubIndex === null ? 'var(--primary-lime)' : 'var(--bg-gray)', color: activeSubIndex === null ? 'white' : 'var(--text-muted)' }}
          >Main Content</motion.div>
          {subs.map((sub, idx) => (
            <motion.div key={idx} whileHover={{ y: -2 }} 
              style={{ padding: '8px 12px 8px 18px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', background: activeSubIndex === idx ? 'var(--primary-lime)' : 'var(--bg-gray)', color: activeSubIndex === idx ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={() => setActiveSubIndex(idx)}
            >
              <span>{activeSectionId}.{idx+1} {sub.title}</span>
              <div 
                style={{ opacity: 0.8, cursor: 'pointer', color: '#EF4444' }} 
                onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'sub', id: activeSectionId, subIdx: idx, name: sub.title }); }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0.8}
              >
                <X size={14} />
              </div>
            </motion.div>
          ))}
          <motion.div whileHover={{ y: -2 }} style={{ padding: '8px 14px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-lime)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => { setAddSubTargetId(activeSectionId); setNewTitle(''); setAddSubOpen(true); }}
          ><Plus size={14}/> Add</motion.div>
        </div>

        {/* Scrollable content area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '12px', minHeight: 0 }}>
          {title?.includes('Schedule of Activities') ? (
             <ScheduleOfActivities />
          ) : (
            <>
              {/* Toolbar */}
              <div style={{ background: 'var(--bg-gray)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', padding: '10px 20px', display: 'flex', gap: '6px', alignItems: 'center', border: '1px solid var(--border-color)', borderBottom: 'none' }}>
                <button className="btn-icon" title="Bold" onClick={() => insertText('**', '**')}><Bold size={15}/></button>
                <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                <button className="btn-icon" title="Bullet List" onClick={() => insertText('\n- ')}><List size={15}/></button>
                <button className="btn-icon" title="Numbered List" onClick={() => insertText('\n1. ')}><ListOrdered size={15}/></button>
                <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                <button className="btn-icon" title="Insert Image" onClick={() => insertText('\n![description](url)')}><ImageIcon size={15}/></button>
                <div style={{ flex: 1 }}></div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{(content||'').split(/\s+/).filter(x=>x).length} words</span>
              </div>

              {/* Textarea */}
              <textarea ref={textareaRef} className="form-textarea"
                value={content || ''}
                onChange={e => {
                  if (isMain) updateNestedField(['sections', activeSectionId, 'main'], e.target.value);
                  else {
                    const s = [...(activeSection.subsections || [])];
                    s[activeSubIndex].content = e.target.value;
                    updateNestedField(['sections', activeSectionId, 'subsections'], s);
                  }
                }}
                placeholder={`Write content for "${title}" here...\n\nUse the toolbar above for formatting.`}
                style={{ width: '100%', minHeight: '320px', fontSize: '1.05rem', lineHeight: '1.8', background: 'white', border: '1px solid var(--border-color)', borderTop: 'none', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', padding: '28px 32px', resize: 'vertical', color: 'var(--text-main)', fontFamily: 'Inter, sans-serif' }}
              />

              {/* Attachments (below content) */}
              <div style={{ marginTop: '24px', padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <ImageIcon size={18} color="var(--primary-lime)" />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800 }}>Attachments</h4>
                </div>
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '14px', padding: '24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', cursor: 'pointer' }} className="hover-card">
                  <UploadCloud size={24} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <strong>Drag & drop</strong> images here, or <span style={{ color: 'var(--primary-lime)', fontWeight: 600 }}>browse files</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    );
  };

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="fade-in" style={{ height: 'calc(100vh - 160px)', overflowY: view === 'grid' ? 'auto' : 'hidden', paddingRight: '4px' }}>
      <AnimatePresence mode="wait">
        {view === 'grid' ? <div key="grid">{renderGrid()}</div> : <div key="editor" style={{ height: '100%' }}>{renderEditor()}</div>}
      </AnimatePresence>

      {/* ── Add Section Modal ── */}
      <Modal open={addSectionOpen} onClose={() => setAddSectionOpen(false)}>
        <h3 style={{ marginBottom: '20px', fontWeight: 800, fontSize: '1.2rem' }}>Add New Section</h3>
        <input autoFocus className="form-input" style={{ padding: '14px 18px', borderRadius: '14px', fontSize: '1rem' }}
          placeholder="e.g. Statistical Analysis Plan"
          value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) { addMainSection(newTitle.trim()); setNewTitle(''); setAddSectionOpen(false); toast.success('Section created'); }}}
        />
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button className="btn btn-primary" style={{ flex: 1, borderRadius: '14px' }} onClick={() => { if (newTitle.trim()) { addMainSection(newTitle.trim()); setNewTitle(''); setAddSectionOpen(false); toast.success('Section created'); }}}>Create Section</button>
          <button className="btn btn-secondary" style={{ flex: 1, borderRadius: '14px' }} onClick={() => setAddSectionOpen(false)}>Cancel</button>
        </div>
      </Modal>

      {/* ── Add Subsection Modal ── */}
      <Modal open={addSubOpen} onClose={() => setAddSubOpen(false)}>
        <h3 style={{ marginBottom: '6px', fontWeight: 800, fontSize: '1.2rem' }}>Add Subsection</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Adding to: <strong>{sections[addSubTargetId]?.title}</strong></p>
        <input autoFocus className="form-input" style={{ padding: '14px 18px', borderRadius: '14px', fontSize: '1rem' }}
          placeholder="e.g. Known Potential Risks"
          value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) { addSubsection(addSubTargetId, newTitle.trim()); setNewTitle(''); setAddSubOpen(false); toast.success('Subsection added'); }}}
        />
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button className="btn btn-primary" style={{ flex: 1, borderRadius: '14px' }} onClick={() => { if (newTitle.trim()) { addSubsection(addSubTargetId, newTitle.trim()); setNewTitle(''); setAddSubOpen(false); toast.success('Subsection added'); }}}>Add Subsection</button>
          <button className="btn btn-secondary" style={{ flex: 1, borderRadius: '14px' }} onClick={() => setAddSubOpen(false)}>Cancel</button>
        </div>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <AlertTriangle size={28} color="#EF4444" />
          </div>
          <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '8px' }}>Delete "{deleteTarget?.name}"?</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '28px', lineHeight: '1.5' }}>
            This action <strong>cannot be undone</strong>. All content within this {deleteTarget?.type === 'section' ? 'section and its subsections' : 'subsection'} will be permanently removed.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-secondary" style={{ flex: 1, borderRadius: '14px' }} onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn" style={{ flex: 1, borderRadius: '14px', background: '#EF4444', color: 'white' }} onClick={confirmDelete}>Yes, Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProtocolSections;
