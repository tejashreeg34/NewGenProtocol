const API_BASE_URL = 'http://localhost:8000';

let protocolData = {
    protocol_title: '',
    protocol_number: '',
    nct_number: '',
    principal_investigator: '',
    sponsor: '',
    funded_by: '',
    version_number: 'v1.0',
    protocol_date: new Date().toISOString().split('T')[0],
    sections: {}, // Will use { id: { title, main, notes, subsections: [] } }
    synopsis: {},
    schema_data: { images: [] },
    approval_data: {
        details: {
            protocol_name: '',
            protocol_number: '',
            imp: '',
            indication: '',
            clinical_phase: '',
            investigators: '',
            coordinating_investigator: '',
            expert_committee: '',
            sponsor_name_address: '',
            gcp_statement: '',
            approval_statement: ''
        },
        sponsor_reps: [],
        cro_reps: [],
        investigator_agreement: {
            description: '',
            signature: null,
            name: '',
            title: '',
            facility: '',
            city: '',
            state: '',
            date: ''
        },
        amendments: []
    },
    synopsis_data: {
        overview: {
            title: '',
            coordinating_investigator: '',
            expert_committee: '',
            investigators: '',
            trial_sites: '',
            planned_period: '',
            fpfv: '',
            lplv: '',
            clinical_phase: ''
        },
        objectives: {
            primary: [],
            secondary: [],
            exploratory: []
        },
        endpoints: {
            primary: [],
            secondary: [],
            exploratory: []
        },
        flowcharts: [],
        num_patients: '',
        inclusion: {
            text: '',
            points: []
        },
        exclusion: {
            text: '',
            points: []
        },
        team: {
            investigator_desc: '',
            coordinator_desc: ''
        },
        tables: [],
        statistical_methods: ''
    },
    section3: {
        description: "",
        image: { url: null, caption: "", description: "" },
        table: {
            headers: ["Type", "Objectives", "Endpoints"],
            rows: []
        }
    },
    soa_data: {
        table: {
            headers: [
                "Screening", "Enrollment/Baseline", "Visit 1", "Visit 2", "Visit 3", "Visit 4", "Visit 5", "Visit 6", "Visit 7", "Visit 8", "Visit 9", "Visit 10", "Visit 11", "Visit 12", "Final Visit"
            ],
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

let currentProtocolId = null;
let dashboardCharts = {};

// Modal Logic Variables
let modalCallback = null;
const modal = document.getElementById('inputModal');
const modalInput = document.getElementById('modalInput');
const modalTitle = document.getElementById('modalTitle');
const modalConfirm = document.getElementById('modalConfirm');
const modalCancel = document.getElementById('modalCancel');
const closeModal = document.querySelector('.close-modal');

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('protocolDate').value = protocolData.protocol_date;
    setupModalListeners();
    loadTemplateStructure();
    setupTabs();
    setupFormListeners();
    loadSavedData();
    // Initialize empty dashboard
    setTimeout(() => refreshDashboard(), 1000);
});

function setupModalListeners() {
    modalConfirm.addEventListener('click', () => {
        const value = modalInput.value.trim();
        if (value && modalCallback) {
            modalCallback(value);
            closeInputModal();
        }
    });

    modalCancel.addEventListener('click', closeInputModal);
    closeModal.addEventListener('click', closeInputModal);

    // Allow Enter key
    modalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const value = modalInput.value.trim();
            if (value && modalCallback) {
                modalCallback(value);
                closeInputModal();
            }
        }
    });
}

function openInputModal(title, callback) {
    modalTitle.textContent = title;
    modalInput.value = '';
    modalCallback = callback;
    document.getElementById('inputModal').classList.add('show');
    modalInput.focus();
}

function closeInputModal() {
    document.getElementById('inputModal').classList.remove('show');
    modalCallback = null;
}


function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            if (tabId === 'approval') {
                loadApprovalAgreementEditor();
            } else if (tabId === 'synopsis') {
                loadPatientSynopsisEditor();
            } else if (tabId === 'interpretation') {
                loadInterpretationTab();
            } else if (tabId === 'dashboard') {
                refreshDashboard();
            }
        });
    });
}

function setupFormListeners() {
    const titleInputs = [
        'protocolTitle',
        'protocolNumber',
        'nctNumber',
        'principalInvestigator',
        'sponsor',
        'fundedBy',
        'versionNumber',
        'protocolDate'
    ];

    titleInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', (e) => {
                protocolData[id] = e.target.value;
                updateStatus('Changes saved automatically');
            });
        }
    });
}

async function loadTemplateStructure() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/template-structure`);
        const structure = await response.json();

        // Initialize protocolData.sections if empty
        structure.sections.forEach(sec => {
            if (!protocolData.sections[sec.id]) {
                protocolData.sections[sec.id] = {
                    title: sec.title,
                    main: '',
                    notes: '',
                    // Use array of objects for better structure: { title, content }
                    subsections: []
                };
                if (sec.subsections) {
                    sec.subsections.forEach(sub => {
                        const title = typeof sub === 'string' ? sub : sub.title;
                        protocolData.sections[sec.id].subsections.push({
                            title: title,
                            content: ''
                        });
                    });
                }
            }
        });

        // Don't call populateSectionList here directly if we have saved data coming in sync.
        // But loadSavedData is synchronous and called AFTER this fetch starts but BEFORE checks?
        // Actually fetch is async. loadSavedData runs while fetch is pending.
        // So protocolData is already populated with saved data when we get here.
        // We merged defaults into it.
        // now refresh list.
        refreshSectionList();
    } catch (error) {
        console.error('Error loading template structure:', error);
        showToast('Error loading template structure', 'error');
    }
}

function populateSectionList(sections) {
    const sectionList = document.getElementById('sectionList');
    sectionList.innerHTML = '';

    // Add Table of Contents entry
    const TOCItem = document.createElement('div');
    TOCItem.className = 'section-item main-section toc-item';
    TOCItem.innerHTML = `
        <span><i class="fas fa-list-ol"></i> Table of Contents</span>
    `;
    TOCItem.addEventListener('click', () => {
        document.querySelectorAll('.section-item').forEach(item => item.classList.remove('active'));
        TOCItem.classList.add('active');
        loadTableOfContents();
    });
    sectionList.appendChild(TOCItem);

    sections.forEach(section => {
        const sectionContainer = document.createElement('div');
        sectionContainer.className = 'section-container';

        const sectionItem = document.createElement('div');
        sectionItem.className = 'section-item main-section';
        sectionItem.innerHTML = `
            <span>${section.id}. ${section.title}</span>
            <div class="section-actions">
                ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].includes(String(section.id)) ? '' :
                `<button class="btn-icon delete-sub" title="Delete Main Section" onclick="event.stopPropagation(); deleteMainSection(${section.id})">
                    <i class="fas fa-trash"></i>
                </button>`}
                <button class="btn-icon add-sub" title="Add Subsection" onclick="event.stopPropagation(); addSubsection(${section.id})">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
        `;
        sectionItem.dataset.sectionId = section.id;

        sectionItem.addEventListener('click', () => {
            document.querySelectorAll('.section-item').forEach(item => item.classList.remove('active'));
            sectionItem.classList.add('active');
            if (section.id == 3) {
                loadObjectivesEditor(section);
            } else {
                loadSectionEditor(section);
            }
        });

        sectionContainer.appendChild(sectionItem);

        // Add subsections if any
        if (section.subsections && section.subsections.length > 0) {

            const subsectionList = document.createElement('div');
            subsectionList.className = 'subsection-list';
            sectionContainer.appendChild(subsectionList);

            section.subsections.forEach((sub, index) => {
                const subsectionItem = document.createElement('div');
                subsectionItem.className = 'section-item subsection';

                // Auto-numbering: SectionID.Index+1
                const numbering = `${section.id}.${index + 1}`;

                subsectionItem.innerHTML = `
                    <span>${numbering} ${sub.title}</span>
                    <div class="section-actions">
                        <button class="btn-icon delete-sub" title="Delete Subsection" onclick="event.stopPropagation(); deleteSubsection(${section.id}, ${index})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                subsectionItem.dataset.sectionId = section.id;
                subsectionItem.dataset.subsectionIndex = index;

                subsectionItem.addEventListener('click', () => {
                    document.querySelectorAll('.section-item').forEach(item => item.classList.remove('active'));
                    subsectionItem.classList.add('active');

                    // Special Sections Routing under "Protocol Summary" (id=1)
                    if (section.id == 1) {
                        if (sub.title.includes('Synopsis')) {
                            loadSynopsisEditor();
                            return;
                        }
                        if (sub.title.includes('Schema')) {
                            loadSchemaEditor();
                            return;
                        }
                        if (sub.title.includes('Schedule of Activities')) {
                            loadSoAEditor();
                            return;
                        }
                    }

                    loadSubsectionEditor(section, sub, index);
                });

                subsectionList.appendChild(subsectionItem);
            });
        }
        sectionList.appendChild(sectionContainer);
    });

    // Add "Add Main Section" button
    const addMainBtn = document.createElement('button');
    addMainBtn.className = 'btn secondary full-width mt-2';
    addMainBtn.style.marginTop = '10px';
    addMainBtn.style.width = '100%';
    addMainBtn.innerHTML = '<i class="fas fa-plus"></i> Add Main Section';
    addMainBtn.onclick = addMainSection;
    sectionList.appendChild(addMainBtn);
}

function loadTableOfContents() {
    const editor = document.getElementById('sectionEditor');
    if (!editor) return;

    let html = `
        <div class="toc-view">
            <h2><i class="fas fa-list-ol"></i> Table of Contents</h2>
            <p>Click on any section or subsection to navigate directly to it.</p>
            <div class="toc-list">
    `;

    const sortedSections = Object.entries(protocolData.sections)
        .sort(([a], [b]) => parseInt(a) - parseInt(b));

    sortedSections.forEach(([id, section]) => {
        html += `
            <div class="toc-main-item" onclick="navigateToSection(${id})">
                <span class="toc-number">${id}.</span>
                <span class="toc-title">${section.title}</span>
            </div>
        `;

        if (section.subsections && section.subsections.length > 0) {
            section.subsections.forEach((sub, index) => {
                html += `
                    <div class="toc-sub-item" onclick="navigateToSubsection(${id}, ${index})">
                        <span class="toc-number">${id}.${index + 1}</span>
                        <span class="toc-title">${sub.title}</span>
                    </div>
                `;
            });
        }
    });

    html += `
            </div>
        </div>
    `;
    editor.innerHTML = html;
}

function navigateToSection(id) {
    const item = document.querySelector(`.section-item.main-section[data-section-id="${id}"]`);
    if (item) item.click();
}

function navigateToSubsection(id, index) {
    const item = document.querySelector(`.section-item.subsection[data-section-id="${id}"][data-subsection-index="${index}"]`);
    if (item) item.click();
}


