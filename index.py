# index.py
import sys
import os

# Clean, safe cross-platform path resolution for Vercel's environment
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "backend")

if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from app.main import app as fastapi_app
from mangum import Mangum

# Expose the ASGI serverless connector variable cleanly
app = Mangum(fastapi_app)
