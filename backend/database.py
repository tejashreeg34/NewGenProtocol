import os
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger(__name__)

# Configurable via environment variables
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "protocol_generation_IE")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres")
DB_PORT = os.getenv("DB_PORT", "5432")

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            port=DB_PORT
        )
        return conn
    except Exception as e:
        logger.exception(f"Error connecting to database. Host: {DB_HOST}, DB: {DB_NAME}, User: {DB_USER}")
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
        logger.exception(f"Error executing query: {query}")
        if not fetch and conn:
            conn.rollback()
        return None
    finally:
        conn.close()

def init_db():
    # Read and execute db_init.sql and sism_setup.sql
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    scripts = ["db_init.sql", "sism_setup.sql"]
    success = True
    
    for script in scripts:
        sql_path = os.path.join(base_dir, script)
        if not os.path.exists(sql_path):
            logger.error(f"SQL script not found: {script}")
            # If it's sism_setup.sql, we can proceed but log warning
            if script == "sism_setup.sql":
                continue
            success = False
            continue
            
        with open(sql_path, 'r') as f:
            sql = f.read()
            if not execute_query(sql):
                logger.error(f"Failed to execute SQL script: {script}")
                if script == "db_init.sql":
                    success = False
    
    return success
