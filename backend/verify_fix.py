import json
import os
import sys
from datetime import datetime

# Add current directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from main import ProtocolData
    from document_generator import generate_complete_word_document
    from pdf_generator import generate_pdf_document
    print("Successfully imported modules.")
except ImportError as e:
    print(f"Error importing modules: {e}")
    sys.exit(1)

# Sample data matching the frontend's protocolData structure, but with extra fields!
sample_protocol_data = {
    "protocol_title": "Test Protocol Fix",
    "protocol_number": "TP-001",
    "version_number": "1.1",
    "extra_top_level_field": "This should be allowed now",
    "approval_data": {
        "details": {
            "protocol_name": "Test Protocol Name",
            "protocol_number": "TP-001",
            "gcp_statement": "This is a test GCP statement.",
            "legacy_field_from_old_frontend": "ignore me"
        },
        "sponsor_reps": [
            {
                "name": "John Doe", 
                "title": "Sponsor Rep", 
                "organization": "Test Org",
                "random_meta": {"key": "value"}
            }
        ],
        "investigator_agreement": {
            "name": "Jane Smith",
            "description": "I agree to this protocol.",
            "timestamp": "2026-02-22T12:00:00"
        }
    },
    "synopsis_data": {
        "overview": {
            "title": "Test Synopsis Title",
            "clinical_phase": "Phase 2"
        },
        "objectives": {
            "primary": ["Objective 1", "Objective 2"],
            "extra_items": []
        },
        "num_patients": "100"
    },
    "sections": {
        "4": {
            "title": "STUDY DESIGN",
            "main": "Main section content for study design.",
            "subsections": [
                {
                    "title": "Overall Design", 
                    "content": "Detailed design content.",
                    "metadata": {"type": "auto"}
                }
            ],
            "extra_section_field": 123
        }
    }
}

def verify_models():
    print("\n--- Verifying Pydantic Models ---")
    try:
        protocol = ProtocolData(**sample_protocol_data)
        print("ProtocolData model validation successful.")
        return protocol.model_dump()
    except Exception as e:
        print(f"ProtocolData model validation FAILED: {e}")
        return None

def verify_word_generation(data):
    print("\n--- Verifying Word Generation ---")
    try:
        filepath = generate_complete_word_document(data)
        if os.path.exists(filepath):
            print(f"Word document generated successfully: {filepath}")
            return True
        else:
            print("Word document generation FAILED: File not found.")
            return False
    except Exception as e:
        print(f"Word document generation FAILED with error: {e}")
        import traceback
        traceback.print_exc()
        return False

def verify_pdf_generation(data):
    print("\n--- Verifying PDF Generation ---")
    try:
        filepath = generate_pdf_document(data)
        if os.path.exists(filepath):
            print(f"PDF document generated successfully: {filepath}")
            return True
        else:
            print("PDF document generation FAILED: File not found.")
            return False
    except Exception as e:
        print(f"PDF document generation FAILED with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    validated_data = verify_models()
    if validated_data:
        word_ok = verify_word_generation(validated_data)
        pdf_ok = verify_pdf_generation(validated_data)
        
        if word_ok and pdf_ok:
            print("\nALL VERIFICATIONS PASSED!")
        else:
            print("\nSOME VERIFICATIONS FAILED.")
            sys.exit(1)
    else:
        sys.exit(1)
