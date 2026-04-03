import os
import io
import json
import base64
from datetime import datetime
import sys

# Add the current directory to sys.path to import our generators
sys.path.append(os.getcwd())

from document_generator import generate_complete_word_document
from pdf_generator import generate_pdf_document

# A small valid blue square PNG
BASE64_SIGNATURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPhfz0AEYBxVSF+FAP5IEP32B669AAAAAElFTkSuQmCC"

def test_generation():
    print("--- Starting Reproduce Masking Verification ---")
    
    # Text from user's image with non-breaking hyphens
    # 22\u201102\u20112026 and ICH\u2011GCP
    user_text = "I, the undersigned Investigator, confirm that I have read and understood this clinical trial protocol (Version 1.0 dated 22\u201102\u20112026). I agree to conduct this study in accordance with the protocol, ICH\u2011GCP guidelines, applicable ethical and regulatory requirements, and to ensure the protection, safety, and confidentiality of all study participants."
    
    test_data = {
        "protocol_title": "Test Protocol with \u2011 Non-Breaking Hyphen",
        "protocol_number": "PROTO\u2010001_v1",
        "version_number": "v1.1",
        "protocol_date": "2026-02-22",
        "approval_data": {
            "details": {
                "protocol_name": "Test Protocol",
                "protocol_number": "P123",
                "imp": "Drug\u2011X",
                "indication": "Asthma",
                "clinical_phase": "Phase II",
                "investigators": "Dr. Smith",
                "gcp_statement": "ICH\u2011GCP Guidelines",
                "approval_statement": "Approved"
            },
            "sponsor_reps": [
                {
                    "name": "Sandeep Kumar",
                    "title": "Director",
                    "organization": "BioAdvance",
                    "date": "22\u201102\u20112026",
                    "signature": BASE64_SIGNATURE
                }
            ],
            "investigator_agreement": {
                "description": user_text,
                "name": "Dr. Ananya R. Mehta",
                "title": "Principal Investigator, Pulmonary Medicine",
                "facility": "Chennai Clinical Research Institute",
                "date": "22\u201102\u20112026",
                "signature": BASE64_SIGNATURE
            }
        },
        "soa_data": {
            "table": {
                "headers": ["V1", "V2"],
                "rows": {"Procedure\u2011X": [True, False]}
            }
        },
        "sections": {
            "2": {
                "title": "INTRODUCTION",
                "main": "Text with \u201cquotes\u201d and \u2014 emdash and _ underscore.",
                "subsections": [
                    {
                        "title": "Sub\u2011Section",
                        "content": "More content."
                    }
                ]
            }
        }
    }

    print("\n--- Testing PDF Generation (Checking Masking) ---")
    try:
        pdf_path = generate_pdf_document(test_data)
        print(f"PDF document generated: {pdf_path}")
        print("Please check the generated PDF for black boxes in the Investigator Agreement section.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"PDF generation failed: {str(e)}")

    print("\n--- Verification Complete ---")

if __name__ == "__main__":
    test_generation()
