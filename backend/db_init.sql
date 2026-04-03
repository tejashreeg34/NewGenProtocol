-- Database Creation Script for Protocol Generation Tool

-- Table for tracking protocols
CREATE TABLE IF NOT EXISTS protocol_master (
    protocol_id SERIAL PRIMARY KEY,
    external_id UUID UNIQUE, -- To link with JSON file IDs if needed
    protocol_name TEXT,
    status TEXT DEFAULT 'Draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing raw text of protocol sections
CREATE TABLE IF NOT EXISTS protocol_sections (
    id SERIAL PRIMARY KEY,
    protocol_id INT NOT NULL REFERENCES protocol_metadata(protocol_id) ON DELETE CASCADE,
    section_name TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing dynamic structured fields
CREATE TABLE IF NOT EXISTS structured_fields (
    id SERIAL PRIMARY KEY,
    section_id INT NOT NULL REFERENCES protocol_sections(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_protocol_sections_protocol_id ON protocol_sections(protocol_id);
CREATE INDEX IF NOT EXISTS idx_structured_fields_section_id ON structured_fields(section_id);

-- Table for storing protocol interpretations
CREATE TABLE IF NOT EXISTS protocol_interpretation (
    id SERIAL PRIMARY KEY,
    protocol_id INT NOT NULL REFERENCES protocol_master(protocol_id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_value TEXT,
    confidence_score FLOAT DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(protocol_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_protocol_interpretation_pid ON protocol_interpretation(protocol_id);
