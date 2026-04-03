import re
import logging
from database import execute_query, get_db_connection

logger = logging.getLogger(__name__)

class ExtractionEngine:
    def __init__(self):
        # Regex Patterns
        self.patterns = {
            "demographic": [
                {
                    "key": "Gender",
                    "regex": r"\b(Male|Female|Both)\b",
                    "type": "exact"
                },
                {
                    "key": "Age",
                    "regex": r"(?:Age|Aged)\s*(?:>=|>=|at least|greater than or equal to)\s*(\d+)",
                    "format": ">={0}"
                },
                {
                    "key": "Age",
                    "regex": r"(?:Age|Aged)\s*(?:<=|<=|up to|less than or equal to)\s*(\d+)",
                    "format": "<={0}"
                },
                {
                    "key": "Age",
                    "regex": r"(?:Age|Aged)?\s*(?:between|from)\s*(\d+)\s*(?:and|to|–|-)\s*(\d+)",
                    "format": "{0}-{1}"
                },
                {
                    "key": "Age",
                    "regex": r"\b(\d+)\s*[-–]\s*(\d+)\b",
                    "format": "{0}-{1}"
                }
            ],
            "dosage": [
                {
                    "key": "Dose",
                    "regex": r"(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg)\b",
                    "format": "{0} {1}"
                }
            ],
            "timeline": [
                {
                    "key": "Week",
                    "regex": r"\bWeek\s*(\d+)\b",
                    "format": "{0}"
                },
                {
                    "key": "Day",
                    "regex": r"\bDay\s*(\d+)\b",
                    "format": "{0}"
                },
                {
                    "key": "Month",
                    "regex": r"\bMonth\s*(\d+)\b",
                    "format": "{0}"
                }
            ],
            "clinical_score": [
                {
                    "key": "Score Threshold",
                    "regex": r"(Mayo|score)\s*(?:score)?\s*(<=|>=|≤|≥|=|<|>)\s*(\d+)",
                    "format": "{0} {1} {2}"
                }
            ],
            "safety": [
                {
                    "key": "Safety Parameter",
                    "regex": r"\b(ECG|12-lead|Vital signs|Laboratory abnormalities|Adverse events)\b",
                    "type": "exact"
                }
            ],
            "endpoint_type": [
                {
                    "key": "Type",
                    "regex": r"\b(Primary|Secondary|Exploratory)\s+endpoint\b",
                    "format": "{0}"
                }
            ]
        }

    def extract_and_store(self, protocol_id, section_name, raw_text):
        """
        Extracts structured entities and stores them in extracted_entities table.
        """
        if not raw_text:
            return

        try:
            extracted_count = 0
            entities = []

            for category, pattern_list in self.patterns.items():
                for p in pattern_list:
                    regex = p["regex"]
                    matches = re.finditer(regex, raw_text, re.IGNORECASE)
                    
                    for match in matches:
                        groups = match.groups()
                        key = p["key"]
                        
                        if p.get("type") == "exact":
                            value = groups[0].capitalize()
                        elif "format" in p:
                            value = p["format"].format(*groups)
                        else:
                            value = groups[0]

                        entities.append({
                            "category": category,
                            "key": key,
                            "value": value
                        })

            if entities:
                self._save_to_db(protocol_id, section_name, entities)
                extracted_count = len(entities)
            
            logger.info(f"Extracted {extracted_count} entities from section '{section_name}' for protocol {protocol_id}")

        except Exception as e:
            logger.error(f"Error in ExtractionEngine for section {section_name}: {str(e)}")
            # Fail silently as per requirements

    def _save_to_db(self, protocol_id, section_name, entities):
        conn = get_db_connection()
        if not conn:
            return

        try:
            with conn.cursor() as cur:
                # Clear existing entities for this (protocol, section) to avoid accumulation on "Save Progress"
                delete_query = "DELETE FROM protocol_entities WHERE protocol_id = %s AND section_name = %s"
                cur.execute(delete_query, (protocol_id, section_name))
                
                for entity in entities:
                    insert_query = """
                        INSERT INTO protocol_entities 
                        (protocol_id, section_name, entity_category, entity_key, entity_value) 
                        VALUES (%s, %s, %s, %s, %s)
                    """
                    cur.execute(insert_query, (
                        protocol_id, 
                        section_name, 
                        entity['category'], 
                        entity['key'], 
                        entity['value']
                    ))
                
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to save extracted entities to DB: {str(e)}")
            conn.rollback()
        finally:
            conn.close()

extraction_engine = ExtractionEngine()
