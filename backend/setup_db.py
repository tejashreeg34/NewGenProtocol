import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import init_db

if __name__ == "__main__":
    if init_db():
        print("Database setup complete.")
    else:
        print("Failed to setup database.")