function deleteMainSection(id) {
    if (confirm('Are you sure you want to delete this main section?')) {
        delete protocolData.sections[id];
        refreshSectionList();
        showToast('Section deleted', 'success');
    }
}
function loadSectionEditor(section) {
    const editor = document.getElementById('sectionEditor');
    editor.innerHTML = `
        <h3>${section.id}. ${section.title}</h3>
        <div class="form-group">
            <label for="sectionContent">Section Content</label>
            <textarea
                id="sectionContent"
                rows="15"
                placeholder="Enter content for this section..."
            >${protocolData.sections[section.id]?.main || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="sectionNotes">Additional Notes</label>
            <textarea
                id="sectionNotes"
                rows="5"
                placeholder="Any additional notes..."
            >${protocolData.sections[section.id]?.notes || ''}</textarea>
        </div>
        <button class="btn primary" onclick="saveSection(${section.id})">
            <i class="fas fa-save"></i> Save Section
        </button>
    `;

    const contentArea = document.getElementById('sectionContent');
    const notesArea = document.getElementById('sectionNotes');

    contentArea.addEventListener('input', () => {
        if (!protocolData.sections[section.id]) {
            protocolData.sections[section.id] = {};
        }
        protocolData.sections[section.id].main = contentArea.value;
        updateStatus('Section content updated');
    });

    notesArea.addEventListener('input', () => {
        if (!protocolData.sections[section.id]) {
            protocolData.sections[section.id] = {};
        }
        protocolData.sections[section.id].notes = notesArea.value;
        updateStatus('Section notes updated');
    });

    // Images Section
    const imagesContainer = document.createElement('div');
    imagesContainer.className = 'form-group';
    imagesContainer.style.marginTop = '20px';
    imagesContainer.innerHTML = '<h4>Section Images</h4><p>Upload images for this main section.</p><div id="mainSectionImagesList"></div>';

    // Upload Button
    const uploadBtnDiv = document.createElement('div');
    uploadBtnDiv.className = 'form-group center-text dashed-box';
    uploadBtnDiv.innerHTML = `
        <label class="btn secondary">
            <i class="fas fa-plus"></i> Add Image
            <input type="file" accept="image/*" style="display: none;" onchange="uploadSectionImage(this, ${section.id}, null)">
        </label>
    `;

    imagesContainer.appendChild(uploadBtnDiv);

    // Insert before save button (last child is save button usually)
    editor.insertBefore(imagesContainer, editor.lastElementChild);

    renderSectionImages('main', section.id, null, 'mainSectionImagesList');
}

function loadSubsectionEditor(section, subObj, index) {
    const editor = document.getElementById('sectionEditor');
    const numbering = `${section.id}.${index + 1}`;

    // Safety check
    if (!protocolData.sections[section.id].subsections[index]) {
        // If not found (deletion race cond?), return
        return;
    }

    // Current text content
    const currentContent = protocolData.sections[section.id].subsections[index].content || '';

    editor.innerHTML = `
        <h3>${numbering} ${subObj.title}</h3>
        <div class="form-group">
            <label for="subsectionContent">Content</label>
            <textarea
                id="subsectionContent"
                rows="15"
                placeholder="Enter content for this subsection..."
            >${currentContent}</textarea>
        </div>
        <button class="btn primary" onclick="saveSubsection(${section.id}, ${index})">
            <i class="fas fa-save"></i> Save Subsection
        </button>
    `;

    const contentArea = document.getElementById('subsectionContent');
    contentArea.addEventListener('input', () => {
        if (!protocolData.sections[section.id]) protocolData.sections[section.id] = { subsections: [] };
        if (!protocolData.sections[section.id].subsections) protocolData.sections[section.id].subsections = [];
        // Ensure object exists
        if (!protocolData.sections[section.id].subsections[index]) return;

        protocolData.sections[section.id].subsections[index].content = contentArea.value;
        updateStatus('Subsection content updated');
    });

    // Images for Subsection
    const imagesContainer = document.createElement('div');
    imagesContainer.className = 'form-group';
    imagesContainer.style.marginTop = '20px';
    imagesContainer.innerHTML = '<h4>Subsection Images</h4><div id="subSectionImagesList"></div>';

    // Upload Button
    const uploadBtnDiv = document.createElement('div');
    uploadBtnDiv.className = 'form-group center-text dashed-box';
    uploadBtnDiv.innerHTML = `
        <label class="btn secondary">
            <i class="fas fa-plus"></i> Add Image
            <input type="file" accept="image/*" style="display: none;" onchange="uploadSectionImage(this, ${section.id}, ${index})">
        </label>
    `;

    imagesContainer.appendChild(uploadBtnDiv);
    editor.insertBefore(imagesContainer, editor.lastElementChild);

    renderSectionImages('sub', section.id, index, 'subSectionImagesList');
}

