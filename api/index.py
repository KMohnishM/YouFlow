import os
import sys

# Ensure backend package can be imported by Vercel serverless runtime
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, os.path.join(parent_dir, "backend"))

from app.main import app
