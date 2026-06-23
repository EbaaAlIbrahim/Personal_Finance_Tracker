# backend\api\main.py
from app.main import app as fastapi_app
from mangum import Mangum

# Vercel's Python runtime strictly looks for a variable named 'app'
app = Mangum(fastapi_app)