function renderSectionImages(type, sectionId, subIndex, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let images = [];
    if (type === 'main') {
        if (!protocolData.sections[sectionId].images) protocolData.sections[sectionId].images = [];
        images = protocolData.sections[sectionId].images;
    } else {
        if (!protocolData.sections[sectionId].subsections[subIndex].images) protocolData.sections[sectionId].subsections[subIndex].images = [];
        images = protocolData.sections[sectionId].subsections[subIndex].images;
    }

    let html = '';
    images.forEach((img, idx) => {
        html += `
            <div class="schema-image-item" style="border: 1px solid #eee; padding: 10px; margin-bottom: 10px;">
                <div style="text-align: right;">
                    <button class="btn-icon delete-sub" onclick="deleteSectionImage('${type}', ${sectionId}, ${subIndex}, ${idx})" title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${img.url ? `<img src="${API_BASE_URL}${img.url}" style="max-width: 100%; display: block; margin-bottom: 10px;">` : ''}
                <input type="text" placeholder="Caption" value="${img.caption || ''}" 
                       onchange="updateSectionImage('${type}', ${sectionId}, ${subIndex}, ${idx}, 'caption', this.value)"
                       style="width: 100%; margin-bottom: 5px;">
                <textarea placeholder="Description" rows="2"
                          onchange="updateSectionImage('${type}', ${sectionId}, ${subIndex}, ${idx}, 'description', this.value)"
                          style="width: 100%;">${img.description || ''}</textarea>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function uploadSectionImage(input, sectionId, subIndex) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        const newImg = { url: result.url, caption: '', description: '' };

        if (subIndex !== null) {
            // Subsection
            if (!protocolData.sections[sectionId].subsections[subIndex].images) {
                protocolData.sections[sectionId].subsections[subIndex].images = [];
            }
            protocolData.sections[sectionId].subsections[subIndex].images.push(newImg);
            renderSectionImages('sub', sectionId, subIndex, 'subSectionImagesList');
        } else {
            // Main Section
            if (!protocolData.sections[sectionId].images) {
                protocolData.sections[sectionId].images = [];
            }
            protocolData.sections[sectionId].images.push(newImg);
            renderSectionImages('main', sectionId, null, 'mainSectionImagesList');
        }
        showToast('Image uploaded', 'success');
    } catch (error) {
        console.error('Error uploading image:', error);
        showToast('Error uploading image', 'error');
    }
}

function updateSectionImage(type, sectionId, subIndex, imgIndex, field, value) {
    if (type === 'main') {
        protocolData.sections[sectionId].images[imgIndex][field] = value;
    } else {
        protocolData.sections[sectionId].subsections[subIndex].images[imgIndex][field] = value;
    }
    updateStatus('Image details updated');
}

function deleteSectionImage(type, sectionId, subIndex, imgIndex) {
    if (confirm('Remove this image?')) {
        if (type === 'main') {
            protocolData.sections[sectionId].images.splice(imgIndex, 1);
            renderSectionImages('main', sectionId, null, 'mainSectionImagesList');
        } else {
            protocolData.sections[sectionId].subsections[subIndex].images.splice(imgIndex, 1);
            renderSectionImages('sub', sectionId, subIndex, 'subSectionImagesList');
        }
    }
}

function saveSection(sectionId) {
    showToast('Section saved successfully', 'success');
}

function saveSubsection(sectionId, index) {
    showToast('Subsection saved successfully', 'success');
}

function loadSynopsisEditor() {
    const editor = document.getElementById('sectionEditor');
    editor.innerHTML = `
        <h3>Synopsis</h3>
        <div class="form-group">
            <label for="synopsisTitle">Title</label>
            <input type="text" id="synopsisTitle" value="${protocolData.synopsis.Title || ''}">
        </div>
        <div class="form-group">
            <label for="synopsisDescription">Study Description</label>
            <textarea id="synopsisDescription" rows="3">${protocolData.synopsis['Study Description'] || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="synopsisObjectives">Objectives</label>
            <textarea id="synopsisObjectives" rows="3">${protocolData.synopsis.Objectives || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="synopsisEndpoints">Endpoints</label>
            <textarea id="synopsisEndpoints" rows="3">${protocolData.synopsis.Endpoints || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="synopsisPopulation">Study Population</label>
            <input type="text" id="synopsisPopulation" value="${protocolData.synopsis['Study Population'] || ''}">
        </div>
        <div class="form-group">
            <label for="synopsisPhase">Phase</label>
            <input type="text" id="synopsisPhase" value="${protocolData.synopsis.Phase || ''}">
        </div>
        <div class="form-group">
            <label for="synopsisSites">Description of Sites/Facilities</label>
            <textarea id="synopsisSites" rows="2">${protocolData.synopsis['Sites/Facilities'] || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="synopsisIntervention">Description of Study Intervention</label>
            <textarea id="synopsisIntervention" rows="2">${protocolData.synopsis['Study Intervention Description'] || ''}</textarea>
        </div>
        <div class="form-group">
            <label for="synopsisStudyDuration">Study Duration</label>
            <input type="text" id="synopsisStudyDuration" value="${protocolData.synopsis['Study Duration'] || ''}">
        </div>
        <div class="form-group">
            <label for="synopsisParticipantDuration">Participant Duration</label>
            <input type="text" id="synopsisParticipantDuration" value="${protocolData.synopsis['Participant Duration'] || ''}">
        </div>
        <button class="btn primary" onclick="saveSynopsis()">
            <i class="fas fa-save"></i> Save Synopsis
        </button>
    `;
}

function saveSynopsis() {
    protocolData.synopsis = {
        Title: document.getElementById('synopsisTitle').value,
        'Study Description': document.getElementById('synopsisDescription').value,
        Objectives: document.getElementById('synopsisObjectives').value,
        Endpoints: document.getElementById('synopsisEndpoints').value,
        'Study Population': document.getElementById('synopsisPopulation').value,
        Phase: document.getElementById('synopsisPhase').value,
        'Sites/Facilities': document.getElementById('synopsisSites').value,
        'Study Intervention Description': document.getElementById('synopsisIntervention').value,
        'Study Duration': document.getElementById('synopsisStudyDuration').value,
        'Participant Duration': document.getElementById('synopsisParticipantDuration').value
    };
    showToast('Synopsis saved successfully', 'success');
}

function loadSchemaEditor() {
    const editor = document.getElementById('sectionEditor');
    const images = protocolData.schema_data.images || [];

    let imagesHtml = '';
    images.forEach((img, index) => {
        imagesHtml += `
            <div class="schema-image-item" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <div style="text-align: right;">
                    <button class="btn-icon delete-sub" onclick="deleteSchemaImage(${index})" title="Remove Image">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${img.url ? `<img src="${API_BASE_URL}${img.url}" style="max-width: 100%; margin-bottom: 15px; display: block;">` : ''}
                
                <div class="form-group">
                    <label>Figure Name / Caption</label>
                    <input type="text" id="schemaCaption_${index}" value="${img.caption || ''}" placeholder="Figure 1: Diagram..." onchange="updateSchemaImage(${index}, 'caption', this.value)">
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="schemaDesc_${index}" rows="3" placeholder="Description..." onchange="updateSchemaImage(${index}, 'description', this.value)">${img.description || ''}</textarea>
                </div>
            </div>
        `;
    });

    editor.innerHTML = `
        <h3>Schema</h3>
        <p>Upload images to include in the Schema section. You can add multiple images/figures.</p>
        
        <div id="schemaImagesList">
            ${imagesHtml}
        </div>

        <div class="form-group" style="border-top: 2px dashed #ccc; padding-top: 20px; text-align: center;">
            <label for="schemaImageUpload" class="btn secondary">
                <i class="fas fa-plus"></i> Add New Image
            </label>
            <input type="file" id="schemaImageUpload" accept="image/*" style="display: none;" onchange="uploadSchemaImage(this)">
        </div>

        <button class="btn primary" onclick="saveSchema()">
            <i class="fas fa-save"></i> Save Schema
        </button>
    `;
}

function updateSchemaImage(index, field, value) {
    if (protocolData.schema_data.images[index]) {
        protocolData.schema_data.images[index][field] = value;
    }
}

function deleteSchemaImage(index) {
    if (confirm('Remove this image?')) {
        protocolData.schema_data.images.splice(index, 1);
        loadSchemaEditor();
    }
}

async function uploadSchemaImage(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (!protocolData.schema_data.images) protocolData.schema_data.images = [];
        protocolData.schema_data.images.push({
            url: result.url,
            caption: '',
            description: ''
        });

        showToast('Image uploaded', 'success');
        loadSchemaEditor();
    } catch (error) {
        console.error('Error uploading image:', error);
        showToast('Error uploading image', 'error');
    }
}

function saveSchema() {
    // Data is updated on change, but we trigger a manual save/toast
    showToast('Schema section saved', 'success');
    updateStatus('Schema saved');
}

function loadSoAEditor() {
    const editor = document.getElementById('sectionEditor');
    const soa = protocolData.soa_data || {};
    
    editor.innerHTML = `
        <h3>Schedule of Activities (SoA)</h3>
        
        <div class="form-group" style="padding: 15px; background: #fdfdfd; border: 1px solid #eee; border-radius: 10px; margin-bottom: 25px;">
            <label style="font-weight: 600; font-size: 1.1rem; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-bottom: 15px; display: inline-block;">1. SoA Image / Flowchart (Optional)</label>
            
            <div class="image-uploader" style="margin-bottom: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px; background: #fff;">
                <input type="file" id="soaImageUpload" accept="image/*" style="border: none; padding: 0; width: auto; box-shadow: none;">
                <button class="btn secondary" onclick="uploadSoAImage()" style="margin-top: 5px;">
                    <i class="fas fa-upload"></i> Upload Image
                </button>
            </div>
            <div id="soaImagePreview" class="mt-2" style="text-align: center;">
                ${soa.image?.url ? `<img src="${API_BASE_URL}${soa.image.url}" style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 10px;">` : ''}
            </div>
            
            <div style="display: flex; gap: 15px; margin-top: 15px;">
                <div class="form-group" style="flex: 1; margin-bottom: 0;">
                    <label>Image Caption</label>
                    <input type="text" id="soaImageCaption" value="${soa.image?.caption || ''}" placeholder="Figure 1: SoA Flowchart..." onchange="updateSoAImageDetails('caption', this.value)">
                </div>
                <div class="form-group" style="flex: 2; margin-bottom: 0;">
                    <label>Image Description</label>
                    <input type="text" id="soaImageDesc" value="${soa.image?.description || ''}" placeholder="Description of the image..." onchange="updateSoAImageDetails('description', this.value)">
                </div>
            </div>
        </div>

        <div class="form-group" style="padding: 15px; background: #fdfdfd; border: 1px solid #eee; border-radius: 10px;">
            <label style="font-weight: 600; font-size: 1.1rem; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-bottom: 15px; display: inline-block;">2. Dynamic Table Generator</label>
            
            <div class="table-controls mb-2" style="display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label>Columns</label>
                    <input type="number" id="soaColCount" min="1" value="5" style="width: 100px; text-align: center;">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label>Rows</label>
                    <input type="number" id="soaRowCount" min="1" value="5" style="width: 100px; text-align: center;">
                </div>
                <button class="btn primary" onclick="generateSoATableLayout()">
                     <i class="fas fa-table"></i> Generate Table 
                </button>
                <div style="flex-grow: 1;"></div>
                <button class="btn secondary small" onclick="addSoAColumn()"><i class="fas fa-plus"></i> Add Column</button>
                <button class="btn secondary small" onclick="addSoARow()"><i class="fas fa-plus"></i> Add Row</button>
            </div>

            <div class="soa-table-container custom-table-container" id="soaTableContainer" style="overflow-x: auto; padding: 15px; background: #fff; margin-top: 15px;">
            </div>
        </div>
        
        <button class="btn primary mt-4" onclick="saveSoA()">
            <i class="fas fa-save"></i> Save SoA
        </button>
    `;
    
    // Ensure soa_data structure
    if (!protocolData.soa_data) protocolData.soa_data = {};
    if (!protocolData.soa_data.table) protocolData.soa_data.table = { headers: [], rows: [] };
    
    // Convert old dict format rows to list format if necessary
    if (protocolData.soa_data.table.rows && !Array.isArray(protocolData.soa_data.table.rows)) {
        let newRows = [];
        Object.entries(protocolData.soa_data.table.rows).forEach(([proc, checks]) => {
            let migratedRow = [proc];
            checks.forEach(c => migratedRow.push(c ? "X" : ""));
            newRows.push(migratedRow);
        });
        
        let oldHeaders = protocolData.soa_data.table.headers || [];
        if (oldHeaders[0] !== "Procedures") {
             protocolData.soa_data.table.headers = ["Procedures", ...oldHeaders];
        } else {
             protocolData.soa_data.table.headers = [...oldHeaders];
        }
        protocolData.soa_data.table.rows = newRows;
    }

    renderSoADynamicTable();
}

function updateSoAImageDetails(field, value) {
    if (!protocolData.soa_data) protocolData.soa_data = {};
    if (!protocolData.soa_data.image) protocolData.soa_data.image = {};
    protocolData.soa_data.image[field] = value;
}

async function uploadSoAImage() {
    const fileInput = document.getElementById('soaImageUpload');
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (!protocolData.soa_data) protocolData.soa_data = {};
        if (!protocolData.soa_data.image) protocolData.soa_data.image = {};

        protocolData.soa_data.image.url = result.url;
        showToast('Image uploaded successfully', 'success');

        const preview = document.getElementById('soaImagePreview');
        preview.innerHTML = `<img src="${API_BASE_URL}${result.url}" style="max-width: 100%; max-height: 300px; margin-top: 10px;">`;

    } catch (error) {
        console.error('Error uploading image:', error);
        showToast('Error uploading image', 'error');
    }
}

function generateSoATableLayout() {
    if(!confirm("This will replace the current table. Are you sure?")) return;
    const cols = parseInt(document.getElementById('soaColCount').value) || 5;
    const rows = parseInt(document.getElementById('soaRowCount').value) || 5;
    
    let headers = [];
    for(let i=0; i<cols; i++) {
        headers.push(i === 0 ? "Procedure" : `Visit ${i}`);
    }
    
    let rowData = [];
    for(let r=0; r<rows; r++) {
         let newRow = new Array(cols).fill("");
         rowData.push(newRow);
    }
    
    protocolData.soa_data.table.headers = headers;
    protocolData.soa_data.table.rows = rowData;
    renderSoADynamicTable();
}

function renderSoADynamicTable() {
    const container = document.getElementById('soaTableContainer');
    if (!protocolData.soa_data || !protocolData.soa_data.table || !protocolData.soa_data.table.headers.length) {
        container.innerHTML = '<p class="placeholder">No table generated yet. Use the controls above.</p>';
        return;
    }

    const tableData = protocolData.soa_data.table;
    let html = '<table class="obj-dynamic-table" style="width:100%; border-collapse: collapse;"><thead><tr>';

    // Headers
    tableData.headers.forEach((h, i) => {
        html += `
            <th style="padding: 5px; border: 1px solid #ddd; background: #f9f9f9; min-width: 120px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <input type="text" value="${h}" onchange="updateSoAHeader(${i}, this.value)" style="width: 80%;">
                    <i class="fas fa-times" onclick="deleteSoAColumn(${i})" style="cursor: pointer; color: red; margin-left: 5px;"></i>
                </div>
            </th>
        `;
    });
    html += '<th style="width: 50px;">Action</th></tr></thead><tbody>';

    // Rows
    tableData.rows.forEach((row, rIndex) => {
        html += '<tr>';
        for (let c = 0; c < tableData.headers.length; c++) {
            const val = row[c] || '';
            html += `
                <td style="padding: 5px; border: 1px solid #ddd;">
                    <textarea style="width: 100%;" rows="2" onchange="updateSoACell(${rIndex}, ${c}, this.value)">${val}</textarea>
                </td>
            `;
        }
        html += `
            <td style="text-align: center; border: 1px solid #ddd;">
                <i class="fas fa-trash" onclick="deleteSoARow(${rIndex})" style="cursor: pointer; color: red;"></i>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateSoAHeader(index, value) {
    protocolData.soa_data.table.headers[index] = value;
}

function updateSoACell(row, col, value) {
    if (!protocolData.soa_data.table.rows[row]) protocolData.soa_data.table.rows[row] = [];
    protocolData.soa_data.table.rows[row][col] = value;
}

function addSoAColumn() {
    if(!protocolData.soa_data.table.headers) return;
    const name = prompt("Column Name:");
    if (name) {
        protocolData.soa_data.table.headers.push(name);
        renderSoADynamicTable();
    }
}

function deleteSoAColumn(index) {
    if (confirm("Delete this column?")) {
        protocolData.soa_data.table.headers.splice(index, 1);
        protocolData.soa_data.table.rows.forEach(row => {
            row.splice(index, 1);
        });
        renderSoADynamicTable();
    }
}

function addSoARow() {
    if(!protocolData.soa_data.table.headers) return;
    const newRow = new Array(protocolData.soa_data.table.headers.length).fill("");
    protocolData.soa_data.table.rows.push(newRow);
    renderSoADynamicTable();
}

function deleteSoARow(index) {
    if (confirm("Delete this row?")) {
        protocolData.soa_data.table.rows.splice(index, 1);
        renderSoADynamicTable();
    }
}

function saveSoA() {
    saveAll();
    showToast('SoA saved successfully', 'success');
}

// --- Section 3: Objectives & Endpoints Editor ---

function loadObjectivesEditor(section) {
    const editor = document.getElementById('sectionEditor');
    const s3 = protocolData.section3 || {};

    editor.innerHTML = `
        <h3>3. Objectives and Endpoints</h3>
        
        <!-- Description -->
        <div class="form-group">
            <label>Description</label>
            <textarea id="s3Description" rows="5">${s3.description || ''}</textarea>
        </div>
        
        <!-- Image Upload -->
        <div class="form-group">
            <label>Section Image (Optional)</label>
            <div class="image-uploader-container">
                <input type="file" id="s3ImageUpload" accept="image/*">
                <button class="btn secondary" onclick="uploadSection3Image()">
                    <i class="fas fa-upload"></i> Upload Image
                </button>
            </div>
            <div id="s3ImagePreview" class="mt-2">
                ${s3.image?.url ? `<img src="${API_BASE_URL}${s3.image.url}" style="max-width: 100%; max-height: 300px; margin-top: 10px;">` : ''}
            </div>
        </div>
        
        <div class="form-group">
            <label>Image Caption</label>
            <input type="text" id="s3ImageCaption" value="${s3.image?.caption || ''}" placeholder="Figure 1: Study Design...">
        </div>
        
        <div class="form-group">
            <label>Image Description</label>
            <textarea id="s3ImageDesc" rows="2" placeholder="Description of the image...">${s3.image?.description || ''}</textarea>
        </div>

        <hr>
        
        <!-- Dynamic Table -->
        <h4>Objectives Table</h4>
        <div class="table-controls mb-2">
            <button class="btn secondary small" onclick="addObjColumn()">Add Column</button>
            <button class="btn secondary small" onclick="addObjRow()">Add Row</button>
        </div>
        
        <div class="obj-table-container" id="objTableContainer" style="overflow-x: auto;">
            <!-- Table rendered here -->
        </div>

        <button class="btn primary mt-4" onclick="saveSection3()">
            <i class="fas fa-save"></i> Save Section 3
        </button>
    `;

    // Listeners for text inputs
    document.getElementById('s3Description').addEventListener('input', (e) => {
        if (!protocolData.section3) protocolData.section3 = {};
        protocolData.section3.description = e.target.value;
    });

    document.getElementById('s3ImageCaption').addEventListener('input', (e) => {
        if (!protocolData.section3.image) protocolData.section3.image = {};
        protocolData.section3.image.caption = e.target.value;
    });

    document.getElementById('s3ImageDesc').addEventListener('input', (e) => {
        if (!protocolData.section3.image) protocolData.section3.image = {};
        protocolData.section3.image.description = e.target.value;
    });

    renderObjTable();
}

async function uploadSection3Image() {
    const fileInput = document.getElementById('s3ImageUpload');
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (!protocolData.section3) protocolData.section3 = {};
        if (!protocolData.section3.image) protocolData.section3.image = {};

        protocolData.section3.image.url = result.url;
        showToast('Image uploaded successfully', 'success');

        // Update preview
        const preview = document.getElementById('s3ImagePreview');
        preview.innerHTML = `<img src="${API_BASE_URL}${result.url}" style="max-width: 100%; max-height: 300px; margin-top: 10px;">`;

    } catch (error) {
        console.error('Error uploading image:', error);
        showToast('Error uploading image', 'error');
    }
}

function renderObjTable() {
    const container = document.getElementById('objTableContainer');
    if (!protocolData.section3) protocolData.section3 = { table: { headers: [], rows: [] } };
    if (!protocolData.section3.table) protocolData.section3.table = { headers: ["Type", "Objectives", "Endpoints"], rows: [] };

    const tableData = protocolData.section3.table;

    let html = '<table class="obj-dynamic-table" style="width:100%; border-collapse: collapse;"><thead><tr>';

    // Headers
    tableData.headers.forEach((h, i) => {
        html += `
            <th style="padding: 5px; border: 1px solid #ddd; background: #f9f9f9;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <input type="text" value="${h}" onchange="updateObjHeader(${i}, this.value)" style="width: 80%;">
                    <i class="fas fa-times" onclick="deleteObjColumn(${i})" style="cursor: pointer; color: red;"></i>
                </div>
            </th>
        `;
    });
    html += '<th>Action</th></tr></thead><tbody>';

    // Rows
    tableData.rows.forEach((row, rIndex) => {
        html += '<tr>';
        // Ensure row has enough cells
        for (let c = 0; c < tableData.headers.length; c++) {
            const val = row[c] || '';
            html += `
                <td style="padding: 5px; border: 1px solid #ddd;">
                    <textarea style="width: 100%;" rows="2" onchange="updateObjCell(${rIndex}, ${c}, this.value)">${val}</textarea>
                </td>
            `;
        }
        html += `
            <td style="text-align: center; border: 1px solid #ddd;">
                <i class="fas fa-trash" onclick="deleteObjRow(${rIndex})" style="cursor: pointer; color: red;"></i>
            </td>
        </tr>`;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateObjHeader(index, value) {
    protocolData.section3.table.headers[index] = value;
}

function updateObjCell(row, col, value) {
    // Ensure row exists adequately
    if (!protocolData.section3.table.rows[row]) protocolData.section3.table.rows[row] = [];
    protocolData.section3.table.rows[row][col] = value;
}

function addObjColumn() {
    const name = prompt("Column Name:");
    if (name) {
        protocolData.section3.table.headers.push(name);
        // Pad rows? Not strictly necessary if we handle undefined in access, but good practice
        renderObjTable();
    }
}

function deleteObjColumn(index) {
    if (confirm("Delete this column?")) {
        protocolData.section3.table.headers.splice(index, 1);
        // Remove data from rows
        protocolData.section3.table.rows.forEach(row => {
            row.splice(index, 1);
        });
        renderObjTable();
    }
}

function addObjRow() {
    const newRow = new Array(protocolData.section3.table.headers.length).fill("");
    protocolData.section3.table.rows.push(newRow);
    renderObjTable();
}

function deleteObjRow(index) {
    if (confirm("Delete this row?")) {
        protocolData.section3.table.rows.splice(index, 1);
        renderObjTable();
    }
}

function saveSection3() {
    saveAll();
    showToast('Section 3 saved', 'success');
}

async function saveAll(silent = false) {
    try {
        updateProtocolDataFromForm();

        const response = await fetch(`${API_BASE_URL}/api/save-protocol`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(protocolData)
        });

        if (response.ok) {
            const result = await response.json();
            protocolData.id = result.id; // Store the server-side ID
            localStorage.setItem('protocolData', JSON.stringify(protocolData));
            if (!silent) {
                showToast('Protocol saved successfully!', 'success');
                updateStatus('Protocol saved');

                // Update Global Protocol ID and Refresh Dashboard
                if (result.protocol_id) {
                    currentProtocolId = result.protocol_id;
                    protocolData.protocol_id = result.protocol_id;
                    refreshDashboard();
                }
            }
        } else {
            throw new Error('Failed to save protocol');
        }
    } catch (error) {
        console.error('Error saving protocol:', error);
        showToast('Error saving protocol', 'error');
    }
}

function updateProtocolDataFromForm() {
    protocolData.protocol_title = document.getElementById('protocolTitle').value;
    protocolData.protocol_number = document.getElementById('protocolNumber').value;
    protocolData.nct_number = document.getElementById('nctNumber').value;
    protocolData.principal_investigator = document.getElementById('principalInvestigator').value;
    protocolData.sponsor = document.getElementById('sponsor').value;
    protocolData.funded_by = document.getElementById('fundedBy').value;
    protocolData.version_number = document.getElementById('versionNumber').value;
    protocolData.protocol_date = document.getElementById('protocolDate').value;
}

async function generateWord() {
    try {
        updateProtocolDataFromForm();
        showProgress(true);

        const response = await fetch(`${API_BASE_URL}/api/generate-word`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(protocolData)
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `protocol_${protocolData.version_number}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('Word document generated successfully!', 'success');
        } else {
            throw new Error('Failed to generate Word document');
        }
    } catch (error) {
        console.error('Error generating Word document:', error);
        showToast('Error generating Word document', 'error');
    } finally {
        showProgress(false);
    }
}

async function generatePDF() {
    try {
        updateProtocolDataFromForm();
        showProgress(true);

        const response = await fetch(`${API_BASE_URL}/api/generate-pdf`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(protocolData)
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `protocol_${protocolData.version_number}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('PDF document generated successfully!', 'success');
        } else {
            throw new Error('Failed to generate PDF document');
        }
    } catch (error) {
        console.error('Error generating PDF document:', error);
        showToast('Error generating PDF document', 'error');
    } finally {
        showProgress(false);
    }
}

function saveProtocol() {
    updateProtocolDataFromForm();
    localStorage.setItem('protocolData', JSON.stringify(protocolData));
    showToast('Protocol saved to browser storage', 'success');
    saveAll(true); // Trigger backend save for dashboard updates
}

function loadProtocol() {
    const savedDataStr = localStorage.getItem('protocolData');
    if (savedDataStr) {
        let data = JSON.parse(savedDataStr);
        if (data.protocol_id) {
            currentProtocolId = data.protocol_id;
            refreshDashboard();
        }

        // --- MIGRATION LOGIC (Reuse) ---
        if (data.sections) {
            Object.keys(data.sections).forEach(secId => {
                const sec = data.sections[secId];
                if (sec.subsections && !Array.isArray(sec.subsections)) {
                    const newSubs = [];
                    Object.keys(sec.subsections).sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
                        const val = sec.subsections[key];
                        if (typeof val === 'string') {
                            newSubs.push({ title: val, content: '' });
                        } else {
                            newSubs.push(val);
                        }
                    });
                    sec.subsections = newSubs;
                    sec.subsections = newSubs;
                }
            });
        }

        // --- CLEANUP "Hello" / Duplicate Sections ---
        if (data.sections) {
            Object.keys(data.sections).forEach(key => {
                const s = data.sections[key];
                // Remove if title is "hello" (case insensitive)
                if (s.title && s.title.toLowerCase() === 'hello') {
                    delete data.sections[key];
                }
            });
        }
        // -----------------------

        protocolData = data; // Direct assignment better than merge for Load

        document.getElementById('protocolTitle').value = protocolData.protocol_title || '';
        document.getElementById('protocolNumber').value = protocolData.protocol_number || '';
        document.getElementById('nctNumber').value = protocolData.nct_number || '';
        document.getElementById('principalInvestigator').value = protocolData.principal_investigator || '';
        document.getElementById('sponsor').value = protocolData.sponsor || '';
        document.getElementById('fundedBy').value = protocolData.funded_by || '';
        document.getElementById('versionNumber').value = protocolData.version_number || '';
        document.getElementById('protocolDate').value = protocolData.protocol_date || '';

        showToast('Protocol loaded successfully', 'success');
        updateStatus('Protocol loaded');
        refreshSectionList();
    } else {
        showToast('No saved protocol found', 'warning');
    }
}

function loadSavedData() {
    const savedDataStr = localStorage.getItem('protocolData');
    if (savedDataStr) {
        let data = JSON.parse(savedDataStr);

        // --- MIGRATION LOGIC ---
        // Convert subsections from object to array if needed
        if (data.sections) {
            Object.keys(data.sections).forEach(secId => {
                const sec = data.sections[secId];
                if (sec.subsections && !Array.isArray(sec.subsections)) {
                    const newSubs = [];
                    Object.keys(sec.subsections).sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
                        const val = sec.subsections[key];
                        if (typeof val === 'string') {
                            newSubs.push({ title: val, content: '' });
                        } else {
                            newSubs.push(val);
                        }
                    });
                    sec.subsections = newSubs;
                }
            });
        }

        // Cleanup Hello sections
        Object.keys(data.sections || {}).forEach(key => {
            if (data.sections[key].title && data.sections[key].title.toLowerCase() === 'hello') {
                delete data.sections[key];
            }
        });

        // Schema Migration (Single to Array)
        if (data.schema_data && !data.schema_data.images) {
            if (data.schema_data.image_url) {
                data.schema_data.images = [{
                    url: data.schema_data.image_url,
                    caption: data.schema_data.caption || '',
                    description: data.schema_data.description || ''
                }];
            } else {
                data.schema_data.images = [];
            }
        }
        // -----------------------

        // Initialize images arrays if missing (for existing sections)
        if (data.sections) {
            Object.keys(data.sections).forEach(k => {
                if (!data.sections[k].images) data.sections[k].images = [];
                if (data.sections[k].subsections && Array.isArray(data.sections[k].subsections)) {
                    data.sections[k].subsections.forEach(sub => {
                        if (typeof sub === 'object' && !sub.images) {
                            sub.images = [];
                        }
                    });
                }
            });
        }

        protocolData = { ...protocolData, ...data };
        if (protocolData.protocol_id) {
            currentProtocolId = protocolData.protocol_id;
            // Delay refresh slightly to ensure Chart.js/DOM is ready
            setTimeout(() => refreshDashboard(), 500);
        }

        // Ensure UI inputs are updated
        ['protocolTitle', 'protocolNumber', 'nctNumber', 'principalInvestigator', 'sponsor', 'fundedBy', 'versionNumber', 'protocolDate'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = protocolData[id.replace(/([A-Z])/g, "_$1").toLowerCase()] || protocolData[id] || '';
        });

        updateStatus('Previous session restored');
        refreshSectionList();
    }
}



function clearAll() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        protocolData = {
            protocol_title: '',
            protocol_number: '',
            nct_number: '',
            principal_investigator: '',
            sponsor: '',
            funded_by: '',
            version_number: 'v1.0',
            version_number: 'v1.0',
            protocol_date: new Date().toISOString().split('T')[0],
            sections: {},
            synopsis: {},
            schema_data: { image_url: null },
            section3: {
                description: "",
                image: { url: null, caption: "", description: "" },
                table: {
                    headers: ["Type", "Objectives", "Endpoints"],
                    rows: []
                }
            },
            soa_data: {
                table: {
                    headers: [
                        "Screening", "Enrollment/Baseline", "Visit 1", "Visit 2", "Visit 3", "Visit 4", "Visit 5", "Visit 6", "Visit 7", "Visit 8", "Visit 9", "Visit 10", "Visit 11", "Visit 12", "Final Visit"
                    ],
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

        const titleInputs = [
            'protocolTitle',
            'protocolNumber',
            'nctNumber',
            'principalInvestigator',
            'sponsor',
            'fundedBy',
            'versionNumber'
        ];

        titleInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });

        document.getElementById('protocolDate').value = protocolData.protocol_date;

        localStorage.removeItem('protocolData');

        showToast('All data cleared', 'success');
        updateStatus('Ready');
    }
}

function refreshPreview() {
    updateProtocolDataFromForm();

    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="font-size: 24px; margin-bottom: 20px;">${protocolData.protocol_title || 'Clinical Trial Protocol'}</h1>
            <div style="text-align: left; max-width: 600px; margin: 0 auto;">
                <p><strong>Protocol Number:</strong> ${protocolData.protocol_number}</p>
                <p><strong>NCT Number:</strong> ${protocolData.nct_number}</p>
                <p><strong>Principal Investigator:</strong> ${protocolData.principal_investigator}</p>
                <p><strong>Sponsor:</strong> ${protocolData.sponsor}</p>
                <p><strong>Funded By:</strong> ${protocolData.funded_by}</p>
                <p><strong>Version:</strong> ${protocolData.version_number}</p>
                <p><strong>Date:</strong> ${protocolData.protocol_date}</p>
            </div>
        </div>
        <hr style="margin: 40px 0;">
        <h2 style="font-size: 20px; margin-bottom: 20px;">1. PROTOCOL SUMMARY</h2>
        <p>${Object.entries(protocolData.synopsis).map(([key, value]) =>
        `<strong>${key}:</strong> ${value}<br>`
    ).join('')}</p>
        <p><em>Preview limited to title page and summary section. Complete document will be generated in Word/PDF format.</em></p>
    `;

    showToast('Preview updated', 'success');
}

function updateStatus(message) {
    const statusElement = document.getElementById('statusMessage');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

function showProgress(show) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.display = show ? 'block' : 'none';
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = 'toast';

    if (type === 'success') {
        toast.style.background = '#2ecc71';
    } else if (type === 'error') {
        toast.style.background = '#e74c3c';
    } else if (type === 'warning') {
        toast.style.background = '#f39c12';
    }

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// --- Protocol Approval & Agreement Section Implementation ---

function loadApprovalAgreementEditor() {
    const editor = document.getElementById('approvalEditor');
    if (!editor) return;
    const data = protocolData.approval_data;

    editor.innerHTML = `
        <div class="section-title">Protocol Details Section</div>
        <div class="form-grid">
            <div class="form-group">
                <label>Protocol Name</label>
                <input type="text" value="${data.details.protocol_name}" oninput="updateApprovalDetail('protocol_name', this.value)">
            </div>
            <div class="form-group">
                <label>Protocol Number</label>
                <input type="text" value="${data.details.protocol_number}" oninput="updateApprovalDetail('protocol_number', this.value)">
            </div>
            <div class="form-group">
                <label>Investigational Medicinal Product (IMP)</label>
                <input type="text" value="${data.details.imp}" oninput="updateApprovalDetail('imp', this.value)">
            </div>
            <div class="form-group">
                <label>Indication</label>
                <input type="text" value="${data.details.indication}" oninput="updateApprovalDetail('indication', this.value)">
            </div>
            <div class="form-group">
                <label>Clinical Phase</label>
                <input type="text" value="${data.details.clinical_phase}" oninput="updateApprovalDetail('clinical_phase', this.value)">
            </div>
            <div class="form-group">
                <label>Investigators</label>
                <input type="text" value="${data.details.investigators}" oninput="updateApprovalDetail('investigators', this.value)">
            </div>
            <div class="form-group">
                <label>Coordinating Investigator</label>
                <input type="text" value="${data.details.coordinating_investigator}" oninput="updateApprovalDetail('coordinating_investigator', this.value)">
            </div>
            <div class="form-group">
                <label>Expert Committee</label>
                <input type="text" value="${data.details.expert_committee}" oninput="updateApprovalDetail('expert_committee', this.value)">
            </div>
            <div class="form-group" style="grid-column: span 2;">
                <label>Sponsor Name & Address</label>
                <textarea rows="2" oninput="updateApprovalDetail('sponsor_name_address', this.value)">${data.details.sponsor_name_address || ''}</textarea>
            </div>
        </div>

        <div class="form-group">
            <label>GCP Statement (Editable rich text field)</label>
            <textarea class="rich-text-area" rows="4" oninput="updateApprovalDetail('gcp_statement', this.value)">${data.details.gcp_statement || ''}</textarea>
        </div>

        <div class="form-group">
            <label>Approval Statement (Editable rich text box)</label>
            <textarea class="rich-text-area" rows="4" oninput="updateApprovalDetail('approval_statement', this.value)">${data.details.approval_statement || ''}</textarea>
        </div>

        <div class="divider"></div>

        <div class="section-title">Sponsor Representation Section</div>
        <div id="sponsorRepsList"></div>
        <button class="btn secondary" onclick="addRepresentative('sponsor_reps')">
            <i class="fas fa-plus"></i> Add Sponsor Representative
        </button>

        <div class="divider"></div>

        <div class="section-title">CRO Representative Section</div>
        <div id="croRepsList"></div>
        <button class="btn secondary" onclick="addRepresentative('cro_reps')">
            <i class="fas fa-plus"></i> Add CRO Representative
        </button>

        <div class="divider"></div>

        <div class="section-title">Investigator Agreement Section</div>
        <div class="representative-block">
            <div class="form-group">
                <label>Agreement Description</label>
                <textarea class="rich-text-area" rows="3" oninput="updateInvestigatorAgreement('description', this.value)">${data.investigator_agreement.description}</textarea>
            </div>
            <div id="investigatorSignatureContainer"></div>
            <div class="form-grid mt-3">
                <div class="form-group">
                    <label>Investigator Name</label>
                    <input type="text" value="${data.investigator_agreement.name}" oninput="updateInvestigatorAgreement('name', this.value)">
                </div>
                <div class="form-group">
                    <label>Investigator Title</label>
                    <input type="text" value="${data.investigator_agreement.title}" oninput="updateInvestigatorAgreement('title', this.value)">
                </div>
                <div class="form-group">
                    <label>Facility Location</label>
                    <input type="text" value="${data.investigator_agreement.facility}" oninput="updateInvestigatorAgreement('facility', this.value)">
                </div>
                <div class="form-group">
                    <label>City</label>
                    <input type="text" value="${data.investigator_agreement.city}" oninput="updateInvestigatorAgreement('city', this.value)">
                </div>
                <div class="form-group">
                    <label>State</label>
                    <input type="text" value="${data.investigator_agreement.state}" oninput="updateInvestigatorAgreement('state', this.value)">
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="text" value="${data.investigator_agreement.date}" oninput="updateInvestigatorAgreement('date', this.value)">
                </div>
            </div>
        </div>

        <div class="divider"></div>

        <div class="section-title">Protocol Version & Amendments</div>
        <table class="dynamic-table">
            <thead>
                <tr>
                    <th>Document</th>
                    <th>Date of Issue</th>
                    <th style="width: 80px;">Action</th>
                </tr>
            </thead>
            <tbody id="amendmentsTableBody"></tbody>
        </table>
        <button class="btn secondary mt-3" onclick="addAmendmentRow()">
            <i class="fas fa-plus"></i> Add Amendment Row
        </button>
    `;

    renderRepresentatives('sponsor_reps', 'sponsorRepsList');
    renderRepresentatives('cro_reps', 'croRepsList');
    renderInvestigatorSignature();
    renderAmendments();
}

function updateApprovalDetail(field, value) {
    if (!protocolData.approval_data.details) protocolData.approval_data.details = {};
    protocolData.approval_data.details[field] = value;
}

function updateInvestigatorAgreement(field, value) {
    if (!protocolData.approval_data.investigator_agreement) protocolData.approval_data.investigator_agreement = {};
    protocolData.approval_data.investigator_agreement[field] = value;
}

function addRepresentative(listKey) {
    if (!protocolData.approval_data[listKey]) protocolData.approval_data[listKey] = [];
    protocolData.approval_data[listKey].push({
        description: '',
        signature: null,
        name: '',
        title: '',
        date: new Date().toLocaleDateString()
    });
    loadApprovalAgreementEditor();
}

function updateRepresentative(listKey, index, field, value) {
    protocolData.approval_data[listKey][index][field] = value;
}

function deleteRepresentative(listKey, index) {
    if (confirm('Are you sure you want to delete this representative?')) {
        protocolData.approval_data[listKey].splice(index, 1);
        loadApprovalAgreementEditor();
    }
}

function renderRepresentatives(listKey, containerId) {
    const list = protocolData.approval_data[listKey] || [];
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    list.forEach((rep, index) => {
        const block = document.createElement('div');
        block.className = 'representative-block';
        block.innerHTML = `
            <button class="btn-icon delete-block-btn" onclick="deleteRepresentative('${listKey}', ${index})"><i class="fas fa-times"></i></button>
            <div class="form-group">
                <label>Description</label>
                <textarea rows="2" class="rich-text-area" oninput="updateRepresentative('${listKey}', ${index}, 'description', this.value)">${rep.description || ''}</textarea>
            </div>
            <div id="sig-container-${listKey}-${index}"></div>
            <div class="form-grid mt-2">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" value="${rep.name || ''}" oninput="updateRepresentative('${listKey}', ${index}, 'name', this.value)">
                </div>
                <div class="form-group">
                    <label>Title</label>
                    <input type="text" value="${rep.title || ''}" oninput="updateRepresentative('${listKey}', ${index}, 'title', this.value)">
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="text" value="${rep.date || ''}" oninput="updateRepresentative('${listKey}', ${index}, 'date', this.value)">
                </div>
            </div>
        `;
        container.appendChild(block);
        renderSignatureUI(`sig-container-${listKey}-${index}`, rep.signature, (sigData) => {
            protocolData.approval_data[listKey][index].signature = sigData;
        });
    });
}

function renderInvestigatorSignature() {
    renderSignatureUI('investigatorSignatureContainer', protocolData.approval_data.investigator_agreement.signature, (sigData) => {
        protocolData.approval_data.investigator_agreement.signature = sigData;
    });
}

function renderSignatureUI(containerId, savedSignature, onSave) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (savedSignature) {
        container.innerHTML = `
            <div class="signature-section">
                <label>Signature</label>
                <img src="${savedSignature}" class="saved-signature">
                <div class="mt-2">
                    <button class="btn secondary small" onclick="clearSignature('${containerId}')">Change Signature</button>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="signature-section">
                <label>Signature</label>
                <div class="mt-2">
                    <button class="btn secondary small" onclick="showSignaturePad('${containerId}')">E-Sign (Draw)</button>
                    <label class="btn secondary small">
                        Upload Signature Image
                        <input type="file" style="display:none" accept="image/*" onchange="uploadSignatureImage(this, '${containerId}')">
                    </label>
                </div>
                <div id="pad-area-${containerId}" style="display:none;">
                    <div class="signature-pad-container">
                        <canvas id="canvas-${containerId}"></canvas>
                        <div class="signature-pad-actions">
                            <button class="btn secondary small" onclick="hideSignaturePad('${containerId}')">Cancel</button>
                            <button class="btn secondary small" onclick="clearCanvas('canvas-${containerId}')">Clear</button>
                            <button class="btn primary small" onclick="saveSignature('canvas-${containerId}', '${containerId}')">Add Signature</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

function showSignaturePad(containerId) {
    const padArea = document.getElementById(`pad-area-${containerId}`);
    if (padArea) {
        padArea.style.display = 'block';
        setupCanvas(`canvas-${containerId}`);
    }
}

function hideSignaturePad(containerId) {
    const padArea = document.getElementById(`pad-area-${containerId}`);
    if (padArea) padArea.style.display = 'none';
}

function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let drawing = false;

    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 150;

    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    function startDrawing(e) {
        drawing = true;
        draw(e);
    }
    function draw(e) {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
    function stopDrawing() {
        drawing = false;
        ctx.beginPath();
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); stopDrawing(); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); });
}

function clearCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function saveSignature(canvasId, containerId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const sigData = canvas.toDataURL();

    if (containerId === 'investigatorSignatureContainer') {
        protocolData.approval_data.investigator_agreement.signature = sigData;
    } else if (containerId.startsWith('sig-container-sponsor_reps-')) {
        const index = parseInt(containerId.split('-').pop());
        protocolData.approval_data.sponsor_reps[index].signature = sigData;
    } else if (containerId.startsWith('sig-container-cro_reps-')) {
        const index = parseInt(containerId.split('-').pop());
        protocolData.approval_data.cro_reps[index].signature = sigData;
    }
    loadApprovalAgreementEditor();
}

function clearSignature(containerId) {
    if (containerId === 'investigatorSignatureContainer') {
        protocolData.approval_data.investigator_agreement.signature = null;
    } else if (containerId.startsWith('sig-container-sponsor_reps-')) {
        const index = parseInt(containerId.split('-').pop());
        protocolData.approval_data.sponsor_reps[index].signature = null;
    } else if (containerId.startsWith('sig-container-cro_reps-')) {
        const index = parseInt(containerId.split('-').pop());
        protocolData.approval_data.cro_reps[index].signature = null;
    }
    loadApprovalAgreementEditor();
}

function uploadSignatureImage(input, containerId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const sigData = e.target.result;
            if (containerId === 'investigatorSignatureContainer') {
                protocolData.approval_data.investigator_agreement.signature = sigData;
            } else if (containerId.startsWith('sig-container-sponsor_reps-')) {
                const index = parseInt(containerId.split('-').pop());
                protocolData.approval_data.sponsor_reps[index].signature = sigData;
            } else if (containerId.startsWith('sig-container-cro_reps-')) {
                const index = parseInt(containerId.split('-').pop());
                protocolData.approval_data.cro_reps[index].signature = sigData;
            }
            loadApprovalAgreementEditor();
        };
        reader.readAsDataURL(file);
    }
}

