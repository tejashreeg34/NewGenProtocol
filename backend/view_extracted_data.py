import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import execute_query

def print_extracted_data():
    query = "SELECT * FROM extracted_entities ORDER BY created_at DESC"
    results = execute_query(query, fetch=True)

    if not results:
        print("\n[!] No extracted entities found in the database.")
        return

    print("\n" + "="*80)
    print(f"{'ID':<4} | {'Category':<15} | {'Key':<15} | {'Value':<25} | {'Section'}")
    print("-" * 80)
    
    for r in results:
        print(f"{r['id']:<4} | {r['entity_category']:<15} | {r['entity_key']:<15} | {r['entity_value']:<25} | {r['section_name']}")
    
    print("="*80)
    print(f"Total entities: {len(results)}\n")

if __name__ == "__main__":
    print_extracted_data()
