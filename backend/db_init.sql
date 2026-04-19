-- Global Sequence for PGT ID
CREATE SEQUENCE IF NOT EXISTS pgt_id_seq START 1;

-- 1. Nextgen_title
CREATE TABLE IF NOT EXISTS Nextgen_title (
    pgt_id VARCHAR(20) PRIMARY KEY,
    protocol_title TEXT,
    protocol_identifier TEXT,
    nct_number TEXT,
    lead_medical_officer TEXT,
    sponsoring_entity TEXT,
    funding_agency TEXT,
    document_version TEXT,
    authorization_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Protocol_Approval_Agreement
CREATE TABLE IF NOT EXISTS Protocol_Approval_Agreement (
    id SERIAL PRIMARY KEY,
    pgt_id VARCHAR(20) REFERENCES Nextgen_title(pgt_id) ON DELETE CASCADE,
    protocol_name TEXT,
    protocol_number TEXT,
    indication TEXT,
    clinical_phase TEXT,
    coordinating_investigator TEXT,
    expert_committee TEXT,
    sponsor_name_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sponsor_Representation
CREATE TABLE IF NOT EXISTS Sponsor_Representation (
    id SERIAL PRIMARY KEY,
    pgt_id VARCHAR(20) REFERENCES Nextgen_title(pgt_id) ON DELETE CASCADE,
    description_role TEXT,
    name TEXT,
    title TEXT,
    date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. CRO_Representative
CREATE TABLE IF NOT EXISTS CRO_Representative (
    id SERIAL PRIMARY KEY,
    pgt_id VARCHAR(20) REFERENCES Nextgen_title(pgt_id) ON DELETE CASCADE,
    description_role TEXT,
    name TEXT,
    title TEXT,
    date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Investigator_Agreement
CREATE TABLE IF NOT EXISTS Investigator_Agreement (
    id SERIAL PRIMARY KEY,
    pgt_id VARCHAR(20) REFERENCES Nextgen_title(pgt_id) ON DELETE CASCADE,
    investigator_name TEXT,
    investigator_title TEXT,
    facility_location TEXT,
    city TEXT,
    state TEXT,
    date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Patient_Synopsis
CREATE TABLE IF NOT EXISTS Patient_Synopsis (
    id SERIAL PRIMARY KEY,
    pgt_id VARCHAR(20) REFERENCES Nextgen_title(pgt_id) ON DELETE CASCADE,
    title_of_trial TEXT,
    coordinating_investigator TEXT,
    expert_committee TEXT,
    investigators TEXT,
    trial_sites TEXT,
    planned_trial_period TEXT,
    fpfv TEXT,
    lplv TEXT,
    clinical_phase TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Trial_Objectives
CREATE TABLE IF NOT EXISTS Trial_Objectives (
    id SERIAL PRIMARY KEY,
    pgt_id VARCHAR(20) REFERENCES Nextgen_title(pgt_id) ON DELETE CASCADE,
    primary_objectives TEXT,
    secondary_objectives TEXT,
    exploratory_objectives TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Number_of_Patients
CREATE TABLE IF NOT EXISTS Number_of_Patients (
    id SERIAL PRIMARY KEY,
    pgt_id VARCHAR(20) REFERENCES Nextgen_title(pgt_id) ON DELETE CASCADE,
    number_of_patients TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Criteria
CREATE TABLE IF NOT EXISTS Criteria (
    id SERIAL PRIMARY KEY,
    pgt_id VARCHAR(20) REFERENCES Nextgen_title(pgt_id) ON DELETE CASCADE,
    inclusion_criteria TEXT,
    exclusion_criteria TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Quality_Report
CREATE TABLE IF NOT EXISTS Quality_Report (
    id SERIAL PRIMARY KEY,
    pgt_id VARCHAR(20) REFERENCES Nextgen_title(pgt_id) ON DELETE CASCADE,
    missing_field TEXT,
    description TEXT,
    tab TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Interpretation
CREATE TABLE IF NOT EXISTS Interpretation (
    id SERIAL PRIMARY KEY,
    pgt_id VARCHAR(20) REFERENCES Nextgen_title(pgt_id) ON DELETE CASCADE,
    protocol_title TEXT,
    protocol_number TEXT,
    protocol_name TEXT,
    phase TEXT,
    number_of_patients TEXT,
    study_endpoints_primary TEXT,
    study_endpoints_secondary TEXT,
    inclusion_criteria TEXT,
    exclusion_criteria TEXT,
    abbreviations TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