function addAmendmentRow() {
    if (!protocolData.approval_data.amendments) protocolData.approval_data.amendments = [];
    protocolData.approval_data.amendments.push({ document: '', date: '' });
    renderAmendments();
}
function updateAmendment(index, field, value) {
    protocolData.approval_data.amendments[index][field] = value;
}
function deleteAmendment(index) {
    protocolData.approval_data.amendments.splice(index, 1);
    renderAmendments();
}
function renderAmendments() {
    const body = document.getElementById('amendmentsTableBody');
    if (!body) return;
    body.innerHTML = '';
    (protocolData.approval_data.amendments || []).forEach((am, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" value="${am.document || ''}" class="full-width" oninput="updateAmendment(${index}, 'document', this.value)"></td>
            <td><input type="text" value="${am.date || ''}" class="full-width" oninput="updateAmendment(${index}, 'date', this.value)"></td>
            <td><button class="btn-icon" onclick="deleteAmendment(${index})"><i class="fas fa-trash"></i></button></td>
        `;
        body.appendChild(row);
    });
}

// --- Patient Synopsis Section Implementation ---

function loadPatientSynopsisEditor() {
    const editor = document.getElementById('synopsisEditor');
    if (!editor) return;
    const data = protocolData.synopsis_data;

    editor.innerHTML = `
        <div class="expandable-section">
            <div class="expandable-header">Trial Overview</div>
            <div class="expandable-content">
                <div class="form-grid">
                    <div class="form-group"><label>Title of Trial</label><textarea rows="2" oninput="updateSynopsisOverview('title', this.value)">${data.overview.title || ''}</textarea></div>
                    <div class="form-group"><label>Coordinating Investigator</label><input type="text" value="${data.overview.coordinating_investigator || ''}" oninput="updateSynopsisOverview('coordinating_investigator', this.value)"></div>
                    <div class="form-group"><label>Expert Committee</label><input type="text" value="${data.overview.expert_committee || ''}" oninput="updateSynopsisOverview('expert_committee', this.value)"></div>
                    <div class="form-group"><label>Investigators</label><input type="text" value="${data.overview.investigators || ''}" oninput="updateSynopsisOverview('investigators', this.value)"></div>
                    <div class="form-group"><label>Trial Sites</label><input type="text" value="${data.overview.trial_sites || ''}" oninput="updateSynopsisOverview('trial_sites', this.value)"></div>
                    <div class="form-group"><label>Planned Trial Period</label><input type="text" value="${data.overview.planned_period || ''}" oninput="updateSynopsisOverview('planned_period', this.value)"></div>
                    <div class="form-group"><label>First Patient First Visit</label><input type="text" value="${data.overview.fpfv || ''}" oninput="updateSynopsisOverview('fpfv', this.value)"></div>
                    <div class="form-group"><label>Last Patient Last Visit</label><input type="text" value="${data.overview.lplv || ''}" oninput="updateSynopsisOverview('lplv', this.value)"></div>
                    <div class="form-group"><label>Clinical Phase</label><input type="text" value="${data.overview.clinical_phase || ''}" oninput="updateSynopsisOverview('clinical_phase', this.value)"></div>
                </div>
            </div>
        </div>

        <div class="expandable-section">
            <div class="expandable-header">Objectives</div>
            <div class="expandable-content">
                ${renderSynopsisBullets('objectives', 'primary', 'Primary Objectives')}
                ${renderSynopsisBullets('objectives', 'secondary', 'Secondary Objectives')}
                ${renderSynopsisBullets('objectives', 'exploratory', 'Exploratory Objectives')}
            </div>
        </div>

        <div class="expandable-section">
            <div class="expandable-header">Endpoints</div>
            <div class="expandable-content">
                ${renderSynopsisBullets('endpoints', 'primary', 'Primary Endpoints')}
                ${renderSynopsisBullets('endpoints', 'secondary', 'Secondary Endpoints')}
                ${renderSynopsisBullets('endpoints', 'exploratory', 'Exploratory Endpoints')}
            </div>
        </div>

        <div class="expandable-section">
            <div class="expandable-header">Study Flowchart Section</div>
            <div class="expandable-content">
                <div id="synopsisFlowchartsList"></div>
                <button class="btn secondary" onclick="addSynopsisFlowchart()"><i class="fas fa-plus"></i> Add Flowchart</button>
            </div>
        </div>

        <div class="expandable-section">
            <div class="expandable-header">Number of Patients</div>
            <div class="expandable-content">
                <div class="form-group">
                    <label>Planned Number of Patients</label>
                    <input type="number" value="${data.num_patients || ''}" oninput="protocolData.synopsis_data.num_patients = this.value">
                </div>
            </div>
        </div>

        <div class="expandable-section">
            <div class="expandable-header">Inclusion Criteria</div>
            <div class="expandable-content">
                <textarea class="rich-text-area" rows="3" oninput="protocolData.synopsis_data.inclusion.text = this.value">${data.inclusion.text || ''}</textarea>
                <div id="inclusionPointsList" class="bullet-list-container"></div>
                <button class="btn secondary small mt-2" onclick="addSynopsisPoint('inclusion')"><i class="fas fa-plus"></i> Add Point</button>
            </div>
        </div>

        <div class="expandable-section">
            <div class="expandable-header">Exclusion Criteria</div>
            <div class="expandable-content">
                <textarea class="rich-text-area" rows="3" oninput="protocolData.synopsis_data.exclusion.text = this.value">${data.exclusion.text || ''}</textarea>
                <div id="exclusionPointsList" class="bullet-list-container"></div>
                <button class="btn secondary small mt-2" onclick="addSynopsisPoint('exclusion')"><i class="fas fa-plus"></i> Add Point</button>
            </div>
        </div>

        <div class="expandable-section">
            <div class="expandable-header">Study Team Section</div>
            <div class="expandable-content">
                <div class="form-group">
                    <label>Investigator Description</label>
                    <textarea class="rich-text-area" rows="3" oninput="protocolData.synopsis_data.team.investigator_desc = this.value">${data.team.investigator_desc || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Study Coordinator Description</label>
                    <textarea class="rich-text-area" rows="3" oninput="protocolData.synopsis_data.team.coordinator_desc = this.value">${data.team.coordinator_desc || ''}</textarea>
                </div>
            </div>
        </div>

        <div class="expandable-section">
            <div class="expandable-header">Tables Section</div>
            <div class="expandable-content">
                <div id="synopsisTablesList"></div>
                <button class="btn secondary" onclick="addSynopsisTable()"><i class="fas fa-plus"></i> Add Custom Table</button>
            </div>
        </div>

        <div class="form-group">
            <label>Statistical Methods</label>
            <textarea class="rich-text-area" rows="6" oninput="protocolData.synopsis_data.statistical_methods = this.value">${data.statistical_methods || ''}</textarea>
        </div>
    `;

    renderSynopsisFlowcharts();
    renderSynopsisCriteriaPoints('inclusion');
    renderSynopsisCriteriaPoints('exclusion');
    renderSynopsisTables();
}

function updateSynopsisOverview(field, value) {
    if (!protocolData.synopsis_data.overview) protocolData.synopsis_data.overview = {};
    protocolData.synopsis_data.overview[field] = value;
}

function renderSynopsisBullets(cat, type, label) {
    const list = protocolData.synopsis_data[cat][type] || [];
    let html = `<div class="form-group"><strong>${label}</strong><div class="bullet-list-container">`;
    list.forEach((bullet, index) => {
        html += `
            <div class="bullet-item">
                <textarea rows="1" oninput="updateSynopsisBullet('${cat}', '${type}', ${index}, this.value)">${bullet}</textarea>
                <button class="btn-icon" onclick="deleteSynopsisBullet('${cat}', '${type}', ${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
    });
    html += `</div><button class="btn secondary small" onclick="addSynopsisBullet('${cat}', '${type}')"><i class="fas fa-plus"></i> Add Bullet Point</button></div>`;
    return html;
}

function addSynopsisBullet(cat, type) {
    if (!protocolData.synopsis_data[cat][type]) protocolData.synopsis_data[cat][type] = [];
    protocolData.synopsis_data[cat][type].push('');
    loadPatientSynopsisEditor();
}
function updateSynopsisBullet(cat, type, index, value) {
    protocolData.synopsis_data[cat][type][index] = value;
}
function deleteSynopsisBullet(cat, type, index) {
    protocolData.synopsis_data[cat][type].splice(index, 1);
    loadPatientSynopsisEditor();
}

function addSynopsisFlowchart() {
    if (!protocolData.synopsis_data.flowcharts) protocolData.synopsis_data.flowcharts = [];
    protocolData.synopsis_data.flowcharts.push({ url: null, caption: '', description: '' });
    renderSynopsisFlowcharts();
}
function renderSynopsisFlowcharts() {
    const container = document.getElementById('synopsisFlowchartsList');
    if (!container) return;
    container.innerHTML = '';
    (protocolData.synopsis_data.flowcharts || []).forEach((fc, index) => {
        const block = document.createElement('div');
        block.className = 'representative-block';
        block.innerHTML = `
            <button class="btn-icon delete-block-btn" onclick="deleteSynopsisFlowchart(${index})"><i class="fas fa-times"></i></button>
            <div class="form-group">
                <label>Flowchart Image</label>
                <div class="mt-2">
                    ${fc.url ? `<img src="${API_BASE_URL}${fc.url}" style="max-width:300px; display:block; margin-bottom:10px;">` : '<div class="upload-placeholder"><i class="fas fa-image"></i><br>No image uploaded</div>'}
                    <label class="btn secondary small">Upload Image<input type="file" style="display:none" accept="image/*" onchange="uploadSynopsisFlowchart(this, ${index})"></label>
                </div>
            </div>
            <div class="form-group">
                <label>Caption</label>
                <input type="text" value="${fc.caption || ''}" oninput="updateSynopsisFlowchart(${index}, 'caption', this.value)">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea rows="2" oninput="updateSynopsisFlowchart(${index}, 'description', this.value)">${fc.description || ''}</textarea>
            </div>
        `;
        container.appendChild(block);
    });
}
async function uploadSynopsisFlowchart(input, index) {
    const file = input.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const response = await fetch(`${API_BASE_URL}/api/upload-image`, { method: 'POST', body: formData });
        const result = await response.json();
        protocolData.synopsis_data.flowcharts[index].url = result.url;
        renderSynopsisFlowcharts();
    } catch (e) {
        showToast('Upload failed', 'error');
    }
}
function updateSynopsisFlowchart(index, field, value) { protocolData.synopsis_data.flowcharts[index][field] = value; }
function deleteSynopsisFlowchart(index) {
    protocolData.synopsis_data.flowcharts.splice(index, 1);
    renderSynopsisFlowcharts();
}

