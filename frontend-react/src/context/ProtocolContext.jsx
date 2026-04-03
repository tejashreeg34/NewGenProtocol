import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const defaultProtocolData = {
  protocol_title: '',
  protocol_number: '',
  nct_number: '',
  principal_investigator: '',
  sponsor: '',
  funded_by: '',
  version_number: 'v1.0',
  protocol_date: new Date().toISOString().split('T')[0],
  sections: {}, 
  synopsis: {},
  schema_data: { images: [] },
  approval_data: {
    details: {
      protocol_name: '', protocol_number: '', imp: '', indication: '', clinical_phase: '',
      investigators: '', coordinating_investigator: '', expert_committee: '', sponsor_name_address: '',
      gcp_statement: '', approval_statement: ''
    },
    sponsor_reps: [],
    cro_reps: [],
    investigator_agreement: {
      description: '', signature: null, name: '', title: '', facility: '', city: '', state: '', date: ''
    },
    amendments: []
  },
  synopsis_data: {
    overview: {
      title: '', coordinating_investigator: '', expert_committee: '', investigators: '',
      trial_sites: '', planned_period: '', fpfv: '', lplv: '', clinical_phase: ''
    },
    objectives: { primary: [], secondary: [], exploratory: [] },
    endpoints: { primary: [], secondary: [], exploratory: [] },
    flowcharts: [], num_patients: '',
    inclusion: { text: '', points: [] }, exclusion: { text: '', points: [] },
    team: { investigator_desc: '', coordinator_desc: '' },
    tables: [], statistical_methods: ''
  },
  section3: {
    description: "",
    image: { url: null, caption: "", description: "" },
    table: { headers: ["Type", "Objectives", "Endpoints"], rows: [] }
  },
  soa_data: {
    table: {
      headers: ["Screening", "Enrollment/Baseline", "Visit 1", "Visit 2", "Visit 3", "Visit 4", "Visit 5", "Visit 6", "Visit 7", "Visit 8", "Visit 9", "Visit 10", "Visit 11", "Visit 12", "Final Visit"],
      rows: {
        "Informed consent": Array(15).fill(false),
        "Demographics": Array(15).fill(false),
        "Medical history": Array(15).fill(false),
        "Randomization": Array(15).fill(false),
        "Administer study intervention": Array(15).fill(false),
        "Concomitant medication review": Array(15).fill(false),
        "Physical exam": Array(15).fill(false),
        "Vital signs": Array(15).fill(false),
        "Height": Array(15).fill(false),
        "Weight": Array(15).fill(false),
        "Performance status": Array(15).fill(false),
        "Hematology": Array(15).fill(false),
        "Serum chemistry": Array(15).fill(false),
        "Pregnancy test": Array(15).fill(false),
        "EKG": Array(15).fill(false),
        "Adverse event review": Array(15).fill(false),
        "Radiologic/Imaging": Array(15).fill(false),
        "Other assessments": Array(15).fill(false),
        "Complete CRFs": Array(15).fill(false)
      }
    }
  },
  objectives_endpoints: [],
  abbreviations: [],
  amendment_history: [],
  appendices: []
};

const ProtocolContext = createContext();

export const useProtocol = () => useContext(ProtocolContext);

export const ProtocolProvider = ({ children }) => {
  const [data, setData] = useState(defaultProtocolData);
  const [currentId, setCurrentId] = useState(null);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/template-structure`);
        const structure = response.data;
        
        setData(prev => {
          const newSections = { ...prev.sections };
          structure.sections.forEach(sec => {
            if (!newSections[sec.id]) {
              newSections[sec.id] = {
                title: sec.title,
                main: '',
                notes: '',
                subsections: (sec.subsections || []).map(sub => ({
                  title: typeof sub === 'string' ? sub : sub.title,
                  content: ''
                }))
              };
            }
          });
          return { ...prev, sections: newSections };
        });
      } catch (error) {
        console.error('Error fetching template structure:', error);
      }
    };

    fetchTemplate();
  }, []);

  const updateField = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (path, value) => {
    setData(prev => {
      const clone = JSON.parse(JSON.stringify(prev));
      let current = clone;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return clone;
    });
  };

  const addMainSection = (title) => {
    setData(prev => {
      const sections = { ...prev.sections };
      const nextId = (Object.keys(sections).length + 1).toString();
      sections[nextId] = { title, main: '', subsections: [] };
      return { ...prev, sections };
    });
  };

  const deleteSection = (id) => {
    setData(prev => {
      const sections = { ...prev.sections };
      delete sections[id];
      // Re-index remaining sections to maintain 1, 2, 3...
      const newSections = {};
      Object.entries(sections)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([_, val], idx) => {
          newSections[(idx + 1).toString()] = val;
        });
      return { ...prev, sections: newSections };
    });
  };

  const addSubsection = (sectionId, title = 'New Subsection') => {
    setData(prev => {
      const sections = { ...prev.sections };
      if (sections[sectionId]) {
        sections[sectionId].subsections = [
          ...(sections[sectionId].subsections || []),
          { title, content: '' }
        ];
      }
      return { ...prev, sections };
    });
  };

  const deleteSubsection = (sectionId, subIndex) => {
    setData(prev => {
      const sections = { ...prev.sections };
      if (sections[sectionId] && sections[sectionId].subsections) {
        sections[sectionId].subsections = sections[sectionId].subsections.filter((_, i) => i !== subIndex);
      }
      return { ...prev, sections };
    });
  };

  return (
    <ProtocolContext.Provider value={{ 
      data, 
      setData, 
      currentId, 
      setCurrentId, 
      updateField, 
      updateNestedField,
      addMainSection,
      deleteSection,
      addSubsection,
      deleteSubsection
    }}>
      {children}
    </ProtocolContext.Provider>
  );
};
