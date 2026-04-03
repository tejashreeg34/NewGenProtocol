import os
import json
import base64
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
        "protocol_title": "A Phase II, Randomized, Double\u2013Blind, Placebo\u2014Controlled Study with Underscore_Test",
        "protocol_number": "PROTO\u2010001_v1",
        "version_number": "v1.1",
        "protocol_date": "2026-02-22",
        "approval_data": {
            "details": {
                "protocol_name": "Test Protocol with\u2013Dashes",
                "protocol_number": "PROTO_SIGN_001",
                "imp": "Drug_X",
                "indication": "Condition_Y",
                "clinical_phase": "Phase_II",
                "gcp_statement": "This study follows ICH_GCP guidelines.",
                "approval_statement": "Approved by the Sponsor_Board."
            },
            "sponsor_reps": [
                {
                    "name": "Mr. R. Sandeep Kumar",
                    "title": "Director, Clinical_Development",
                    "organization": "Sponsor_Org",
                    "date": "22/2/2026",
                    "signature": BASE64_SIGNATURE
                }
            ],
            "investigator_agreement": {
                "description": "I agree to conduct the study_protocol.",
                "name": "Dr. Latha Venugopal",
                "title": "Pulmonology_Specialist",
                "facility": "Medical_Center",
                "date": "22/2/2026",
                "signature": BASE64_SIGNATURE
            }
        },
        "sections": {
            "2": {
                "title": "INTRODUCTION",
                "main": "This is a test of dashes\u2013and underscores_in the body text.",
                "subsections": [
                    {
                        "title": "Background_Info",
                        "content": "Special chars: \u201cSmart Quotes\u201d, \u2014Em Dash, \u00a0Non-Breaking Space."
                    }
                ]
            }
        }
    }

    print("\n--- Testing Word Generation ---")
    try:
        word_path = generate_complete_word_document(test_data)
        print(f"Word document generated: {word_path}")
    except Exception as e:
        print(f"Word generation failed: {str(e)}")

    print("\n--- Testing PDF Generation ---")
    try:
        pdf_path = generate_pdf_document(test_data)
        print(f"PDF document generated: {pdf_path}")
    except Exception as e:
        import traceback
        print(f"PDF generation failed: {str(e)}")
        traceback.print_exc()

    print("\n--- Verification Complete ---")

if __name__ == "__main__":
    test_generation()
