-- Structured Intelligence Storage Module (SISM) Database Setup
-- Run this to create the necessary table for clinical entity storage

CREATE TABLE IF NOT EXISTS protocol_entities (
    id SERIAL PRIMARY KEY,
    protocol_id INT NOT NULL,
    section_name TEXT NOT NULL,
    entity_category TEXT NOT NULL,
    entity_key TEXT NOT NULL,
    entity_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add performance indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_protocol_id ON protocol_entities(protocol_id);
CREATE INDEX IF NOT EXISTS idx_entity_category ON protocol_entities(entity_category);
CREATE INDEX IF NOT EXISTS idx_entity_key ON protocol_entities(entity_key);
