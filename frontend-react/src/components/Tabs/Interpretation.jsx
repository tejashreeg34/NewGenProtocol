import React, { useMemo, useState } from 'react';
import { useProtocol } from '../../context/ProtocolContext';
import { Database, FileText, Table as TableIcon, LayoutList, Image as ImageIcon } from 'lucide-react';


// ─────────────────────────────────────────────────────────────────
// Inline TOC tree for the Interpretation page (read-only)
// ─────────────────────────────────────────────────────────────────
const TocReadOnlyNode = ({ node, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : '20px' }}>
      <div
        onClick={hasChildren ? () => setIsOpen(o => !o) : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: depth === 0 ? '10px 0' : '6px 0',
          borderBottom: depth === 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
          cursor: hasChildren ? 'pointer' : 'default',
        }}
      >
        {hasChildren ? (
          <span style={{ color: '#94A3B8', flexShrink: 0 }}>
            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
        ) : (
          <span style={{ width: '13px', flexShrink: 0 }} />
        )}

        {node.number && (
          <span style={{
            fontSize: '0.72rem', fontWeight: 800,
            color: depth === 0 ? '#1A5632' : '#94A3B8',
            background: depth === 0 ? '#DCFCE7' : '#F1F5F9',
            padding: '2px 7px', borderRadius: '5px',
            flexShrink: 0, minWidth: '28px', textAlign: 'center',
          }}>
            {node.number}
          </span>
        )}

        <span style={{
          flex: 1,
          fontSize: depth === 0 ? '0.92rem' : '0.83rem',
          fontWeight: depth === 0 ? 700 : 400,
          color: depth === 0 ? 'var(--text-main)' : 'var(--text-muted)',
        }}>
          {node.title}
        </span>

        {node.page && (
          <span style={{
            fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600,
            background: '#F8FAFC', padding: '2px 8px', borderRadius: '5px', flexShrink: 0,
          }}>
            p.{node.page}
          </span>
        )}
      </div>

      {hasChildren && isOpen && (
        <div style={{ borderLeft: '2px solid #E2E8F0', paddingLeft: '8px', marginTop: '2px', marginBottom: '4px' }}>
          {node.children.map((child, idx) => (
            <TocReadOnlyNode key={idx} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
const Interpretation = () => {
  const { data } = useProtocol();

  // 1. Manually construct required fields from Context Data
  const customFields = useMemo(() => {
    const list = [
      { field_name: 'Protocol Title', field_value: data.protocol_title },
      { field_name: 'Protocol Number', field_value: data.protocol_number },
      { field_name: 'Protocol Name', field_value: data.approval_data?.details?.protocol_name || data.protocol_title },
      { field_name: 'Phase', field_value: data.approval_data?.details?.clinical_phase || data.synopsis_data?.overview?.clinical_phase },
      { field_name: 'Number of Patients', field_value: data.synopsis_data?.num_patients },
      { field_name: 'Study Endpoints - Primary', field_value: data.synopsis_data?.endpoints?.primary?.join('\n') },
      { field_name: 'Study Endpoints - Secondary', field_value: data.synopsis_data?.endpoints?.secondary?.join('\n') },
      { field_name: 'Inclusion Criteria', field_value: data.synopsis_data?.inclusion?.points?.join('\n') || data.synopsis_data?.inclusion?.text },
      { field_name: 'Exclusion Criteria', field_value: data.synopsis_data?.exclusion?.points?.join('\n') || data.synopsis_data?.exclusion?.text },
    ];
    
    // Abbreviations extraction (if entered in CustomTabulation of 10.15)
    const abbrevTable = data.sections['10']?.subsections?.[14]?.customTable;
    let abbrevText = '';
    if (abbrevTable && abbrevTable.rows?.length > 0) {
      abbrevText = abbrevTable.rows.map(r => `${r[0]}: ${r[1]}`).filter(x => x && x.trim() !== ': ').join('\n');
    }
    list.push({ field_name: 'Abbreviations', field_value: abbrevText });

    return list;
  }, [data]);

  // 2. Schedule of Activities — fix: use .length directly (rows is an array)
  const soa_table = data.soa_data?.table;
  const hasSoaTable = soa_table?.headers?.length > 0 && soa_table?.rows?.length > 0;

  // 3. TOC tree
  const tocTree = data.sections?.['0']?.toc_tree;
  const hasTocTree = Array.isArray(tocTree) && tocTree.length > 0;

  // 4. Extract Tables (Images with Captions AND Custom Tabulations)
  const extractedTables = useMemo(() => {
    const tables = [];
    
    // Regex for HTML images
    const imgRegex = /<img\s+src="([^"]+)"\s+alt="([^"]+)"/g;
    const parseContent = (html, sectionTitle) => {
      if (!html) return;
      let match;
      while ((match = imgRegex.exec(html)) !== null) {
        if (match[2] && match[2].trim() !== '') {
          tables.push({ type: 'image', url: match[1], caption: match[2], sectionTitle });
        }
      }
    };

    Object.keys(data.sections || {}).forEach(secId => {
      const sec = data.sections[secId];
      if (sec.main) parseContent(sec.main, sec.title);
      
      if (sec.subsections) {
        sec.subsections.forEach(sub => {
          if (sub.content) parseContent(sub.content, `${sec.title} > ${sub.title}`);
          
          if (sub.customTable) {
             tables.push({
                type: 'table',
                caption: `${sec.title} > ${sub.title} Table`,
                sectionTitle: `${sec.title} > ${sub.title}`,
                headers: sub.customTable.headers,
                rows: sub.customTable.rows
             });
          }
        });
      }
    });

    return tables;
  }, [data.sections]);

  return (
    <div className="fade-in" style={{ paddingBottom: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ color: 'var(--primary-lime)', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>EXTRACTED DATA</span>
        </div>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Final Interpretation</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '4px' }}>A consolidated view of all critical fields, generated tables, and attached references.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* 1. Protocol Standard Fields */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <div style={{ padding: '20px 32px', background: 'var(--bg-gray)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
             <LayoutList size={20} color="var(--primary-lime)" />
             <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Protocol Fields</h3>
          </div>
          <div style={{ padding: '0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {customFields.length === 0 ? (
                  <tr>
                    <td style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No standard fields populated yet.</td>
                  </tr>
                ) : customFields.map((f, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '20px 32px', width: '30%', verticalAlign: 'top', background: '#F8FAFC', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.field_name}</span>
                    </td>
                    <td style={{ padding: '20px 32px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: '1rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                         {f.field_value || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>No data entered yet.</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Schedule of Activities Table */}
        {hasSoaTable && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '20px 32px', background: 'var(--bg-gray)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <TableIcon size={20} color="#3182CE" />
               <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Schedule of Activities</h3>
               <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#3182CE', background: '#EBF8FF', padding: '3px 10px', borderRadius: '8px', fontWeight: 700 }}>
                 {soa_table.rows.length} procedures × {soa_table.headers.length - 1} visits
               </span>
            </div>
            <div style={{ padding: '24px 32px', overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    {soa_table.headers.map((h, i) => (
                      <th key={i} style={{
                        padding: '10px 12px',
                        background: i === 0 ? '#F8FAFC' : '#EBF8FF',
                        border: '1px solid var(--border-color)',
                        textAlign: i === 0 ? 'left' : 'center',
                        minWidth: i === 0 ? '200px' : '80px',
                        fontSize: i === 0 ? '0.85rem' : '0.78rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: i === 0 ? 'var(--text-main)' : '#2B6CB0',
                      }}>
                        {i === 0 ? 'Assessment / Procedure' : h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {soa_table.rows.map((rowArr, rIdx) => {
                    const rowName = rowArr[0];
                    const checks = rowArr.slice(1).map(v => v === '1');
                    const hasAnyCheck = checks.some(c => c);
                    if (!hasAnyCheck && (!rowName || rowName.trim() === '')) return null;
                    return (
                      <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                        <td style={{ padding: '10px 12px', border: '1px solid var(--border-color)', fontSize: '0.88rem', fontWeight: rowName && !hasAnyCheck ? 700 : 500, color: 'var(--text-main)' }}>
                          {rowName}
                        </td>
                        {checks.map((isChecked, cIdx) => (
                          <td key={cIdx} style={{
                            padding: '10px 12px',
                            border: '1px solid var(--border-color)',
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            color: isChecked ? '#22C55E' : 'transparent',
                            background: isChecked ? '#F0FDF4' : 'inherit',
                          }}>
                            {isChecked ? '✓' : '—'}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Uploaded Images & Custom Tables */}
        {extractedTables.length > 0 && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ padding: '20px 32px', background: 'var(--bg-gray)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <ImageIcon size={20} color="#F6AD55" />
               <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>Detected Tables & Attachments</h3>
            </div>
            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {extractedTables.map((tbl, idx) => (
                <div key={idx} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 24px', background: 'var(--bg-gray)', borderBottom: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>{tbl.caption}</h4>
                    {tbl.sectionTitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Section: {tbl.sectionTitle}</div>}
                  </div>
                  <div style={{ padding: '24px', overflowX: 'auto' }}>
                    {tbl.type === 'image' ? (
                       <div style={{ textAlign: 'center' }}>
                         <img src={tbl.url} alt={tbl.caption} style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                       </div>
                    ) : (
                       <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                         <thead>
                           <tr>
                             {tbl.headers.map((h, hIdx) => (
                               <th key={hIdx} style={{ padding: '12px', background: '#F8FAFC', border: '1px solid var(--border-color)', textAlign: 'left', fontSize: '0.85rem' }}>{h}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody>
                           {tbl.rows.map((rowItems, rIdx) => (
                             <tr key={rIdx}>
                               {rowItems.map((cell, cIdx) => (
                                 <td key={cIdx} style={{ padding: '12px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>{cell}</td>
                               ))}
                             </tr>
                           ))}
                         </tbody>
                       </table>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default Interpretation;