function addSynopsisPoint(type) {
    if (!protocolData.synopsis_data[type].points) protocolData.synopsis_data[type].points = [];
    protocolData.synopsis_data[type].points.push('');
    renderSynopsisCriteriaPoints(type);
}
function renderSynopsisCriteriaPoints(type) {
    const container = document.getElementById(`${type}PointsList`);
    if (!container) return;
    container.innerHTML = '';
    (protocolData.synopsis_data[type].points || []).forEach((point, index) => {
        const div = document.createElement('div');
        div.className = 'bullet-item';
        div.innerHTML = `
            <span>${index + 1}.</span>
            <textarea rows="1" oninput="updateSynopsisPoint('${type}', ${index}, this.value)">${point}</textarea>
            <button class="btn-icon" onclick="deleteSynopsisPoint('${type}', ${index})"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    });
}
function updateSynopsisPoint(type, index, value) { protocolData.synopsis_data[type].points[index] = value; }
function deleteSynopsisPoint(type, index) {
    protocolData.synopsis_data[type].points.splice(index, 1);
    renderSynopsisCriteriaPoints(type);
}

function addSynopsisTable() {
    if (!protocolData.synopsis_data.tables) protocolData.synopsis_data.tables = [];
    protocolData.synopsis_data.tables.push({ title: 'New Table', headers: ['Col 1', 'Col 2'], rows: [['', '']] });
    renderSynopsisTables();
}
function renderSynopsisTables() {
    const container = document.getElementById('synopsisTablesList');
    if (!container) return;
    container.innerHTML = '';
    (protocolData.synopsis_data.tables || []).forEach((table, tIndex) => {
        const block = document.createElement('div');
        block.className = 'custom-table-container';
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <input type="text" value="${table.title}" oninput="protocolData.synopsis_data.tables[${tIndex}].title = this.value" style="font-weight:600; border:none; background:transparent;">
                <button class="btn-icon" onclick="deleteSynopsisTable(${tIndex})"><i class="fas fa-trash"></i></button>
            </div>
            <table class="dynamic-table mt-2">
                <thead><tr>
        `;
        (table.headers || []).forEach((h, hIndex) => {
            html += `<th><input type="text" value="${h}" oninput="updateSynopsisTableHeader(${tIndex}, ${hIndex}, this.value)" style="width:80px"></th>`;
        });
        html += `<th><i class="fas fa-plus" onclick="addSynopsisTableColumn(${tIndex})"></i></th></tr></thead><tbody>`;
        (table.rows || []).forEach((row, rIndex) => {
            html += `<tr>`;
            row.forEach((cell, cIndex) => {
                html += `<td><textarea oninput="updateSynopsisTableCell(${tIndex}, ${rIndex}, ${cIndex}, this.value)">${cell}</textarea></td>`;
            });
            html += `<td><button class="btn-icon" onclick="deleteSynopsisTableRow(${tIndex}, ${rIndex})"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        html += `</tbody></table><button class="btn secondary small mt-2" onclick="addSynopsisTableRow(${tIndex})">Add Row</button>`;
        block.innerHTML = html;
        container.appendChild(block);
    });
}
function updateSynopsisTableHeader(tIdx, hIdx, val) { protocolData.synopsis_data.tables[tIdx].headers[hIdx] = val; }
function updateSynopsisTableCell(tIdx, rIdx, cIdx, val) { protocolData.synopsis_data.tables[tIdx].rows[rIdx][cIdx] = val; }
function addSynopsisTableColumn(tIdx) {
    protocolData.synopsis_data.tables[tIdx].headers.push('New Header');
    protocolData.synopsis_data.tables[tIdx].rows.forEach(r => r.push(''));
    renderSynopsisTables();
}
function addSynopsisTableRow(tIdx) {
    protocolData.synopsis_data.tables[tIdx].rows.push(new Array(protocolData.synopsis_data.tables[tIdx].headers.length).fill(''));
    renderSynopsisTables();
}
function deleteSynopsisTableRow(tIdx, rIdx) {
    protocolData.synopsis_data.tables[tIdx].rows.splice(rIdx, 1);
    renderSynopsisTables();
}
function deleteSynopsisTable(tIdx) {
    if (confirm('Delete table?')) {
        protocolData.synopsis_data.tables.splice(tIdx, 1);
        renderSynopsisTables();
    }
}

// --- Section Management ---

function addMainSection() {
    openInputModal("Enter Main Section Title", (title) => {
        const keys = Object.keys(protocolData.sections).map(Number).filter(k => !isNaN(k));
        const maxId = keys.length > 0 ? Math.max(...keys) : 11;
        const newId = maxId + 1;

        if (!protocolData.sections[newId]) {
            protocolData.sections[newId] = {
                main: '',
                title: title,
                subsections: [],
                notes: ''
            };
        }
        refreshSectionList();
        showToast('Section added', 'success');
    });
}

function addSubsection(sectionId) {
    openInputModal("Enter Subsection Title", (title) => {
        if (!protocolData.sections[sectionId]) {
            protocolData.sections[sectionId] = { subsections: [] };
        }
        if (!Array.isArray(protocolData.sections[sectionId].subsections)) {
            const oldSubs = protocolData.sections[sectionId].subsections;
            if (oldSubs && typeof oldSubs === 'object') {
                protocolData.sections[sectionId].subsections = Object.values(oldSubs).map(s => typeof s === 'string' ? { title: s, content: '' } : s);
            } else {
                protocolData.sections[sectionId].subsections = [];
            }
        }

        protocolData.sections[sectionId].subsections.push({
            title: title,
            content: ''
        });

        refreshSectionList();
        showToast('Subsection added', 'success');
    });
}

function deleteSubsection(sectionId, index) {
    if (confirm('Delete this subsection?')) {
        if (protocolData.sections[sectionId] && protocolData.sections[sectionId].subsections) {
            protocolData.sections[sectionId].subsections.splice(index, 1);
            refreshSectionList();
            showToast('Subsection deleted', 'success');
        }
    }
}

function refreshSectionList() {
    const struct = Object.entries(protocolData.sections).map(([k, v]) => ({
        id: k,
        title: v.title || ('Section ' + k),
        subsections: v.subsections || []
    }));
    struct.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    populateSectionList(struct);
}

async function runQC() {
    updateStatus('Running Quality Check...');
    const reportContent = document.getElementById('qcReportContent');
    reportContent.innerHTML = '<div class="qc-empty-state"><i class="fas fa-spinner fa-spin"></i><p>Analyzing protocol data...</p></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/check-qc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(protocolData)
        });

        if (!response.ok) {
            throw new Error('Failed to run QC check');
        }

        const report = await response.json();
        displayQCReport(report);
        updateStatus('Quality Check completed');
    } catch (error) {
        console.error('Error running QC:', error);
        reportContent.innerHTML = `
            <div class="qc-empty-state">
                <i class="fas fa-exclamation-triangle" style="color: #e74c3c;"></i>
                <p>Error running Quality Check: ${error.message}</p>
                <button class="btn secondary" onclick="runQC()">Try Again</button>
            </div>
        `;
        showToast('Error running Quality Check', 'error');
    }
}

function displayQCReport(report) {
    const reportContent = document.getElementById('qcReportContent');

    if (report.length === 0) {
        reportContent.innerHTML = `
            <div class="qc-empty-state">
                <i class="fas fa-check-circle"></i>
                <p>Excellent! No missing items or issues found in the protocol.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="qc-table">
            <thead>
                <tr>
                    <th>Section</th>
                    <th>Issue</th>
                    <th>Severity</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    report.forEach(item => {
        const severityClass = item.severity.toLowerCase() === 'mandatory' ? 'severity-mandatory' : 'severity-optional';
        html += `
            <tr>
                <td><strong>${item.section_name}</strong></td>
                <td>${item.missing_item}</td>
                <td><span class="severity-badge ${severityClass}">${item.severity}</span></td>
                <td><span class="status-pending"><i class="fas fa-clock"></i> ${item.status}</span></td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    reportContent.innerHTML = html;
}

/* --- Dashboard Logic --- */
async function refreshDashboard() {
    if (!currentProtocolId) {
        // Try to get from protocolData if it was loaded
        if (protocolData.protocol_id) {
            currentProtocolId = protocolData.protocol_id;
        } else {
            console.log("No protocol ID available for dashboard");
            return;
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/${currentProtocolId}`);
        if (!response.ok) throw new Error("Dashboard fetch failed");

        const data = await response.json();
        renderDashboard(data);
    } catch (error) {
        console.error("Dashboard Error:", error);
    }
}

function renderDashboard(data) {
    // 1. Update Overview Metrics
    document.getElementById('dash-progress').textContent = `${Math.round(data.progressMetrics.progress_percentage)}%`;
    document.getElementById('dash-progress-bar').style.width = `${data.progressMetrics.progress_percentage}%`;
    document.getElementById('dash-qc').textContent = `${data.progressMetrics.qc_score}%`;
    document.getElementById('dash-sections').textContent = `${data.progressMetrics.completed_sections_count}/${data.progressMetrics.total_sections}`;
    document.getElementById('dash-words').textContent = data.progressMetrics.word_count.toLocaleString();
    document.getElementById('dash-last-edit').textContent = data.progressMetrics.last_edited_section || 'None';

    // 2. Complexity
    document.getElementById('dash-complexity').textContent = data.overview.complexity_score;
    const rankEl = document.getElementById('dash-complexity-rank');
    rankEl.textContent = data.overview.complexity_rank;
    rankEl.style.background = data.overview.complexity_rank === 'High' ? '#e53e3e' : (data.overview.complexity_rank === 'Medium' ? '#d69e2e' : '#38a169');

    document.getElementById('dash-arms').textContent = data.designIntelligence.study_arms;
    document.getElementById('dash-dosages').textContent = data.designIntelligence.dosages;
    document.getElementById('dash-timeline').textContent = data.designIntelligence.timeline_events;

    // 3. Render Charts
    renderEndpointChart(data.entityDistribution);
    renderPopulationChart(data.populationMetrics);
    renderDemographicsCharts(data.populationMetrics);
    renderSafetyChart(data.safetyMetrics);
}

function renderEndpointChart(dist) {
    const ctx = document.getElementById('endpointChart').getContext('2d');
    const labels = ['Primary', 'Secondary', 'Exploratory'];
    const values = [
        dist.primary_endpoint || 0,
        dist.secondary_endpoint || 0,
        dist.exploratory_endpoint || 0
    ];

    if (dashboardCharts.endpoint) dashboardCharts.endpoint.destroy();

    dashboardCharts.endpoint = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#3182ce', '#63b3ed', '#bee3f8'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function renderPopulationChart(pop) {
    const ctx = document.getElementById('populationChart').getContext('2d');
    if (dashboardCharts.population) dashboardCharts.population.destroy();

    dashboardCharts.population = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Inclusion', 'Exclusion'],
            datasets: [{
                label: 'Criteria Count',
                data: [pop.inclusion || 0, pop.exclusion || 0],
                backgroundColor: ['#48bb78', '#f56565']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });
}

function renderDemographicsCharts(pop) {
    // Gender
    const gCtx = document.getElementById('genderChart').getContext('2d');
    if (dashboardCharts.gender) dashboardCharts.gender.destroy();

    const gLabels = Object.keys(pop.gender);
    const gValues = Object.values(pop.gender);

    dashboardCharts.gender = new Chart(gCtx, {
        type: 'pie',
        data: {
            labels: gLabels.length ? gLabels : ['No Data'],
            datasets: [{
                data: gValues.length ? gValues : [1],
                backgroundColor: ['#ed64a6', '#4299e1', '#cbd5e0']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'Gender' }, legend: { display: false } }
        }
    });

    // Age
    const aCtx = document.getElementById('ageChart').getContext('2d');
    if (dashboardCharts.age) dashboardCharts.age.destroy();

    dashboardCharts.age = new Chart(aCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(pop.age_groups),
            datasets: [{
                label: 'Patients',
                data: Object.values(pop.age_groups),
                backgroundColor: '#9f7aea'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'Age Groups' }, legend: { display: false } }
        }
    });
}

function renderSafetyChart(safety) {
    const ctx = document.getElementById('safetyChart').getContext('2d');
    if (dashboardCharts.safety) dashboardCharts.safety.destroy();

    dashboardCharts.safety = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: ['Safety Measures'],
            datasets: [{
                data: [safety.total_measures || 0],
                backgroundColor: ['rgba(52, 152, 219, 0.5)']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { beginAtZero: true } }
        }
    });
}

