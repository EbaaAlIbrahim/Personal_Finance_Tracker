# index.py (Create this at your absolute project root folder)
import sys
import os

# 1. Force Python to view the nested backend directory cleanly
sys.path.append(os.path.join(os.path.dirname(__abspath__ if '__file__' not in locals() else __file__), "backend"))

# 2. Extract the actual configured app instance from your working main file
from app.main import app as fastapi_app
from mangum import Mangum

# 3. Expose the official serverless handler instance variable directly to Vercel
app = Mangum(fastapi_app)
