import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, Plus, Trash2, ChevronRight, ChevronDown,
  Image as ImageIcon, Save, HelpCircle, AlertCircle, 
  List, FileText, Activity, Shield, Users, Settings, BarChart, Info, BookOpen,
  Bold, ListOrdered, X, UploadCloud, ArrowLeft, ArrowRight, AlertTriangle,
  Target, ListChecks, MapPin, Calendar, Clock, Table as TableIcon
} from 'lucide-react';
import { useProtocol } from '../../context/ProtocolContext';
import toast from 'react-hot-toast';
import ScheduleOfActivities from '../SpecialSections/ScheduleOfActivities';

const SECTION_ICONS = {
  "1": Activity, "2": FileText, "3": BarChart, "4": Settings, "5": Users,
  "6": Shield, "7": AlertCircle, "8": ClipboardList, "9": List, "10": Info, "11": BookOpen
};



const SynopsisStructuredEditor = ({ onChange }) => {
  const { data, updateNestedField } = useProtocol();
  const synopsis = data.synopsis || {};

  const handleFieldChange = (field, value) => {
    const newSynopsis = { ...synopsis, [field]: value };
    updateNestedField(['synopsis', field], value);
    
    const fieldsOrder = [
      ['Title', 'Title'],
      ['Study Description', 'Study Description'],
      ['Objectives', 'Objectives'],
      ['Endpoints', 'Endpoints'],
      ['Study Population', 'Study Population'],
      ['Phase', 'Phase'],
      ['Sites/Facilities', 'Description of Sites/Facilities'],
      ['Study Intervention Description', 'Description of Study Intervention'],
      ['Study Duration', 'Study Duration'],
      ['Participant Duration', 'Participant Duration']
    ];

    const html = fieldsOrder
      .filter(([key]) => newSynopsis[key])
      .map(([key, label]) => `<b>${label}:</b> ${newSynopsis[key]}`)
      .join('<br/><br/>');
    
    onChange(html);
  };

  const fieldConfig = [
    { id: 'Title', label: 'Title', icon: FileText, placeholder: 'Complete clinical trial title...' },
    { id: 'Study Description', label: 'Study Description', icon: Info, placeholder: 'Brief overview of the study...' },
    { id: 'Objectives', label: 'Objectives', icon: Target, placeholder: 'Primary, secondary and exploratory objectives...' },
    { id: 'Endpoints', label: 'Endpoints', icon: ListChecks, placeholder: 'Specific measurements for trial outcomes...' },
    { id: 'Study Population', label: 'Study Population', icon: Users, placeholder: 'Target population and estimated sample size...' },
    { id: 'Phase', label: 'Phase', icon: Activity, placeholder: 'e.g. Phase I, II, III, or IV' },
    { id: 'Sites/Facilities', label: 'Description of Sites/Facilities', icon: MapPin, placeholder: 'Number and locations of trial sites...' },
    { id: 'Study Intervention Description', label: 'Description of Study Intervention', icon: Activity, placeholder: 'Details of the investigational product and administration...' },
    { id: 'Study Duration', label: 'Study Duration', icon: Clock, placeholder: 'Total time from first enrollment to last visit...' },
    { id: 'Participant Duration', label: 'Participant Duration', icon: Calendar, placeholder: 'Estimated duration for each individual subject...' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px' }}>
      {fieldConfig.map((f) => (
        <div key={f.id} className="card" style={{ padding: '24px', border: '1px solid var(--border-color)', borderRadius: '20px', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--light-lime)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)' }}>
              <f.icon size={18} />
            </div>
            <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{f.label}</label>
          </div>
          <textarea 
            className="form-input" 
            rows={f.id === 'Title' || f.id === 'Study Description' ? 4 : 3}
            value={synopsis[f.id] || ''} 
            onChange={(e) => handleFieldChange(f.id, e.target.value)}
            placeholder={f.placeholder}
            style={{ padding: '16px', fontSize: '0.95rem', lineHeight: '1.6', width: '100%', border: '1px solid var(--border-color)', borderRadius: '12px', resize: 'vertical' }}
          />
        </div>
      ))}
    </div>
  );
};

const CustomTabulation = ({ activeSectionId, activeSubIndex, defaultHeaders = ["Visit", "Procedure", "Details"], defaultRowsCount = 1 }) => {
  const { data, updateNestedField, openModal } = useProtocol();
  const [cols, setCols] = useState(defaultHeaders.length);
  const [rows, setRows] = useState(defaultRowsCount);

  const sections = data.sections || {};
  const activeSection = sections[activeSectionId];
  const subs = activeSection?.subsections || [];
  const currentSub = subs[activeSubIndex] || {};
  const table = currentSub.customTable; 

  const generateTable = () => {
    const newHeaders = [...defaultHeaders];
    for (let i = newHeaders.length; i < cols; i++) {
        newHeaders.push('Header');
    }
    const finalHeaders = newHeaders.slice(0, cols);
    const newRows = Array(rows).fill(Array(cols).fill(''));
    
    const newSubs = [...subs];
    newSubs[activeSubIndex] = { ...currentSub, customTable: { headers: finalHeaders, rows: newRows } };
    updateNestedField(['sections', activeSectionId, 'subsections'], newSubs);
  };

  const updateHeader = (cIdx, val) => {
    const newHeaders = [...table.headers];
    newHeaders[cIdx] = val;
    const newSubs = [...subs];
    newSubs[activeSubIndex] = { ...currentSub, customTable: { ...table, headers: newHeaders } };
    updateNestedField(['sections', activeSectionId, 'subsections'], newSubs);
  };

  const updateCell = (rIdx, cIdx, val) => {
    const newRows = table.rows.map(row => [...row]);
    newRows[rIdx][cIdx] = val;
    const newSubs = [...subs];
    newSubs[activeSubIndex] = { ...currentSub, customTable: { ...table, rows: newRows } };
    updateNestedField(['sections', activeSectionId, 'subsections'], newSubs);
  };

  const addTableRow = () => {
    const newRows = [...table.rows, Array(table.headers.length).fill('')];
    const newSubs = [...subs];
    newSubs[activeSubIndex] = { ...currentSub, customTable: { ...table, rows: newRows } };
    updateNestedField(['sections', activeSectionId, 'subsections'], newSubs);
  };

  const deleteRow = (rIdx) => {
    openModal({
      title: 'Delete Row?',
      message: `Are you sure you want to delete this row? This action cannot be undone.`,
      icon: 'trash',
      onConfirm: () => {
        const newRows = table.rows.filter((_, i) => i !== rIdx);
        const newSubs = [...subs];
        newSubs[activeSubIndex] = { ...currentSub, customTable: { ...table, rows: newRows } };
        updateNestedField(['sections', activeSectionId, 'subsections'], newSubs);
        toast.success('Row deleted');
      }
    });
  };

  const deleteTable = () => {
    openModal({
      title: 'Delete Table?',
      message: 'Are you sure you want to delete this table? All data will be lost.',
      icon: 'trash',
      onConfirm: () => {
        const newSubs = [...subs];
        newSubs[activeSubIndex] = { ...currentSub, customTable: null };
        updateNestedField(['sections', activeSectionId, 'subsections'], newSubs);
        toast.success('Table deleted');
      }
    });
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerStyle = isFullscreen ? {
    position: 'fixed', inset: 0, zIndex: 9999, background: 'var(--bg-gray)', padding: '64px', overflowY: 'auto'
  } : {
    marginTop: '24px', padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)'
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TableIcon size={18} color="var(--primary-lime)" />
          <h4 style={{ fontSize: isFullscreen ? '1.5rem' : '0.9rem', fontWeight: 800 }}>Custom Tabulation</h4>
        </div>
        {table && (
          <button className="btn btn-secondary" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? 'Exit Full Screen' : 'Expand Table'}
          </button>
        )}
      </div>

      {!table ? (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', background: 'var(--bg-gray)', padding: '16px', borderRadius: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Columns</label>
            <input type="number" className="form-input" value={cols} onChange={e => setCols(Math.max(1, parseInt(e.target.value)))} style={{ width: '80px' }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Rows</label>
            <input type="number" className="form-input" value={rows} onChange={e => setRows(Math.max(1, parseInt(e.target.value)))} style={{ width: '80px' }} />
          </div>
          <button className="btn btn-primary" onClick={generateTable}><Plus size={16}/> Generate Table</button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {table.headers.map((h, i) => (
                  <th key={i} style={{ padding: '12px', borderBottom: '2px solid var(--border-color)', borderRight: '1px solid rgba(0,0,0,0.05)', background: '#F8FAFC', minWidth: '150px' }}>
                    <input 
                      style={{ border: 'none', width: '100%', fontWeight: 700, textAlign: 'left', fontSize: '0.85rem', background: 'transparent', outline: 'none' }}
                      value={h}
                      onChange={(e) => updateHeader(i, e.target.value)}
                    />
                  </th>
                ))}
                <th style={{ width: '40px', background: '#F8FAFC', borderBottom: '2px solid var(--border-color)' }}></th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{ padding: '0', borderRight: '1px solid rgba(0,0,0,0.05)', background: 'white' }}>
                      <input 
                        style={{ border: 'none', width: '100%', fontSize: '0.95rem', padding: '16px', color: 'var(--text-main)', outline: 'none' }}
                        value={cell}
                        onChange={(e) => updateCell(rIdx, cIdx, e.target.value)}
                        placeholder="Enter value..."
                      />
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', background: 'white', padding: '0 8px' }}>
                    <button className="btn-icon" onClick={() => deleteRow(rIdx)} style={{ color: '#EF4444' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px', background: '#F8FAFC', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-secondary small" onClick={addTableRow}>
              <Plus size={14}/> Add Row
            </button>
            <button className="btn btn-secondary small" onClick={deleteTable} style={{ color: '#EF4444' }}>
              <Trash2 size={14}/> Delete Table
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ProtocolSections = () => {
  const { 
    data, updateNestedField, addMainSection, deleteSection, addSubsection, deleteSubsection,
    activeSectionId, setActiveSectionId, activeSubIndex, setActiveSubIndex, openModal, setActiveTab
  } = useProtocol();

  const [view, setView] = useState('grid');
  const [expandedSubs, setExpandedSubs] = useState({});
  const [editingTitle, setEditingTitle] = useState(null); // { type: 'section'|'sub', id, subIdx? }
  const [tempTitle, setTempTitle] = useState('');

  // Effect to handle navigation from Table of Contents
  React.useEffect(() => {
    if (activeSectionId) {
      setView('editor');
    }
  }, [activeSectionId]);

  // Modal states
  const [addSubTargetId, setAddSubTargetId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
  const [insertRef, setInsertRef] = useState(null); // { id, subIdx, name } - which sub to insert relative to
  const [insertPosition, setInsertPosition] = useState('below'); // 'above' | 'below'

  // Image Modal states
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imageCaption, setImageCaption] = useState('');
  const [imageDescription, setImageDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const textareaRef = useRef(null);
  const sections = data.sections || {};
  const activeSection = sections[activeSectionId];

  const openEditor = (id, subIdx = null) => {
    const section = sections[id];
    const sub = subIdx !== null ? section?.subsections?.[subIdx] : null;
    const title = (sub ? sub.title : section?.title) || '';
    if (title.toLowerCase().includes('investigator signature') || title.toLowerCase().includes('signature of investigator')) {
      setActiveTab('approval');
      return;
    }
    setActiveSectionId(id); 
    setActiveSubIndex(subIdx); 
    setView('editor'); 
  };
  const backToGrid = () => { setView('grid'); setActiveSectionId(null); setActiveSubIndex(null); };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (textareaRef.current) {
      const html = textareaRef.current.innerHTML;
      updateContent(html);
    }
  };

  const updateContent = (newHtml) => {
    const isMain = activeSubIndex === null;
    if (isMain) updateNestedField(['sections', activeSectionId, 'main'], newHtml);
    else {
      const subs = [...(activeSection.subsections || [])];
      subs[activeSubIndex].content = newHtml;
      updateNestedField(['sections', activeSectionId, 'subsections'], subs);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFiles || imageFiles.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setIsUploading(true);
    let finalHtml = '';

    try {
      for (let file of imageFiles) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:8000/api/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        const result = await response.json();
        const imageUrl = `http://localhost:8000${result.url}`;
        
        finalHtml += `<div style="text-align: center; margin: 20px 0;">
          <img src="${imageUrl}" alt="${imageCaption}" style="max-width: 100%; border-radius: 8px;" />
          ${imageCaption ? `<div style="font-weight: bold; margin-top: 8px;">${imageCaption}</div>` : ''}
          ${imageDescription ? `<div style="font-size: 0.9em; color: #666;">${imageDescription}</div>` : ''}
        </div><p><br></p>`;
      }
      
      execCommand('insertHTML', finalHtml);
      
      toast.success('Images inserted');
      setImageModalOpen(false);
      setImageFiles([]);
      setImageCaption('');
      setImageDescription('');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };



  const handleTitleRename = (type, id, subIdx, newName) => {
    if (!newName.trim()) return;
    if (type === 'section') {
      updateNestedField(['sections', id, 'title'], newName.trim());
    } else {
      const subs = [...(sections[id].subsections || [])];
      subs[subIdx].title = newName.trim();
      updateNestedField(['sections', id, 'subsections'], subs);
    }
    setEditingTitle(null);
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
          onClick={() => { 
            openModal({
              type: 'input',
              title: 'Add New Section',
              message: 'Enter the title for the new section.',
              onConfirm: (val) => {
                if (val.trim()) {
                  addMainSection(val.trim());
                  toast.success('Section created');
                }
              }
            });
          }}>
          <Plus size={18} /> New Section
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(sections)
          .filter(([id]) => id !== '0' && !isNaN(parseInt(id)))  // Only display properly numbered sections
          .sort(([a],[b]) => parseInt(a) - parseInt(b))
          .map(([id, section]) => {
          const Icon = SECTION_ICONS[id] || ClipboardList;
          const isExp = expandedSubs[id];
          const subs = section.subsections || [];

          let tempCounters = [id];
          const computedNums = subs.map(sub => {
            let d = sub.depth || 1;
            while (tempCounters.length <= d) tempCounters.push(0);
            tempCounters[d] = (tempCounters[d] || 0) + 1;
            tempCounters.length = d + 1;
            return tempCounters.join('.');
          });

          return (
            <motion.div key={id} className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: 0 }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: parseInt(id) * 0.03 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '18px 24px', gap: '14px', cursor: 'pointer' }} className="hover-card" onClick={() => openEditor(id)}>
                <div style={{ background: 'var(--light-lime)', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-lime)', flexShrink: 0 }}>
                  <Icon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  {editingTitle?.type === 'section' && editingTitle?.id === id ? (
                    <input 
                      autoFocus
                      className="form-input" 
                      style={{ padding: '4px 8px', fontSize: '1rem', fontWeight: 800, width: '100%', marginBottom: '4px' }}
                      value={tempTitle}
                      onChange={e => setTempTitle(e.target.value)}
                      onBlur={() => handleTitleRename('section', id, null, tempTitle)}
                      onKeyDown={e => e.key === 'Enter' && handleTitleRename('section', id, null, tempTitle)}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <h3 
                      style={{ fontSize: '1rem', fontWeight: 800, cursor: 'text' }}
                      onClick={e => { e.stopPropagation(); setEditingTitle({ type: 'section', id }); setTempTitle(section.title); }}
                    >
                      {id}. {section.title}
                    </h3>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subs.length} subsection{subs.length !== 1 ? 's' : ''} · {(section.main || '').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(x=>x).length} words</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button className="btn-icon" title="Add subsection" onClick={e => { 
                    e.stopPropagation(); 
                    openModal({
                      type: 'input',
                      title: 'Add Subsection',
                      message: `Enter title for the new subsection in "${section.title}"`,
                      onConfirm: (val) => {
                        if (val.trim()) {
                          addSubsection(id, val.trim());
                          toast.success('Subsection added');
                        }
                      }
                    });
                  }}><Plus size={16} /></button>
                  {subs.length > 0 && <button className="btn-icon" onClick={e => { e.stopPropagation(); setExpandedSubs(p => ({...p, [id]: !p[id]})); }}>{isExp ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}</button>}
                  <button 
                    className="btn-icon" 
                    title="Delete" 
                    onClick={e => { 
                      e.stopPropagation(); 
                      openModal({
                        title: `Delete "${section.title}"?`,
                        message: 'Are you sure you want to delete this section and all its contents? This action is irreversible.',
                        icon: 'trash',
                        onConfirm: () => {
                          deleteSection(id);
                          if (activeSectionId === id) backToGrid();
                          toast.success(`"${section.title}" deleted`);
                        }
                      });
                    }}
                  >
                    <Trash2 size={14} color="#EF4444"/>
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {isExp && subs.length > 0 && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden', background: 'var(--bg-gray)', borderTop: '1px solid var(--border-color)' }}>
                    {subs.map((sub, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', padding: '12px 24px 12px 80px', gap: '12px', cursor: 'pointer', borderBottom: '1px solid var(--border-color)' }} className="hover-card" onClick={() => openEditor(id, idx)}>
                        {editingTitle?.type === 'sub' && editingTitle?.id === id && editingTitle?.subIdx === idx ? (
                          <input 
                            autoFocus
                            className="form-input"
                            style={{ padding: '2px 8px', fontSize: '0.85rem', fontWeight: 500, flex: 1 }}
                            value={tempTitle}
                            onChange={e => setTempTitle(e.target.value)}
                            onBlur={() => handleTitleRename('sub', id, idx, tempTitle)}
                            onKeyDown={e => e.key === 'Enter' && handleTitleRename('sub', id, idx, tempTitle)}
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span 
                            style={{ 
                              fontSize: sub.depth > 1 ? '0.78rem' : '0.85rem', 
                              flex: 1, 
                              fontWeight: sub.depth > 1 ? 400 : 500, 
                              cursor: 'text',
                              marginLeft: `${(sub.depth ? sub.depth - 1 : 0) * 24}px`,
                              color: sub.depth > 1 ? 'var(--text-muted)' : 'var(--text-main)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onClick={e => { e.stopPropagation(); setEditingTitle({ type: 'sub', id, subIdx: idx }); setTempTitle(sub.title); }}
                          >
                            <span style={{ 
                              background: sub.depth > 1 ? '#F1F5F9' : 'transparent',
                              padding: sub.depth > 1 ? '2px 6px' : '0',
                              borderRadius: '4px',
                              fontWeight: sub.depth > 1 ? 600 : 500
                            }}>{computedNums[idx]}</span> 
                            {sub.title}
                          </span>
                        )}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(sub.content||'').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(x=>x).length} words</span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                          <button 
                            className="btn-icon" 
                            title="Decrease indent (promote)" 
                            onClick={(e) => { 
                              e.stopPropagation();
                              updateNestedField(['sections', id, 'subsections', idx, 'depth'], Math.max(1, (sub.depth || 1) - 1));
                            }}
                            disabled={(sub.depth || 1) <= 1}
                            style={{ opacity: (sub.depth || 1) <= 1 ? 0.3 : 1 }}
                          >
                            <ArrowLeft size={14} color="var(--primary-lime)"/>
                          </button>
                          <button 
                            className="btn-icon" 
                            title="Increase indent (demote)" 
                            onClick={(e) => { 
                              e.stopPropagation();
                              updateNestedField(['sections', id, 'subsections', idx, 'depth'], (sub.depth || 1) + 1);
                            }}
                          >
                            <ArrowRight size={14} color="var(--primary-lime)"/>
                          </button>
                          <button className="btn-icon" title={`Add subsection near ${sub.title}`} onClick={(e) => { 
                            e.stopPropagation();
                            openModal({
                              type: 'input',
                              title: 'Add Subsection',
                              message: `Add a new subsection near "${sub.title}"`,
                              showPositionToggle: true,
                              relativeTo: sub.title,
                              onConfirm: (val, pos) => {
                                if (val.trim()) {
                                  const targetIdx = pos === 'above' ? idx : idx + 1;
                                  addSubsection(id, val.trim(), String(targetIdx));
                                  toast.success('Subsection added');
                                }
                              }
                            });
                          }}>
                            <Plus size={14} color="var(--primary-lime)"/>
                          </button>
                          <button 
                            className="btn-icon" 
                            title={`Delete ${sub.title}`} 
                            onClick={(e) => { 
                              e.stopPropagation();
                              openModal({
                                title: `Delete "${sub.title}"?`,
                                message: 'Are you sure you want to delete this subsection? This action is irreversible.',
                                icon: 'trash',
                                onConfirm: () => {
                                  deleteSubsection(id, idx);
                                  if (activeSubIndex === idx) setActiveSubIndex(null);
                                  toast.success(`"${sub.title}" deleted`);
                                }
                              });
                            }}
                          >
                            <Trash2 size={14} color="#EF4444"/>
                          </button>
                        </div>
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
    const activeSub = activeSection.subsections?.[activeSubIndex];
    const title = isMain ? activeSection.title : activeSub?.title;
    const content = isMain ? activeSection.main : activeSub?.content;
    const subs = activeSection.subsections || [];

    // Helper for computing dynamic hierarchy numbering
    const getSubNumber = (sId, index) => {
      const sec = sections[sId];
      if (!sec || !sec.subsections) return '';
      let counters = [sId];
      let result = '';
      for(let i = 0; i <= index; i++) {
          let d = sec.subsections[i]?.depth || 1;
          while(counters.length <= d) counters.push(0);
          counters[d] = (counters[d] || 0) + 1;
          counters.length = d + 1;
          result = counters.join('.');
      }
      return result;
    };

    const label = isMain ? `Section ${activeSectionId}` : `Subsection ${getSubNumber(activeSectionId, activeSubIndex)}`;
    const sectionIds = Object.keys(sections).sort((a,b) => parseInt(a) - parseInt(b));
    const currentSectionOrderIndex = sectionIds.indexOf(activeSectionId);
    
    // Determine Prev Navigation
    let prevNav = null;
    if (activeSubIndex !== null && activeSubIndex > 0) {
      const prevSub = subs[activeSubIndex - 1];
      prevNav = { type: 'sub', id: activeSectionId, subIdx: activeSubIndex - 1, label: `${getSubNumber(activeSectionId, activeSubIndex - 1)} ${prevSub.title}` };
    } else if (activeSubIndex === 0) {
      prevNav = { type: 'section', id: activeSectionId, subIdx: null, label: `${activeSection.title} (Main)` };
    } else if (currentSectionOrderIndex > 0) {
      const prevId = sectionIds[currentSectionOrderIndex - 1];
      const prevSec = sections[prevId];
      const prevSubs = prevSec.subsections || [];
      if (prevSubs.length > 0) {
        const lastSubIdx = prevSubs.length - 1;
        prevNav = { type: 'sub', id: prevId, subIdx: lastSubIdx, label: `${getSubNumber(prevId, lastSubIdx)} ${prevSubs[lastSubIdx].title}` };
      } else {
        prevNav = { type: 'section', id: prevId, subIdx: null, label: `${prevId}. ${prevSec.title}` };
      }
    } else {
      prevNav = { type: 'grid', label: 'All Sections' };
    }

    // Determine Next Navigation
    let nextNav = null;
    if (activeSubIndex === null && subs.length > 0) {
      nextNav = { type: 'sub', id: activeSectionId, subIdx: 0, label: `${getSubNumber(activeSectionId, 0)} ${subs[0].title}` };
    } else if (activeSubIndex !== null && activeSubIndex < subs.length - 1) {
      const nextSub = subs[activeSubIndex + 1];
      nextNav = { type: 'sub', id: activeSectionId, subIdx: activeSubIndex + 1, label: `${getSubNumber(activeSectionId, activeSubIndex + 1)} ${nextSub.title}` };
    } else if (currentSectionOrderIndex >= 0 && currentSectionOrderIndex < sectionIds.length - 1) {
      const nextId = sectionIds[currentSectionOrderIndex + 1];
      nextNav = { type: 'section', id: nextId, subIdx: null, label: `${nextId}. ${sections[nextId].title}` };
    }

    const handleNav = (nav) => {
      if (nav.type === 'grid') backToGrid();
      else openEditor(nav.id, nav.subIdx);
    };

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column' }}>
        
        {/* ── Breadcrumb Navigation Bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '10px 16px', background: 'var(--white)', borderRadius: '14px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <button 
            className="btn btn-secondary"
            style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '0.82rem', gap: '6px' }}
            onClick={backToGrid}
          >
            <ArrowLeft size={14} /> All Sections
          </button>
          <span style={{ color: 'var(--border-color)', fontSize: '1rem', fontWeight: 300 }}>/</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>{activeSection.title}</span>
          {!isMain && (
            <>
              <span style={{ color: 'var(--border-color)', fontSize: '1rem', fontWeight: 300 }}>/</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--primary-lime)', fontWeight: 700 }}>{title}</span>
            </>
          )}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, background: 'var(--bg-gray)', padding: '4px 10px', borderRadius: '8px' }}>{label}</span>
        </div>

        {/* ── Section Title ── */}
        <div style={{ marginBottom: '24px' }}>
          <input 
            value={title || ''}
            onChange={e => handleTitleRename(isMain ? 'section' : 'sub', activeSectionId, activeSubIndex, e.target.value)}
            style={{ 
              fontSize: '1.8rem', 
              fontWeight: 900, 
              width: '100%', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: '2px solid transparent',
              padding: '4px 0',
              color: 'var(--text-main)',
              outline: 'none',
              fontFamily: 'Outfit, sans-serif',
              transition: 'border-color 0.2s'
            }}
            onFocus={e => e.target.style.borderBottomColor = 'var(--primary-lime)'}
            onBlur={e => e.target.style.borderBottomColor = 'transparent'}
            placeholder="Enter title..."
          />
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


        {/* ── Content Area - no inner scroll ── */}
        <div>
          {(title?.toLowerCase().includes('synopsis') || title?.toLowerCase().includes('protocol summary')) ? (
             <SynopsisStructuredEditor 
               content={content} 
               onChange={(val) => {
                 updateContent(val);
               }} 
             />
          ) : (title?.toLowerCase().includes('abbreviation') || (activeSectionId === '10' && activeSubIndex === 14)) ? (
             <CustomTabulation activeSectionId={activeSectionId} activeSubIndex={activeSubIndex} defaultHeaders={['Abbreviation', 'Full Form']} defaultRowsCount={2} />
          ) : (
            <>
              {/* Toolbar */}
              <div style={{ background: 'var(--bg-gray)', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', padding: '10px 20px', display: 'flex', gap: '6px', alignItems: 'center', border: '1px solid var(--border-color)', borderBottom: 'none' }}>
                <button className="btn-icon" title="Bold" onClick={() => execCommand('bold')}><Bold size={15}/></button>
                <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                <button className="btn-icon" title="Bullet List" onClick={() => execCommand('insertUnorderedList')}><List size={15}/></button>
                <button className="btn-icon" title="Numbered List" onClick={() => execCommand('insertOrderedList')}><ListOrdered size={15}/></button>
                <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 4px' }}></div>
                <button className="btn-icon" title="Insert Image" onClick={() => setImageModalOpen(true)}><ImageIcon size={15}/></button>
                <div style={{ flex: 1 }}></div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{(content||'').replace(/<[^>]*>/g, ' ').split(/\s+/).filter(x=>x).length} words</span>
              </div>

              {/* WYSIWYG Editor - overflow:visible so outer scroll handles it */}
              <div 
                ref={textareaRef} 
                contentEditable 
                className="form-textarea"
                onInput={e => updateContent(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: content || '' }}
                style={{ 
                  width: '100%', 
                  minHeight: '320px', 
                  fontSize: '0.95rem', 
                  lineHeight: '1.8', 
                  background: 'white', 
                  border: '1px solid var(--border-color)', 
                  borderTop: 'none', 
                  borderBottomLeftRadius: '16px', 
                  borderBottomRightRadius: '16px', 
                  padding: '28px 32px', 
                  overflowY: 'visible',
                  overflowX: 'hidden',
                  color: 'var(--text-main)', 
                  fontFamily: 'Inter, sans-serif',
                  outline: 'none'
                }}
              />

              {/* Attachments */}
              <div style={{ marginTop: '24px', padding: '24px', background: 'white', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <ImageIcon size={18} color="var(--primary-lime)" />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800 }}>Attachments</h4>
                </div>
                <div 
                  className="hover-card"
                  style={{ border: '2px dashed var(--border-color)', borderRadius: '14px', padding: '24px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', cursor: 'pointer' }} 
                  onClick={() => setImageModalOpen(true)}
                >
                  <UploadCloud size={24} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <strong>Drag &amp; drop</strong> images here, or <span style={{ color: 'var(--primary-lime)', fontWeight: 600 }}>browse files</span>
                  </span>
                </div>
              </div>

              {/* Schedule of Activities UI */}
              {(title?.toLowerCase().includes('schedule of activities') || title?.toLowerCase().includes('time and events') || title?.toLowerCase().includes('trial procedures') || title?.toLowerCase().includes('assessments and procedures') || title?.toLowerCase().includes('schedule of events')) && (
                <div style={{ marginTop: '24px' }}>
                  <ScheduleOfActivities />
                </div>
              )}

              {/* Custom Tabulation for specific subsections */}
              {((activeSectionId === '9' && activeSubIndex === 11) || 
                (activeSectionId === '10' && activeSubIndex === 15)) && (
                <CustomTabulation activeSectionId={activeSectionId} activeSubIndex={activeSubIndex} />
              )}
            </>
          )}

          {/* ── Editor Footer Actions ── */}
          <div className="nav-footer">
            {prevNav ? (
              <button 
                className="btn btn-secondary nav-btn nav-btn-prev" 
                onClick={() => handleNav(prevNav)}
                title={prevNav.label}
              >
                <ArrowLeft size={16} style={{ flexShrink: 0 }} /> 
                <span className="nav-btn-label">{prevNav.label}</span>
              </button>
            ) : <div className="nav-btn-placeholder" />}

            <div className="nav-btn-add-container">
              <button 
                className="btn nav-btn nav-btn-add" 
                onClick={() => { 
                  openModal({
                    type: 'input',
                    title: 'Add Subsection',
                    message: `Add a new subsection relative to "${currentSub.title || 'current section'}"`,
                    showPositionToggle: true,
                    relativeTo: currentSub.title || 'this subsection',
                    onConfirm: (val, pos) => {
                      if (val.trim()) {
                        const targetIdx = pos === 'above' ? activeSubIndex : activeSubIndex + 1;
                        addSubsection(activeSectionId, val.trim(), String(targetIdx));
                        toast.success('Subsection added');
                      }
                    }
                  });
                }}
              >
                <Plus size={16} style={{ flexShrink: 0 }} /> 
                <span className="nav-btn-label">Add Subsection</span>
              </button>
            </div>

            {nextNav ? (
              <button 
                className="btn btn-primary nav-btn nav-btn-next" 
                onClick={() => handleNav(nextNav)}
                title={nextNav.label}
              >
                <span className="nav-btn-label">{nextNav.label}</span>
                <ChevronRight size={16} style={{ flexShrink: 0 }} />
              </button>
            ) : (
              <div className="nav-btn-placeholder" />
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="fade-in" style={{ paddingBottom: '60px' }}>
      <AnimatePresence mode="wait">
        {view === 'grid' ? <div key="grid">{renderGrid()}</div> : <div key="editor" style={{ height: '100%' }}>{renderEditor()}</div>}
      </AnimatePresence>



      {/* ── Delete Confirmation Modal ── */}


      {/* ── Image Upload Modal ── */}
      <AnimatePresence>
        {imageModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(4, 47, 46, 0.45)', backdropFilter: 'blur(8px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => !isUploading && setImageModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{ background: 'white', padding: '32px', borderRadius: '24px', maxWidth: '440px', width: '100%', borderTop: '5px solid #10B981', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ marginBottom: '6px', fontWeight: 800, fontSize: '1.2rem' }}>Insert Image</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Upload an image with caption and description.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>IMAGE FILE(S)</label>
                  <input type="file" multiple accept="image/*" style={{ width: '100%' }} onChange={e => setImageFiles(Array.from(e.target.files))} />
                  {imageFiles.length > 0 && <div style={{marginTop:'8px',fontSize:'0.85rem',color:'var(--primary-lime)'}}>{imageFiles.length} file(s) selected</div>}
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>CAPTION</label>
                  <input className="form-input" placeholder="e.g. Figure 1: Flowchart" value={imageCaption} onChange={e => setImageCaption(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>DESCRIPTION</label>
                  <textarea className="form-textarea" style={{ minHeight: '80px', padding: '12px' }} placeholder="Optional SEO description or alt text" value={imageDescription} onChange={e => setImageDescription(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, borderRadius: '14px' }} 
                  onClick={handleImageUpload}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Insert into Editor'}
                </button>
                <button className="btn btn-secondary" style={{ flex: 1, borderRadius: '14px' }} onClick={() => setImageModalOpen(false)} disabled={isUploading}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProtocolSections;
