import uuid
from fastapi import FastAPI, HTTPException, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from app.config import settings
from app.security import encrypt_token, decrypt_token, hash_password, verify_password, create_access_token
from app.database import engine, Base, get_db
from app.dependencies import get_current_user  
import app.models as models
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.fraud_detector import evaluate_swipe_risk
from sqlalchemy import func
from app.plaid_client import plaid_client, IS_MOCK_MODE
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from app.transactions_mock import generate_mock_transactions_data

from collections import defaultdict
from decimal import Decimal

# Initialize SQL database tables natively
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finance Tracker Architecture Test")

# 1. Configure explicit origin domains to clear client cross-origin traffic barriers
origins = [
    "http://localhost:5173",    
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://personal-finance-tracker-ui-kohl.vercel.app",  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REQUEST VALIDATION SCHEMAS ---
class TokenTestPayload(BaseModel):
    secret_data: str

class UserRegisterPayload(BaseModel):
    email: str
    password: str

class PublicTokenExchangePayload(BaseModel):
    public_token: str


# --- ROUTER SYSTEM CREATION ---
# This ensures FastAPI responds perfectly whether Vercel preserves or strips the prefix
api_router = APIRouter()

@api_router.get("/health")
def health_check():
    return {
        "status": "online",
        "environment": settings.ENV_MODE,
        "plaid_env_configured": settings.PLAID_ENV
    }

@api_router.post("/register")
def register_user(payload: UserRegisterPayload, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    new_user = models.User(
        email=payload.email,
        password_hash=hash_password(payload.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "status": "user_created",
        "user_id": str(new_user.user_id),
        "email": new_user.email,
        "message": "User registered successfully!"
    }

@api_router.post("/login")
def login_user(payload: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password configuration.")
    
    access_token = create_access_token(data={"user_id": str(user.user_id), "email": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@api_router.get("/users/me")
def get_authenticated_profile(current_user: models.User = Depends(get_current_user)):
    return {
        "status": "authorized",
        "user_id": str(current_user.user_id),
        "email": current_user.email,
        "account_created_timestamp": current_user.created_at
    }

@api_router.get("/test-db")
def test_database_connection(db: Session = Depends(get_db)):
    try:
        result = db.execute(models.func.now()).scalar()
        return {"status": "connected", "postgresql_timestamp": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/create_link_token")
def create_plaid_link_token(current_user: models.User = Depends(get_current_user)):
    if IS_MOCK_MODE:
        return {
            "link_token": f"link-mock-sandbox-{current_user.user_id}",
            "expiration": "2026-05-17T23:59:59Z",
            "request_id": "mock-req-id-12345",
            "mode": "simulation_fallback"
        }
    try:
        request = LinkTokenCreateRequest(
            user={"client_user_id": str(current_user.user_id)},
            client_name="Personal Finance Dashboard",
            products=[Products("transactions")],
            country_codes=[CountryCode("US")],
            language="en"
        )
        response = plaid_client.link_token_create(request)
        return response.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/exchange_public_token")
def exchange_plaid_public_token(payload: PublicTokenExchangePayload, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if IS_MOCK_MODE:
        mock_access_token = f"access-mock-sandbox-{uuid.uuid4()}"
        mock_item_id = f"item-mock-{uuid.uuid4()}"
        mock_institution_id = "ins_12345"
        
        encrypted_token = encrypt_token(mock_access_token)
        new_item = models.PlaidItem(
            user_id=current_user.user_id,
            access_token_encrypted=encrypted_token,
            plaid_item_id=mock_item_id,
            institution_id=mock_institution_id,
            status="active"
        )
        db.add(new_item)
        db.commit()
        return {"status": "success", "item_id": new_item.plaid_item_id, "mode": "simulation_fallback"}

    try:
        from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
        exchange_request = ItemPublicTokenExchangeRequest(public_token=payload.public_token)
        exchange_response = plaid_client.item_public_token_exchange(exchange_request)
        
        encrypted_token = encrypt_token(exchange_response['access_token'])
        new_item = models.PlaidItem(
            user_id=current_user.user_id,
            access_token_encrypted=encrypted_token,
            plaid_item_id=exchange_response['item_id'],
            institution_id="unknown",
            status="active"
        )
        db.add(new_item)
        db.commit()
        return {"status": "success", "item_id": new_item.plaid_item_id, "mode": "live"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/transactions/seed")
def seed_mock_transactions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        db.query(models.Transaction).filter(models.Transaction.user_id == current_user.user_id).delete()
        new_history_dataset = generate_mock_transactions_data(user_id=current_user.user_id, days_back=30)
        db.add_all(new_history_dataset)
        db.commit()
        return {
            "status": "seeded",
            "total_records_inserted": len(new_history_dataset),
            "message": "30-day historical transaction database records populated successfully!"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database data seeding transaction failed: {str(e)}")

@api_router.get("/transactions")
def get_user_transactions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        transactions = (
            db.query(models.Transaction)
            .filter(models.Transaction.user_id == current_user.user_id)
            .order_by(models.Transaction.transaction_date.desc())
            .all()
        )
        return {"status": "success", "count": len(transactions), "data": transactions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/spending-structure")
def get_spending_structure(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        raw_analytics = (
            db.query(models.Transaction.category, func.sum(models.Transaction.amount).label("total"))
            .filter(models.Transaction.user_id == current_user.user_id)
            .group_by(models.Transaction.category)
            .all()
        )
        chart_data_payload = [
            {"category": row.category or "Uncategorized", "amount": float(row.total)}
            for row in raw_analytics
        ]
        total_spend = sum(item["amount"] for item in chart_data_payload)
        return {
            "status": "success",
            "summary": {
                "total_spend_volume": float(round(total_spend, 2)),
                "transaction_count": len(chart_data_payload),
                "active_categories": len(chart_data_payload)
            },
            "chart_data": chart_data_payload
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/transactions/verify-risk")
def verify_transaction_risk(transaction_data: dict, current_user: models.User = Depends(get_current_user)):
    risk_result = evaluate_swipe_risk(transaction_data)
    if risk_result["action"] == "DECLINE":
        raise HTTPException(status_code=400, detail=f"Transaction blocked by AI Engine. Reason: {risk_result['reason']}")
    return risk_result


# --- CRITICAL STEP: MOUNT SYSTEM ROUTER TWICE FOR ABSOLUTE SAFETY ---
# Mounts routes under /api (for local dev server consistency)
app.include_router(api_router, prefix="/api")
# Mounts routes directly at / root level (for transparent serverless proxy routing compatibility)
app.include_router(api_router, prefix="")
