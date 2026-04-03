
import sys
import os
import io

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.document_generator import generate_word_document, generate_pdf_document
from backend.main import ProtocolData

def verify_generation():
    print("Verifying document generation with new Section 3 structure...")
    
    # Mock data with new Section 3 structure
    mock_data = {
        "protocol_title": "Test Protocol",
        "version_number": "v1.1",
        "section3": {
            "description": "This is a test description for Section 3.",
            "image": {
                "url": "/uploads/test.png", # Won't exist, should fail gracefully
                "caption": "Test Caption",
                "description": "Image description here."
            },
            "table": {
                "headers": ["Column A", "Column B", "Column C"],
                "rows": [
                    ["Row 1 Col A", "Row 1 Col B", "Row 1 Col C"],
                    ["Row 2 Col A", "Row 2 Col B", "Row 2 Col C"]
                ]
            }
        },
        # Legacy data (should be ignored or appended if logic allows, usually legacy is fallback)
        "objectives_endpoints": [],
        "sections": {
            "4": {
                "main": "Main content for Study Design.",
                "subsections": {
                    "0": "Content for 4.1 Overall Design",
                    "1": "Content for 4.2 Scientific Rationale"
                }
            }
        }
    }
    
    try:
        print("Generating DOCX...")
        docx_path = generate_word_document(mock_data)
        if os.path.exists(docx_path):
            print(f"DOCX generated successfully at {docx_path}")
        else:
            print("DOCX generation failed to create file.")
            
    except Exception as e:
        print(f"DOCX Generation Error: {e}")
        import traceback
        traceback.print_exc()

    try:
        print("Generating PDF...")
        pdf_path = generate_pdf_document(mock_data)
        if os.path.exists(pdf_path):
            print(f"PDF generated successfully at {pdf_path}")
        else:
            print("PDF generation failed to create file.")

    except Exception as e:
        print(f"PDF Generation Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_generation()
