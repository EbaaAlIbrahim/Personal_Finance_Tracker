from app.main import app
from mangum import Mangum

# Instantiates a serverless handler wrapper engine
handler = Mangum(app)
