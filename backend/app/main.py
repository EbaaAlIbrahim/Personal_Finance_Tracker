import uuid
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from app.config import settings
from app.security import encrypt_token, decrypt_token, hash_password, verify_password, create_access_token
from app.database import engine, Base, get_db
from app.dependencies import get_current_user  
import app.models as models
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.plaid_client import plaid_client, IS_MOCK_MODE
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode

from collections import defaultdict
from decimal import Decimal

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finance Tracker Architecture Test")

# 2. Configure the explicit origin domain mappings to allow frontend connections
origins = [
    "http://localhost:5173",    # Vite's standard local hosting port address
    "http://127.0.0.1:5173",
]

# 3. Bind the middleware interceptor to your app engine instance
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TokenTestPayload(BaseModel):
    secret_data: str

class UserRegisterPayload(BaseModel):
    email: str
    password: str

# Data contract validation layer for incoming public tokens
class PublicTokenExchangePayload(BaseModel):
    public_token: str

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "environment": settings.ENV_MODE,
        "plaid_env_configured": settings.PLAID_ENV
    }

@app.post("/api/register")
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

@app.post("/api/login")
def login_user(payload: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticates user profile records via standard OAuth2 forms and issues session tokens."""
    user = db.query(models.User).filter(models.User.email == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password configuration.")
    
    access_token = create_access_token(data={"user_id": str(user.user_id), "email": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.get("/api/users/me")
def get_authenticated_profile(current_user: models.User = Depends(get_current_user)):
    """A protected checkpoint route that returns private user details only to logged-in accounts."""
    return {
        "status": "authorized",
        "user_id": str(current_user.user_id),
        "email": current_user.email,
        "account_created_timestamp": current_user.created_at
    }

@app.get("/api/test-db")
def test_database_connection(db: Session = Depends(get_db)):
    try:
        result = db.execute(models.func.now()).scalar()
        return {"status": "connected", "postgresql_timestamp": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/create_link_token")
def create_plaid_link_token(current_user: models.User = Depends(get_current_user)):
    """
    Protected endpoint that returns an official token from Plaid,
    or switches to a local simulation if developer keys are missing.
    """
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
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to communicate with bank data initialization gateway: {str(e)}"
        )

@app.post("/api/exchange_public_token")
def exchange_plaid_public_token(
    payload: PublicTokenExchangePayload, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Exchanges a temporary frontend public token for a permanent access token,
    encrypts the token, and saves it securely to the database.
    """
    # --- HANDLER 1: SIMULATION FALLBACK MODE ---
    if IS_MOCK_MODE:
        mock_access_token = f"access-mock-sandbox-{uuid.uuid4()}"
        mock_item_id = f"item-mock-{uuid.uuid4()}"
        mock_institution_id = "ins_12345"  # Standard placeholder for Chase Bank in Plaid Sandbox
        
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
        db.refresh(new_item)
        
        return {
            "status": "success",
            "item_id": new_item.plaid_item_id,
            "mode": "simulation_fallback",
            "message": "Simulated bank account linked, encrypted, and saved successfully!"
        }

    # --- HANDLER 2: LIVE PLAID API WORKFLOW ---
    try:
        from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
        
        exchange_request = ItemPublicTokenExchangeRequest(public_token=payload.public_token)
        exchange_response = plaid_client.item_public_token_exchange(exchange_request)
        
        raw_access_token = exchange_response['access_token']
        raw_item_id = exchange_response['item_id']
        raw_institution_id = "unknown"
        
        encrypted_token = encrypt_token(raw_access_token)
        
        new_item = models.PlaidItem(
            user_id=current_user.user_id,
            access_token_encrypted=encrypted_token,
            plaid_item_id=raw_item_id,
            institution_id=raw_institution_id,
            status="active"
        )
        
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        
        return {
            "status": "success",
            "item_id": new_item.plaid_item_id,
            "mode": "live"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to complete token exchange handshake with banking server: {str(e)}"
        )

from app.transactions_mock import generate_mock_transactions_data  # Import mock seed handler

@app.post("/api/transactions/seed")
def seed_mock_transactions(
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Clears any prior mock history transactions for the authorized user account, 
    and injects a clean 30-day simulated purchase data matrix ledger.
    """
    try:
        # 1. Safely remove historical transactions mapped to this explicit user to refresh state cleanly
        db.query(models.Transaction).filter(models.Transaction.user_id == current_user.user_id).delete()
        
        # 2. Invoke our vector matrix layout generator tool
        new_history_dataset = generate_mock_transactions_data(user_id=current_user.user_id, days_back=30)
        
        # 3. Commit the entity transaction bundle state directly into PostgreSQL
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


@app.get("/api/transactions")
def get_user_transactions(
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """Retrieves all database ledger transaction items linked to the authorized user account profile."""
    try:
        transactions = (
            db.query(models.Transaction)
            .filter(models.Transaction.user_id == current_user.user_id)
            .order_by(models.Transaction.transaction_date.desc())
            .all()
        )
        return {
            "status": "success",
            "count": len(transactions),
            "data": transactions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to pull transaction profiles: {str(e)}")


@app.get("/api/analytics/spending-structure")
def get_spending_structure(
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """
    Parses all transaction items instantly to compute aggregated 
    spending volumes by category and calculate key summary metrics.
    """
    try:
        # 1. Fetch flat transactions array matching the user profile
        transactions = (
            db.query(models.Transaction)
            .filter(models.Transaction.user_id == current_user.user_id)
            .all()
        )
        
        # 2. Initialize rapid aggregation mapping lookups
        category_totals = defaultdict(Decimal)
        total_variable_spend = Decimal("0.00")
        
        # 3. Single-pass aggregation loop for optimized performance
        for tx in transactions:
            amount_dec = Decimal(str(tx.amount))
            cat_name = tx.category or "Uncategorized"
            
            # Map aggregated metrics
            category_totals[cat_name] += amount_dec
            total_variable_spend += amount_dec
            
        # 4. Reformat dictionary into a clean array structure for Recharts consumption
        chart_data_payload = [
            {
                "category": cat, 
                "amount": float(amt.quantize(Decimal("0.01")))
            }
            for cat, amt in category_totals.items()
        ]
        
        return {
            "status": "success",
            "summary": {
                "total_spend_volume": float(total_variable_spend.quantize(Decimal("0.01"))),
                "transaction_count": len(transactions),
                "active_categories": len(chart_data_payload)
            },
            "chart_data": chart_data_payload
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"High-speed analytics mathematical evaluation collapsed: {str(e)}"
        )
