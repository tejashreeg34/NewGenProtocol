import psycopg2
from psycopg2.extras import RealDictCursor
import sys

def check_db():
    print("Checking database connection...")
    try:
        conn = psycopg2.connect(
            host='localhost',
            database='protocol_generation_IE',
            user='postgres',
            password='postgres',
            port='5432'
        )
        print("Connected successfully!")
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check metadata
            cur.execute("SELECT count(*) FROM protocol_metadata")
            m_count = cur.fetchone()['count']
            print(f"Total protocols in metadata: {m_count}")
            
            if m_count > 0:
                cur.execute("SELECT external_id, protocol_name FROM protocol_metadata LIMIT 5")
                protocols = cur.fetchall()
                print("Latest protocols:")
                for p in protocols:
                    print(f" - {p['protocol_name']} (ID: {p['external_id']})")
                    
                    # Check sections for this protocol
                    cur.execute("SELECT section_name FROM protocol_sections s JOIN protocol_metadata m ON s.protocol_id = m.protocol_id WHERE m.external_id = %s", (p['external_id'],))
                    sections = cur.fetchall()
                    print(f"   Sections ({len(sections)}): {[s['section_name'] for s in sections]}")
            
        conn.close()
    except Exception as e:
        print(f"DATABASE ERROR: {str(e)}")

if __name__ == "__main__":
    check_db()
