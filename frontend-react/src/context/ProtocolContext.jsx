import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

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
  
  // Navigation state for global access (e.g. from TOC)
  const [activeTab, setActiveTab] = useState('title-page');
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [activeSubIndex, setActiveSubIndex] = useState(null);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('protocol_auth') === 'true';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('protocol_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (username, password) => {
    try {
      const response = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUser(data.user);
        localStorage.setItem('protocol_auth', 'true');
        localStorage.setItem('protocol_user', JSON.stringify(data.user));
        toast.success(`Welcome back, ${data.user.full_name || username}`);
        return true;
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Login failed');
        return false;
      }
    } catch (err) {
      toast.error('Could not connect to server');
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('protocol_auth');
    localStorage.removeItem('protocol_user');
    closeModal();
    toast.success('Logged out successfully');
    // Force a page reload to ensure all state is cleared and user is redirected
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Global Modal state
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'confirm', // 'confirm' | 'input'
    title: '',
    message: '',
    inputValue: '',
    icon: 'help',
    showPositionToggle: false,
    relativeTo: '',
    position: 'below', // 'above' | 'below'
    onConfirm: () => {},
    onCancel: () => {}
  });

  const openModal = (config) => {
    setModalConfig({
      isOpen: true,
      type: config.type || 'confirm',
      title: config.title || 'Are you sure?',
      message: config.message || '',
      inputValue: config.inputValue || '',
      icon: config.icon || 'help',
      showPositionToggle: config.showPositionToggle || false,
      relativeTo: config.relativeTo || '',
      position: config.position || 'below',
      onConfirm: config.onConfirm || (() => {}),
      onCancel: config.onCancel || (() => {})
    });
  };

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));
  
  const setModalInputValue = (val) => setModalConfig(prev => ({ ...prev, inputValue: val }));

  const setModalPosition = (pos) => setModalConfig(prev => ({ ...prev, position: pos }));

  const navigateTo = (tab, sectionId = null, subIndex = null) => {
    setActiveTab(tab);
    setActiveSectionId(sectionId);
    setActiveSubIndex(subIndex);
  };

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

  const addMainSection = (title, position = null) => {
    setData(prev => {
      const sections = { ...prev.sections };
      let newSections = {};
      const currentLength = Object.keys(sections).length;
      
      let targetPos = position ? parseInt(position) : currentLength + 1;
      if (targetPos < 1) targetPos = 1;
      if (targetPos > currentLength + 1) targetPos = currentLength + 1;

      for (let i = 1; i <= currentLength + 1; i++) {
        if (i < targetPos) {
          newSections[i.toString()] = sections[i.toString()];
        } else if (i === targetPos) {
          newSections[i.toString()] = { title, main: '', subsections: [] };
        } else {
          newSections[i.toString()] = sections[(i - 1).toString()];
        }
      }

      return { ...prev, sections: newSections };
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

  const addSubsection = (sectionId, title = 'New Subsection', index = null) => {
    setData(prev => {
      const sections = { ...prev.sections };
      if (sections[sectionId]) {
        // Deep clone the target section and its subsections array to avoid mutation
        const targetSection = { ...sections[sectionId] };
        const subs = [...(targetSection.subsections || [])];
        
        const targetIndex = (index !== null && index !== '') ? parseInt(index) : subs.length;
        
        // Inherit depth from the adjacent item to maintain hierarchy
        let inheritedDepth = 1;
        if (targetIndex > 0 && targetIndex <= subs.length) {
            inheritedDepth = subs[targetIndex - 1]?.depth || 1;
        } else if (subs.length > 0) {
            inheritedDepth = subs[0]?.depth || 1;
        }

        const newSub = { title, content: '', depth: inheritedDepth };
        
        subs.splice(targetIndex, 0, newSub);
        targetSection.subsections = subs;
        sections[sectionId] = targetSection;
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

  const clearSectionData = (tab) => {
    setData(prev => {
      // Deep-clone the entire state so React detects all nested changes
      const fresh = JSON.parse(JSON.stringify(prev));
      switch(tab) {
        case 'title-page':
          fresh.protocol_title = '';
          fresh.protocol_number = '';
          fresh.nct_number = '';
          fresh.principal_investigator = '';
          fresh.sponsor = '';
          fresh.funded_by = '';
          fresh.version_number = 'v1.0';
          fresh.protocol_date = new Date().toISOString().split('T')[0];
          break;
        case 'approval':
          // Deep-clone default to avoid shared references
          fresh.approval_data = JSON.parse(JSON.stringify(defaultProtocolData.approval_data));
          break;
        case 'synopsis':
          fresh.synopsis_data = JSON.parse(JSON.stringify(defaultProtocolData.synopsis_data));
          break;
        case 'sections':
          Object.keys(fresh.sections).forEach(key => {
            fresh.sections[key].main = '';
            fresh.sections[key].notes = '';
            if (fresh.sections[key].subsections) {
              fresh.sections[key].subsections = fresh.sections[key].subsections.map(sub => ({
                ...sub,
                content: '',
                customTable: null
              }));
            }
          });
          break;
        case 'soa':
          fresh.soa_data = JSON.parse(JSON.stringify(defaultProtocolData.soa_data));
          break;
        default:
          break;
      }
      return fresh;
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
      deleteSubsection,
      clearSectionData,
      activeTab,
      setActiveTab,
      activeSectionId,
      setActiveSectionId,
      activeSubIndex,
      setActiveSubIndex,
      navigateTo,
      modalConfig,
      openModal,
      closeModal,
      setModalInputValue,
      setModalPosition,
      isAuthenticated,
      user,
      login,
      logout
    }}>
      {children}
    </ProtocolContext.Provider>
  );
};
