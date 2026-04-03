import os
import json
import base64
import io
from datetime import datetime
import sys

# Add the current directory to sys.path to import our generators
sys.path.append(os.getcwd())

from document_generator import generate_complete_word_document
from pdf_generator import generate_pdf_document

# Small 1x1 black pixel PNG for testing base64 signature
BASE64_SIGNATURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

def test_generation():
    print("--- Starting Final Verification ---")
    
    # Test data with special characters and Base64 signatures
    test_data = {
        "protocol_title": "A Phase II, Randomized, Double\u2011Blind, Placebo\u2011Controlled Study",
        "protocol_number": "PROTO\u2010001_v1",
        "version_number": "v1.1",
        "protocol_date": "2026-02-22",
        "approval_data": {
            "details": {
                "protocol_name": "Test Protocol",
                "protocol_number": "P123"
            },
            "sponsor_reps": [
                {
                    "name": "Sandeep Kumar",
                    "title": "Director",
                    "organization": "BioAdvance",
                    "date": "22/02/2026",
                    "signature": BASE64_SIGNATURE
                }
            ],
            "investigator_agreement": {
                "name": "Dr. Mehta",
                "title": "PI",
                "facility": "Center",
                "date": "22/02/2026",
                "signature": BASE64_SIGNATURE
            }
        },
        "soa_data": {
            "table": {
                "headers": ["V1", "V2"],
                "rows": {"Screening_Procedure": [True, False]}
            }
        }
    }

    print("\n--- Testing Word Generation ---")
    try:
        word_path = generate_complete_word_document(test_data)
        print(f"Word document generated: {word_path}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Word generation failed: {str(e)}")

    print("\n--- Testing PDF Generation ---")
    try:
        pdf_path = generate_pdf_document(test_data)
        print(f"PDF document generated: {pdf_path}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"PDF generation failed: {str(e)}")

    print("\n--- Verification Complete ---")

if __name__ == "__main__":
    test_generation()
