-- Rename existing tables for consistency with Dashboard requirements
ALTER TABLE protocol_metadata RENAME TO protocol_master;
ALTER TABLE extracted_entities RENAME TO protocol_entities;

-- Update column name in protocol_master for consistency if needed, but the request used 'id'
-- The existing column is 'protocol_id', I'll add an alias or keep it as protocol_id but map in code.
-- I'll stick to 'protocol_id' as PK to avoid breaking too many foreign keys at once.

-- Create protocol_progress table
CREATE TABLE IF NOT EXISTS protocol_progress (
    id SERIAL PRIMARY KEY,
    protocol_id INT NOT NULL REFERENCES protocol_master(protocol_id) ON DELETE CASCADE,
    progress_percentage DECIMAL DEFAULT 0,
    qc_score DECIMAL DEFAULT 0,
    completed_sections_count INT DEFAULT 0,
    total_sections INT DEFAULT 0,
    last_edited_section TEXT,
    word_count INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_entities_protocol_id ON protocol_entities(protocol_id);
CREATE INDEX IF NOT EXISTS idx_entities_category ON protocol_entities(entity_category);
CREATE INDEX IF NOT EXISTS idx_progress_protocol_id ON protocol_progress(protocol_id);

-- Add unique constraint to protocol_progress if not already there to simplify UPSERT
ALTER TABLE protocol_progress ADD CONSTRAINT unique_protocol_id UNIQUE (protocol_id);