async function downloadInterpretedReport(format) {
    const protocolId = protocolData.protocol_id || currentProtocolId;
    if (!protocolId) {
        showToast('Please save the protocol first to generate an interpretation report.', 'warning');
        return;
    }

    try {
        showProgress(true);
        updateStatus(`Generating interpreted ${format.toUpperCase()} report...`);

        const response = await fetch(`${API_BASE_URL}/api/generate-interpreted-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ protocol_id: protocolId, format: format })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to generate interpreted report');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Protocol_${protocolId}_Interpreted.${format === 'word' ? 'docx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast(`Interpreted ${format.toUpperCase()} report downloaded!`, 'success');
        updateStatus('Interpreted report downloaded');
    } catch (error) {
        console.error('Error downloading interpreted report:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        showProgress(false);
    }
}

// ---- Protocol Interpretation Tab (Section 4) ----

let _interpFields = []; // in-memory store for currently loaded fields

async function loadInterpretationTab() {
    const container = document.getElementById('interpretationTableContainer');
    const protocolId = protocolData.protocol_id || currentProtocolId;

    if (!protocolId) {
        container.innerHTML = `<div class="interp-empty">
            <i class="fas fa-exclamation-triangle" style="color:#f39c12;font-size:2rem;"></i>
            <p>No protocol saved yet. Please fill in and <strong>Save</strong> your protocol first.</p>
        </div>`;
        return;
    }

    container.innerHTML = `<p class="placeholder"><i class="fas fa-spinner fa-spin"></i> Fetching interpreted fields...</p>`;

    try {
        const resp = await fetch(`${API_BASE_URL}/api/get-protocol-interpretation/${protocolId}`);
        if (!resp.ok) throw new Error('Failed to fetch interpretation data');
        const data = await resp.json();
        _interpFields = data.fields || [];
        renderInterpretationTable(_interpFields);
    } catch (err) {
        container.innerHTML = `<div class="interp-empty"><i class="fas fa-times-circle" style="color:#e74c3c;font-size:2rem;"></i><p>${err.message}</p></div>`;
    }
}

function renderInterpretationTable(fields) {
    const container = document.getElementById('interpretationTableContainer');
    if (!fields || fields.length === 0) {
        container.innerHTML = `<div class="interp-empty">
            <i class="fas fa-database" style="font-size:2rem;opacity:.4;"></i>
            <p>No interpreted fields found. Try saving the protocol first.</p>
        </div>`;
        return;
    }

    let html = `<table class="interp-table">
        <thead>
            <tr>
                <th style="width:220px;">Field Name</th>
                <th>Extracted Value</th>
            </tr>
        </thead><tbody>`;

    fields.forEach((f, idx) => {
        const isTable = f.field_name.toLowerCase() === 'table';
        const conf = parseFloat(f.confidence_score || 1.0);
        const isLow = conf < 1.0;
        
        html += `<tr class="interp-row${isLow ? ' interp-row-low' : ''}" data-field="${f.field_name.toLowerCase()}">
            <td class="field-name-cell">
                <span>${f.field_name}</span>
                ${isLow ? '<span class="interp-badge">Review</span>' : ''}
            </td>
            <td>`;

        if (isTable && protocolData && protocolData.soa_data && protocolData.soa_data.table) {
            // Render a neat HTML table for SoA
            const soa = protocolData.soa_data.table;
            html += `<div class="soa-interp-preview">
                <table class="soa-preview-table">
                    <thead><tr><th>Procedures</th>${(soa.headers || []).map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${Object.entries(soa.rows || {}).map(([proc, checks]) => `
                            <tr>
                                <td>${proc}</td>
                                ${checks.map(c => `<td>${c ? 'X' : ''}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
            // Keep a hidden textarea for saving if needed, or just skip if we don't want to edit the table here
            html += `<textarea id="interp-val-${idx}" data-field-name="${f.field_name}" style="display:none;">${f.field_value || ''}</textarea>`;
        } else {
            html += `<textarea id="interp-val-${idx}" data-field-name="${f.field_name}"
                class="interp-textarea${isLow ? ' interp-textarea-low' : ''}"
                rows="2">${f.field_value || ''}</textarea>`;
        }

        html += `</td></tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function filterInterpretationFields(query) {
    const q = query.toLowerCase().trim();
    const filtered = !q ? _interpFields : _interpFields.filter(f =>
        f.field_name.toLowerCase().includes(q) ||
        (f.field_value || '').toLowerCase().includes(q)
    );
    renderInterpretationTable(filtered);
}

async function saveInterpretation() {
    const protocolId = protocolData.protocol_id || currentProtocolId;
    if (!protocolId) {
        showToast('No protocol ID found. Please save the protocol first.', 'warning');
        return;
    }
    const textareas = document.querySelectorAll('#interpretationTableContainer .interp-textarea');
    const updatedFields = [];
    textareas.forEach(ta => {
        updatedFields.push({
            field_name: ta.getAttribute('data-field-name'),
            field_value: ta.value,
            confidence_score: 1.0 // user-edited = full confidence
        });
    });
    if (!updatedFields.length) { showToast('Nothing to save.', 'warning'); return; }
    try {
        showProgress(true);
        const resp = await fetch(`${API_BASE_URL}/api/save-protocol-interpretation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ protocol_id: protocolId, fields: updatedFields })
        });
        if (!resp.ok) throw new Error('Save failed');
        showToast(`${updatedFields.length} fields saved!`, 'success');
        loadInterpretationTab(); // Refresh to show 100% confidence
    } catch (err) {
        showToast(`Error saving: ${err.message}`, 'error');
    } finally {
        showProgress(false);
    }
}

/**
 * Re-Extract Fields:
 * 1. Saves current protocol data (triggers fresh _extract_interpreted_fields on backend)
 * 2. Reloads the interpretation tab to show newly extracted values.
 * Use this when the DB has stale/wrong data.
 */
async function reExtractInterpretationFields() {
    const container = document.getElementById('interpretationTableContainer');
    const protocolId = protocolData.protocol_id || currentProtocolId;

    if (!protocolId) {
        showToast('Please fill in and Save the protocol first before re-extracting.', 'warning');
        return;
    }

    try {
        showProgress(true);
        container.innerHTML = `<p class="placeholder"><i class="fas fa-magic fa-spin"></i> Re-extracting all 12 fields from current protocol data...</p>`;

        // Save protocol to DB → this triggers _extract_interpreted_fields with fresh formatting
        await saveAll(true); // silent = true (no toast from saveAll)

        // Small delay to let DB stabilize
        await new Promise(res => setTimeout(res, 600));

        // Now reload interpretation data
        await loadInterpretationTab();

        showToast('Fields re-extracted successfully from latest protocol data!', 'success');
    } catch (err) {
        showToast(`Re-extract failed: ${err.message}`, 'error');
    } finally {
        showProgress(false);
    }
}
