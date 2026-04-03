import logging
import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from extraction_engine import extraction_engine
from database import execute_query

# Setup logging to console
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def test_sism():
    test_cases = [
        {
            "name": "Inclusion with age + gender",
            "section": "Inclusion Criteria",
            "text": "Participants must be Male or Female, aged between 18 and 65 years.",
            "expected_keys": ["Gender", "Age"]
        },
        {
            "name": "Endpoint with Mayo score + week",
            "section": "Objectives and Endpoints",
            "text": "The primary endpoint is the clinical remission at Week 12, defined as a Mayo score <= 2.",
            "expected_keys": ["Type", "Week", "Score Threshold"]
        },
        {
            "name": "Dose section with mg",
            "section": "Study Intervention",
            "text": "The starting dose is 50 mg administered orally once daily.",
            "expected_keys": ["Dose"]
        },
        {
            "name": "Safety section with ECG",
            "section": "Safety Assessments",
            "text": "A standard 12-lead ECG will be performed at each visit. Vital signs will be monitored.",
            "expected_keys": ["Safety Parameter"]
        },
        {
            "name": "Mixed complex paragraph",
            "section": "Summary",
            "text": "Both men and women (18-65) will receive 10.5 mg of Drug X. Primary endpoint is measured at Month 6. Adverse events will be recorded.",
            "expected_keys": ["Gender", "Age", "Dose", "Type", "Month", "Safety Parameter"]
        }
    ]

    protocol_id = 999999  # Dummy ID for testing
    
    # Clean up dummy data from previous runs
    execute_query("DELETE FROM extracted_entities WHERE protocol_id = %s", (protocol_id,))
    logger.info(f"Cleaned up test data for protocol_id {protocol_id}")

    for case in test_cases:
        logger.info(f"--- Running Test Case: {case['name']} ---")
        extraction_engine.extract_and_store(protocol_id, case['section'], case['text'])
        
        # Verify in DB
        query = "SELECT entity_key, entity_value FROM extracted_entities WHERE protocol_id = %s AND section_name = %s"
        results = execute_query(query, (protocol_id, case['section']), fetch=True)
        
        found_keys = [r['entity_key'] for r in results] if results else []
        logger.info(f"Entities found in DB: {results}")
        
        all_passed = True
        for key in case['expected_keys']:
            if key not in found_keys:
                logger.error(f"FAIL: Expected key '{key}' not found in DB")
                all_passed = False
        
        if all_passed:
            logger.info("PASS: All expected entities detected and stored.")
        else:
            logger.error("FAIL: Some entities were missed.")

    # Show final table content for the test protocol
    final_results = execute_query("SELECT * FROM extracted_entities WHERE protocol_id = %s", (protocol_id,), fetch=True)
    logger.info("\nFinal Extracted Entities in DB:")
    for r in final_results:
        logger.info(f"ID: {r['id']} | Category: {r['entity_category']} | Key: {r['entity_key']} | Value: {r['entity_value']}")

if __name__ == "__main__":
    test_sism()
