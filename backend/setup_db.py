import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os

def create_database():
    # Connect to default 'postgres' database to create the new one
    try:
        conn = psycopg2.connect(
            host="localhost",
            user="postgres",
            password="postgres",
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute("SELECT 1 FROM pg_database WHERE datname = 'protocol_generation_IE'")
        exists = cur.fetchone()
        
        if not exists:
            cur.execute('CREATE DATABASE "protocol_generation_IE"')
            print("Database 'protocol_generation_IE' created successfully.")
        else:
            print("Database 'protocol_generation_IE' already exists.")
            
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Error creating database: {e}")
        return False

def init_tables():
    try:
        conn = psycopg2.connect(
            host="localhost",
            user="postgres",
            password="postgres",
            database="protocol_generation_IE"
        )
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
        print(f"Error initializing tables: {e}")
        return False

if __name__ == "__main__":
    if create_database():
        init_tables()
