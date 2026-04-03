import sys
import os
import traceback
from datetime import datetime

# Add the current directory to sys.path to ensure we can import the modules
sys.path.append(os.getcwd())

try:
    print("Importing document_generator...")
    from document_generator import generate_complete_word_document
    print("Importing pdf_generator...")
    from pdf_generator import generate_pdf_document
    print("Imports successful.")
except Exception as e:
    print("FATAL: Import failed.")
    traceback.print_exc()
    sys.exit(1)

# Sample Protocol Data mimicking the structure in main.py ProtocolData
sample_data = {
    "protocol_title": "Test Protocol",
    "protocol_number": "TEST-001",
    "version_number": "v1.0",
    "sections": {
        "2": {
            "title": "INTRODUCTION",
            "main": "This is the introduction.",
            "subsections": [
                {"title": "Background", "content": "Background content."}
            ]
        }
    },
    "synopsis": {"Study Title": "Test Study"},
    "schema_data": {},
    "soa_data": {},
    "objectives_endpoints": [],
    "abbreviations": [],
    "amendment_history": []
}

def test_word():
    print("\nTesting Word Generation...")
    try:
        path = generate_complete_word_document(sample_data)
        print(f"Word Generation SUCCESS: {path}")
    except Exception as e:
        print("Word Generation FAILED.")
        traceback.print_exc()

def test_pdf():
    print("\nTesting PDF Generation...")
    try:
        path = generate_pdf_document(sample_data)
        print(f"PDF Generation SUCCESS: {path}")
    except Exception as e:
        print("PDF Generation FAILED.")
        traceback.print_exc()

if __name__ == "__main__":
    test_word()
    test_pdf()
