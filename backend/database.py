import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger(__name__)

# Configurable via environment variables
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "pgt")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")

def get_db_connection(dbname=None):
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=dbname or DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            port=DB_PORT
        )
        return conn
    except Exception as e:
        logger.error(f"Error connecting to database {dbname or DB_NAME}: {str(e)}")
        return None

def execute_query(query, params=None, fetch=False):
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch:
                result = cur.fetchall()
                conn.commit()
            else:
                conn.commit()
                result = True
        return result
    except Exception as e:
        logger.exception(f"Error executing query: {query[:100]}...")
        if not fetch and conn:
            conn.rollback()
        return None
    finally:
        conn.close()

def create_database_if_not_exists():
    try:
        # Connect to default 'postgres' database to create 'pgt'
        conn = get_db_connection("postgres")
        if not conn: return False
        
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        with conn.cursor() as cur:
            cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
            exists = cur.fetchone()
            if not exists:
                cur.execute(f"CREATE DATABASE {DB_NAME}")
                print(f"Database '{DB_NAME}' created successfully.")
            else:
                print(f"Database '{DB_NAME}' already exists.")
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Failed to ensure database existence: {str(e)}")
        return False

def init_db():
    if not create_database_if_not_exists():
        return False

    tables = {
        "users": """
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                full_name TEXT,
                email TEXT,
                status TEXT DEFAULT 'active',
                last_login TIMESTAMP WITHOUT TIME ZONE,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """,
        "protocol_title_page": """
            CREATE TABLE IF NOT EXISTS protocol_title_page (
                title_page_id SERIAL PRIMARY KEY,
                protocol_title TEXT NOT NULL,
                protocol_identifier VARCHAR(50) NOT NULL UNIQUE,
                nct_number VARCHAR(20),
                lead_medical_officer VARCHAR(150),
                sponsoring_entity VARCHAR(200),
                funding_agency VARCHAR(200),
                document_version VARCHAR(20),
                authorization_date DATE
            )
        """,
        "signatures": """
            CREATE TABLE IF NOT EXISTS signatures (
                signature_id SERIAL PRIMARY KEY,
                signature_type VARCHAR(20) CHECK (signature_type IN ('DRAWN', 'UPLOADED')),
                file_path TEXT,
                signed_by_name VARCHAR(150),
                signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """,
        "protocol_approval_agreement": """
            CREATE TABLE IF NOT EXISTS protocol_approval_agreement (
                approval_id SERIAL PRIMARY KEY,
                title_page_id INTEGER NOT NULL REFERENCES protocol_title_page(title_page_id),
                protocol_name TEXT NOT NULL,
                protocol_number VARCHAR(50) NOT NULL,
                investigational_product VARCHAR(100),
                indication TEXT,
                clinical_phase VARCHAR(20),
                coordinating_investigator VARCHAR(150),
                expert_committee TEXT,
                sponsor_name_address TEXT,
                gcp_statement TEXT,
                approval_statement TEXT,
                created_by_user_id INTEGER NOT NULL REFERENCES users(user_id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """,
        "protocol_approval_signatories": """
            CREATE TABLE IF NOT EXISTS protocol_approval_signatories (
                signatory_id SERIAL PRIMARY KEY,
                approval_id INTEGER NOT NULL REFERENCES protocol_approval_agreement(approval_id),
                user_id INTEGER REFERENCES users(user_id),
                role VARCHAR(50) CHECK (role IN ('SPONSOR_REP', 'CRO_REP')),
                description TEXT,
                name VARCHAR(150) NOT NULL,
                title VARCHAR(100),
                signed_date DATE,
                signature_id INTEGER REFERENCES signatures(signature_id)
            )
        """,
        "investigator_agreement": """
            CREATE TABLE IF NOT EXISTS investigator_agreement (
                investigator_agreement_id SERIAL PRIMARY KEY,
                approval_id INTEGER NOT NULL REFERENCES protocol_approval_agreement(approval_id),
                investigator_user_id INTEGER REFERENCES users(user_id),
                agreement_description TEXT NOT NULL,
                investigator_name VARCHAR(150) NOT NULL,
                investigator_title VARCHAR(100),
                facility_location VARCHAR(200),
                city VARCHAR(100),
                state VARCHAR(100),
                signed_date DATE,
                signature_id INTEGER REFERENCES signatures(signature_id)
            )
        """,
        "protocol_amendments": """
            CREATE TABLE IF NOT EXISTS protocol_amendments (
                amendment_id SERIAL PRIMARY KEY,
                approval_id INTEGER NOT NULL REFERENCES protocol_approval_agreement(approval_id),
                amendment_number VARCHAR(50),
                amendment_description TEXT,
                amendment_date DATE,
                document_version VARCHAR(20)
            )
        """,
        "protocol_synopsis": """
            CREATE TABLE IF NOT EXISTS protocol_synopsis (
                synopsis_id SERIAL PRIMARY KEY,
                title_page_id INTEGER NOT NULL REFERENCES protocol_title_page(title_page_id),
                trial_title TEXT NOT NULL,
                coordinating_investigator VARCHAR(150),
                expert_committee TEXT,
                investigators TEXT,
                trial_sites TEXT,
                planned_trial_period VARCHAR(50),
                fpfv_date DATE,
                lplv_date DATE,
                clinical_phase VARCHAR(20),
                planned_number_of_patients INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """,
        "trial_objectives": """
            CREATE TABLE IF NOT EXISTS trial_objectives (
                objective_id SERIAL PRIMARY KEY,
                synopsis_id INTEGER NOT NULL REFERENCES protocol_synopsis(synopsis_id),
                objective_type VARCHAR(20) CHECK (objective_type IN ('PRIMARY', 'SECONDARY', 'EXPLORATORY')),
                objective_text TEXT NOT NULL
            )
        """,
        "trial_endpoints": """
            CREATE TABLE IF NOT EXISTS trial_endpoints (
                endpoint_id SERIAL PRIMARY KEY,
                synopsis_id INTEGER NOT NULL REFERENCES protocol_synopsis(synopsis_id),
                endpoint_type VARCHAR(20) CHECK (endpoint_type IN ('PRIMARY', 'SECONDARY', 'EXPLORATORY')),
                endpoint_text TEXT NOT NULL
            )
        """,
        "trial_flowcharts": """
            CREATE TABLE IF NOT EXISTS trial_flowcharts (
                flowchart_id SERIAL PRIMARY KEY,
                synopsis_id INTEGER NOT NULL REFERENCES protocol_synopsis(synopsis_id),
                flowchart_title VARCHAR(150),
                flowchart_description TEXT,
                file_path TEXT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """,
        "eligibility_criteria": """
            CREATE TABLE IF NOT EXISTS eligibility_criteria (
                criteria_id SERIAL PRIMARY KEY,
                synopsis_id INTEGER NOT NULL REFERENCES protocol_synopsis(synopsis_id),
                criteria_type VARCHAR(20) CHECK (criteria_type IN ('INCLUSION', 'EXCLUSION')),
                criteria_text TEXT NOT NULL,
                display_order INTEGER
            )
        """,
        "study_team_overview": """
            CREATE TABLE IF NOT EXISTS study_team_overview (
                team_overview_id SERIAL PRIMARY KEY,
                synopsis_id INTEGER NOT NULL REFERENCES protocol_synopsis(synopsis_id),
                investigator_description TEXT,
                study_coordinator_description TEXT
            )
        """,
        "statistical_methods": """
            CREATE TABLE IF NOT EXISTS statistical_methods (
                statistical_method_id SERIAL PRIMARY KEY,
                synopsis_id INTEGER NOT NULL REFERENCES protocol_synopsis(synopsis_id),
                method_description TEXT NOT NULL
            )
        """,
        "synopsis_custom_tables": """
            CREATE TABLE IF NOT EXISTS synopsis_custom_tables (
                custom_table_id SERIAL PRIMARY KEY,
                synopsis_id INTEGER NOT NULL REFERENCES protocol_synopsis(synopsis_id),
                table_name VARCHAR(150) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """,
        "synopsis_custom_table_rows": """
            CREATE TABLE IF NOT EXISTS synopsis_custom_table_rows (
                row_id SERIAL PRIMARY KEY,
                custom_table_id INTEGER NOT NULL REFERENCES synopsis_custom_tables(custom_table_id),
                column_1 TEXT,
                column_2 TEXT,
                column_3 TEXT,
                row_order INTEGER
            )
        """
    }

    conn = get_db_connection()
    if not conn:
        return False

    try:
        with conn.cursor() as cur:
            for table_name, create_sql in tables.items():
                # Check if table exists
                cur.execute(f"SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = '{table_name}')")
                if cur.fetchone()[0]:
                    print(f"Table '{table_name}' already exists.")
                else:
                    cur.execute(create_sql)
                    print(f"Table '{table_name}' created successfully.")
            
            # Seed default users
            seed_sql = """
                INSERT INTO users (username, password, full_name, email, status)
                VALUES 
                ('admin', 'admin123', 'System Administrator', 'admin@clinical.com', 'active'),
                ('investigator', 'test123', 'Dr. Clinical Investigator', 'investigator@clinical.com', 'active')
                ON CONFLICT (username) DO NOTHING;
            """
            cur.execute(seed_sql)
            print("Seed users ensured.")
            
        conn.commit()
        return True
    except Exception as e:
        logger.error(f"Error initializing tables: {str(e)}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
