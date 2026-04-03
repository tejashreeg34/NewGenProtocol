import json
from qc_engine import qc_engine

def test_qc():
    # Sample protocol with some missing data
    sample_data = {
        "protocol_title": "Test Protocol",
        "protocol_number": "", # Missing mandatory field
        "sections": {
            "1": {
                "main": "Summary of the protocol",
                "subsections": [
                    {"title": "Synopsis", "content": "This is a synopsis"},
                    {"title": "Schema", "content": ""}, # Optional content missing
                    {"title": "Schedule of Activities (SoA)", "content": ""} # Mandatory content missing
                ]
            }
        },
        "synopsis_data": {
            "objectives": [], # Missing items
            "endpoints": ["Endpoint 1"]
        }
    }

    print("Running QC on sample data...")
    report = qc_engine.run_qc(sample_data)
    
    print("\nQC Report:")
    for item in report:
        print(f"[{item['severity']}] {item['section_name']}: {item['missing_item']} (Status: {item['status']})")

    # Assertions for verification
    missing_fields = [i['missing_item'] for i in report]
    assert "Field 'protocol_number' is missing" in missing_fields
    assert "Missing items in 'objectives' list" in missing_fields
    
    # Check section 1 sub-rules
    soa_missing = any(item['section_name'] == "PROTOCOL SUMMARY: Schedule of Activities (SoA)" for item in report)
    assert soa_missing, "Mandatory SoA subsection content should be missing"

    print("\nVerification successful!")

if __name__ == "__main__":
    test_qc()
