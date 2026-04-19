import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger(__name__)

# Configurable via environment variables
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "Protocolgenerator")
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
        if conn:
            conn.close()

def create_database_if_not_exists():
    try:
        # Connect to default 'postgres' database to create new one
        conn = get_db_connection("postgres")
        if not conn: return False
        
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        with conn.cursor() as cur:
            cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
            exists = cur.fetchone()
            if not exists:
                cur.execute(f"CREATE DATABASE \"{DB_NAME}\"")
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

    try:
        conn = get_db_connection()
        if not conn:
            return False

        cur = conn.cursor()
        
        # Read SQL from db_init.sql
        sql_path = os.path.join(os.path.dirname(__file__), "db_init.sql")
        with open(sql_path, 'r') as f:
            sql = f.read()
            
        cur.execute(sql)
        conn.commit()
        print("Tables initialized successfully.")
        
        cur.close()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Error initializing tables: {str(e)}")
        if conn:
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    init_db()
