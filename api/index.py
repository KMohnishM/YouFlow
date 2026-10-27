import os
import sys

# Ensure backend package and submodules can be imported by Vercel serverless runtime
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)

for path in [
    parent_dir,
    os.path.join(parent_dir, "backend"),
    os.path.join(parent_dir, "backend", "app"),
]:
    if path not in sys.path and os.path.exists(path):
        sys.path.insert(0, path)

from app.main import app
