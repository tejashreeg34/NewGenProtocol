import logging
from database import execute_query, get_db_connection
import re

logger = logging.getLogger(__name__)

class StorageEngine:
    def __init__(self):
        pass

    def save_protocol_to_db(self, protocol_data, external_id=None):
        """
        Maps the JSON protocol data to relational tables.
        """
        protocol_name = protocol_data.get("protocol_title", "Untitled Protocol")
        
        # 1. Upsert protocol_master
        if external_id:
            logger.info(f"Upserting metadata for external_id: {external_id}")
            query = """
                INSERT INTO protocol_master (external_id, protocol_name, status)
                VALUES (%s::uuid, %s, %s)
                ON CONFLICT (external_id) DO UPDATE SET
                protocol_name = EXCLUDED.protocol_name,
                status = EXCLUDED.status
                RETURNING protocol_id
            """
            result = execute_query(query, (external_id, protocol_name, 'In Progress'), fetch=True)
        else:
            query = "INSERT INTO protocol_master (protocol_name) VALUES (%s) RETURNING protocol_id"
            result = execute_query(query, (protocol_name,), fetch=True)
        
        if not result or len(result) == 0:
            logger.error("Failed to upsert protocol metadata")
            return None
            
        protocol_id = result[0]['protocol_id']
        logger.info(f"Using protocol_id: {protocol_id} for database operations")
        
        # 2. Clear existing sections for this protocol to avoid duplicates on update
        execute_query("DELETE FROM protocol_sections WHERE protocol_id = %s", (protocol_id,))
        
        # 3. Process Standard Sections
        sections = protocol_data.get("sections", {})
        logger.info(f"Found {len(sections)} standard sections to process")
        for sec_id, sec_data in sections.items():
            title = sec_data.get("title", f"Section {sec_id}")
            self._process_section(protocol_id, title, sec_data)

        # 4. Process Synopsis Data (Special handling for Inclusion/Exclusion)
        synopsis_data = protocol_data.get("synopsis_data", {})
        if synopsis_data:
            logger.info("Synopsis data found, checking for Inclusion/Exclusion")
            # Inclusion Criteria
            inclusion = synopsis_data.get("inclusion", {})
            if inclusion and (inclusion.get("text") or inclusion.get("points")):
                logger.info("Processing Inclusion Criteria")
                self._process_section(protocol_id, "Inclusion Criteria", inclusion, is_special=True)
            
            # Exclusion Criteria
            exclusion = synopsis_data.get("exclusion", {})
            if exclusion and (exclusion.get("text") or exclusion.get("points")):
                logger.info("Processing Exclusion Criteria")
                self._process_section(protocol_id, "Exclusion Criteria", exclusion, is_special=True)

        # 5. Extract Interpretation Fields
        self._extract_interpreted_fields(protocol_id, protocol_data)

        return protocol_id

    def _extract_interpreted_fields(self, protocol_id, protocol_data):
        logger.info(f"Extracting interpretation fields for protocol_id: {protocol_id}")

        def safe_str(val):
            """Return stripped string or empty."""
            if val is None:
                return ''
            return str(val).strip()

        def format_criteria(criteria_dict):
            """Convert {text, points} dict to readable bullet text."""
            if not criteria_dict:
                return ''
            text = safe_str(criteria_dict.get('text', ''))
            points = criteria_dict.get('points', [])
            lines = []
            if text:
                lines.append(text)
            for p in points:
                if isinstance(p, dict):
                    pt = safe_str(p.get('text', '') or p.get('value', ''))
                else:
                    pt = safe_str(p)
                if pt:
                    lines.append(f"• {pt}")
            return '\n'.join(lines)

        def format_endpoints(ep_dict):
            """Convert {primary, secondary, exploratory} list dict to 'Primary: X; Secondary: Y' text."""
            if not ep_dict:
                return ''
            parts = []
            for key in ['primary', 'secondary', 'exploratory']:
                items = ep_dict.get(key, [])
                if items:
                    formatted = '; '.join([safe_str(i) for i in items if safe_str(i)])
                    if formatted:
                        parts.append(f"{key.capitalize()}: {formatted}")
            return '\n'.join(parts)

        def format_abbreviations(abbrv_list):
            """Convert list of {term, definition} to 'TERM - Definition' lines."""
            if not abbrv_list:
                return ''
            lines = []
            for item in abbrv_list:
                if isinstance(item, dict):
                    term = safe_str(item.get('term', ''))
                    defn = safe_str(item.get('definition', '') or item.get('meaning', ''))
                    if term:
                        lines.append(f"{term} – {defn}" if defn else term)
                else:
                    s = safe_str(item)
                    if s:
                        lines.append(s)
            return '\n'.join(lines)

        def format_soa_table(soa_table):
            """Summarise SoA table as column headers list + row count."""
            if not soa_table:
                return ''
            headers = soa_table.get('headers', [])
            rows = soa_table.get('rows', {})
            if not headers:
                return ''
            # Count rows
            if isinstance(rows, list):
                row_count = len(rows)
            elif isinstance(rows, dict):
                row_count = len(rows)
            else:
                row_count = 0
            header_list = ', '.join([safe_str(h) for h in headers if safe_str(h)])
            return f"Columns: {header_list}\nRows: {row_count} procedure(s)"

        NOT_SPECIFIED = "Not specified"

        # -------- Extract each field - ALWAYS upsert all 12 so they always appear --------

        # 1. Protocol Title
        val_title = safe_str(protocol_data.get('protocol_title', ''))
        self.upsert_protocol_interpretation(protocol_id, "Protocol Title", val_title or NOT_SPECIFIED, 1.0)

        # 2. Protocol Number
        val_num = safe_str(protocol_data.get('protocol_number', ''))
        self.upsert_protocol_interpretation(protocol_id, "Protocol Number", val_num or NOT_SPECIFIED, 1.0)

        # 3. Protocol Name
        val_name = safe_str(protocol_data.get('approval_data', {}).get('details', {}).get('protocol_name', ''))
        if not val_name:
            val_name = val_title  # fallback to title
        self.upsert_protocol_interpretation(protocol_id, "Protocol Name", val_name or NOT_SPECIFIED, 1.0)

        # 4. Phase
        val_phase = safe_str(protocol_data.get('synopsis_data', {}).get('overview', {}).get('clinical_phase', ''))
        if not val_phase:
            val_phase = safe_str(protocol_data.get('approval_data', {}).get('details', {}).get('clinical_phase', ''))
        self.upsert_protocol_interpretation(protocol_id, "Phase", val_phase or NOT_SPECIFIED, 1.0)

        # 5. Indication
        val_indication = safe_str(protocol_data.get('approval_data', {}).get('details', {}).get('indication', ''))
        self.upsert_protocol_interpretation(protocol_id, "Indication", val_indication or NOT_SPECIFIED, 1.0)

        # 6. Table (SOA) – human readable summary
        soa_table = protocol_data.get('soa_data', {}).get('table', {})
        soa_str = format_soa_table(soa_table)
        self.upsert_protocol_interpretation(protocol_id, "Table", soa_str or NOT_SPECIFIED, 1.0)

        # 7. Number of Patients
        synopsis = protocol_data.get('synopsis_data', {})
        val_patients = safe_str(synopsis.get('num_patients', ''))
        confidence = 1.0
        if not val_patients:
            text_to_search = val_title + " " + safe_str(synopsis.get('overview', {}).get('title', ''))
            match = re.search(r'(\d[\d,]*)\s+patients?', text_to_search, re.IGNORECASE)
            if match:
                val_patients = match.group(1)
                confidence = 0.8
        self.upsert_protocol_interpretation(protocol_id, "Number of Patients", val_patients or NOT_SPECIFIED, confidence)

        # 8. Study End Point – formatted readable text (never raw JSON)
        endpoints = synopsis.get('endpoints', {})
        ep_str = format_endpoints(endpoints)
        self.upsert_protocol_interpretation(protocol_id, "Study End Point", ep_str or NOT_SPECIFIED, 1.0)

        # 9. Inclusion Criteria – bullet text
        inclusion = synopsis.get('inclusion', {})
        incl_str = format_criteria(inclusion)
        self.upsert_protocol_interpretation(protocol_id, "Inclusion Criteria", incl_str or NOT_SPECIFIED, 1.0)

        # 10. Exclusion Criteria – bullet text
        exclusion = synopsis.get('exclusion', {})
        excl_str = format_criteria(exclusion)
        self.upsert_protocol_interpretation(protocol_id, "Exclusion Criteria", excl_str or NOT_SPECIFIED, 1.0)

        # 11. Overall Study Design – section main body only
        sections = protocol_data.get('sections', {})
        design_text = ''
        for sec_id, sec_data in sections.items():
            t = safe_str(sec_data.get('title', '')).lower()
            if any(k in t for k in ['study design', 'design']):
                main = safe_str(sec_data.get('main', ''))
                sub_parts = []
                for sub in sec_data.get('subsections', []):
                    sub_content = safe_str(sub.get('content', ''))
                    if sub_content:
                        sub_title = safe_str(sub.get('title', ''))
                        sub_parts.append(f"{sub_title}: {sub_content}" if sub_title else sub_content)
                design_text = main
                if sub_parts:
                    design_text += ('\n\n' if main else '') + '\n'.join(sub_parts)
                break
        design_conf = 0.9 if design_text.strip() else 1.0
        self.upsert_protocol_interpretation(protocol_id, "Overall Study Design", design_text.strip() or NOT_SPECIFIED, design_conf)

        # 12. Abbreviations – term – definition lines
        abbreviations = protocol_data.get('abbreviations', [])
        abbrv_str = format_abbreviations(abbreviations)
        self.upsert_protocol_interpretation(protocol_id, "Abbreviations", abbrv_str or NOT_SPECIFIED, 1.0)

    def _process_section(self, protocol_id, section_name, data, is_special=False):
        raw_text = ""
        if is_special:
            raw_text = data.get("text", "")
            points = data.get("points", [])
            if not raw_text and points:
                raw_text = "\n".join([p.get("text", "") if isinstance(p, dict) else str(p) for p in points])
        else:
            raw_text = data.get("main", "")
            # Append subsection content to raw_text
            subsections = data.get("subsections", [])
            for sub in subsections:
                raw_text += f"\n\n{sub.get('title')}\n{sub.get('content')}"

        # Insert into protocol_sections
        logger.info(f"Inserting section '{section_name}' for protocol_id: {protocol_id}")
        query = "INSERT INTO protocol_sections (protocol_id, section_name, raw_text) VALUES (%s, %s, %s) RETURNING id"
        result = execute_query(query, (protocol_id, section_name, raw_text), fetch=True)
        
        if not result:
            logger.error(f"Failed to insert section {section_name} into DB")
            return
            
        section_db_id = result[0]['id']
        logger.info(f"Section {section_name} saved with DB ID {section_db_id}")
        
        # Trigger Intelligent Extraction Engine (SISM)
        try:
            from extraction_engine import extraction_engine
            extraction_engine.extract_and_store(protocol_id, section_name, raw_text)
            
            # Update Progress Dashboard Metrics
            self._update_progress(protocol_id, section_name, raw_text)
        except Exception as e:
            logger.error(f"SISM Extraction failed for section {section_name}: {str(e)}")
            # Silent failure as per requirements
        
        # Extract structured fields (legacy logic - kept for backward compatibility)
        structured_fields = self._extract_fields(raw_text, data.get("points", []) if is_special else [])
        
        for name, value in structured_fields.items():
            query = "INSERT INTO structured_fields (section_id, field_name, field_value) VALUES (%s, %s, %s)"
            execute_query(query, (section_db_id, name, value))

    def _update_progress(self, protocol_id, section_name, raw_text):
        """Calculates and updates protocol progress metrics."""
        try:
            # 1. Total Sections Count (Assume a standard set or based on template)
            # For simplicity, we check how many unique sections exist in DB for this protocol
            sections_query = "SELECT COUNT(DISTINCT section_name) as count FROM protocol_sections WHERE protocol_id = %s"
            sections_res = execute_query(sections_query, (protocol_id,), fetch=True)
            completed_count = sections_res[0]['count'] if sections_res else 0
            
            total_template_sections = 11 # Typical for our template
            progress = min(100, (completed_count / total_template_sections) * 100)
            
            # 2. Word Count
            word_count = len(raw_text.split()) if raw_text else 0
            # Get current total word count
            wc_query = "SELECT SUM(LENGTH(raw_text) - LENGTH(REPLACE(raw_text, ' ', '')) + 1) as total_wc FROM protocol_sections WHERE protocol_id = %s"
            wc_res = execute_query(wc_query, (protocol_id,), fetch=True)
            total_word_count = wc_res[0]['total_wc'] if wc_res and wc_res[0]['total_wc'] else word_count

            # 3. UPSERT into protocol_progress
            upsert_query = """
                INSERT INTO protocol_progress 
                (protocol_id, progress_percentage, completed_sections_count, total_sections, last_edited_section, word_count, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (protocol_id) DO UPDATE SET
                progress_percentage = EXCLUDED.progress_percentage,
                completed_sections_count = EXCLUDED.completed_sections_count,
                last_edited_section = EXCLUDED.last_edited_section,
                word_count = EXCLUDED.word_count,
                updated_at = CURRENT_TIMESTAMP
            """
            execute_query(upsert_query, (
                protocol_id, progress, completed_count, total_template_sections, section_name, total_word_count
            ))
            
            logger.info(f"Progress updated for protocol {protocol_id}: {progress}%")
        except Exception as e:
            logger.error(f"Failed to update progress for protocol {protocol_id}: {str(e)}")

    def _extract_fields(self, text, points=[]):
        """
        Dynamically detects fields from text or list of points.
        Patterns: "Name: Value", "Name = Value", "Name >= Value", etc.
        """
        fields = {}
        
        # 1. From list of points (Inclusion/Exclusion often uses this)
        for i, p in enumerate(points):
            p_text = p.get("text", "") if isinstance(p, dict) else str(p)
            p_text = p_text.strip()
            if not p_text: continue

            match = re.search(r'^([^:=><]{2,30})[:=><]+(.+)$', p_text)
            if match:
                name = match.group(1).strip()
                val = match.group(2).strip()
                fields[name] = val
            else:
                # If no key-value found, treat the whole point as a requirement
                fields[f"Requirement {i+1}"] = p_text

        # 2. From raw text if points didn't cover much
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line: continue
            # Try to match "Field: Value" or "Field = Value"
            match = re.search(r'^([^:=><]+)[:=><]+(.+)$', line)
            if match:
                name = match.group(1).strip()
                val = match.group(2).strip()
                if len(name) < 50 and len(val) > 0: # Sanity check for "field name"
                    fields[name] = val
                    
        return fields

    def upsert_protocol_interpretation(self, protocol_id, field_name, field_value, confidence_score=1.0):
        """
        Upsert a specific interpreted field for a protocol.
        """
        query = """
            INSERT INTO protocol_interpretation(protocol_id, field_name, field_value, confidence_score)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (protocol_id, field_name)
            DO UPDATE SET 
                field_value = EXCLUDED.field_value, 
                confidence_score = EXCLUDED.confidence_score,
                updated_at = CURRENT_TIMESTAMP;
        """
        result = execute_query(query, (protocol_id, field_name, field_value, confidence_score))
        if result:
            logger.info(f"Upserted protocol interpretation for protocol_id {protocol_id}: {field_name}")
            return True
        else:
            logger.error(f"Failed to upsert protocol interpretation for protocol_id {protocol_id}: {field_name}")
            return False

storage_engine = StorageEngine()
