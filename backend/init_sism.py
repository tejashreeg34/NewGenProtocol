import logging
import sys
import os

# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import init_db

# Setup logging
logging.basicConfig(level=logging.INFO)

if __name__ == "__main__":
    print("Initializing database...")
    success = init_db()
    if success:
        print("Database initialized successfully, including SISM tables.")
    else:
        print("Database initialization failed. Check logs.")
