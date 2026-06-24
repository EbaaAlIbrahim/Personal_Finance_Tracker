import random
import uuid
from datetime import datetime, timedelta, date
from decimal import Decimal
import app.models as models

# A predictable matrix pool of target vendors and categorical classifications
CATEGORIES_POOL = {
    "Groceries": ["Supermarket", "Whole Foods", "Trader Joe's", "Walmart"],
    "Rent & Housing": ["Property Management", "Home Association"],
    "Utilities": ["Electric Company", "Water Authority", "Comcast Cable", "Verizon Wireless"],
    "Food & Dining": ["Starbucks", "McDonalds", "Chipotle", "Local Pizzeria", "UberEats"],
    "Technology & Entertainment": ["Netflix", "Spotify", "Apple Subscription", "AWS Cloud", "Steam Games"],
    "Transportation": ["Uber", "Lyft", "Shell Gas Station", "Metropolitan Transit"]
}

# Inside backend/app/transactions_mock.py

def generate_mock_transactions_data(user_id: uuid.UUID, days_back: int = 30) -> list:
    simulated_records = []
    current_date = date.today()
    
    # Define a central home base coordinate anchor (e.g., New York area)
    HOME_LAT = 40.7128
    HOME_LON = -74.0060

    # ... (Keep your rent transaction initialization blocks here, just add coordinates to it)
    rent_tx = models.Transaction(
        transaction_id=f"tx-mock-rent-{uuid.uuid4()}",
        user_id=user_id,
        account_id="acc-mock-checking-8888",
        amount=Decimal("1200.00"),
        currency="USD",
        category="Rent & Housing",
        merchant_name="Property Management",
        transaction_date=current_date - timedelta(days=days_back - 2),
        pending=False,
        latitude=HOME_LAT, # 🌟 ADDED
        longitude=HOME_LON  # 🌟 ADDED
    )
    simulated_records.append(rent_tx)

    for day_offset in range(days_back):
        target_date = current_date - timedelta(days=day_offset)
        daily_frequency = random.randint(0, 3)
        
        for _ in range(daily_frequency):
            chosen_category = random.choice(list(CATEGORIES_POOL.keys()))
            chosen_merchant = random.choice(CATEGORIES_POOL[chosen_category])
            
            # (Keep your spending amount if/elif logic blocks undisturbed...)
            if chosen_category == "Groceries":
                spend_amount = Decimal(f"{random.uniform(40.00, 160.00):.2f}")
            else:
                spend_amount = Decimal(f"{random.uniform(10.00, 35.00):.2f}")

            # Create slight random spatial variations around your local neighborhood region
            random_lat_offset = random.uniform(-0.05, 0.05)
            random_lon_offset = random.uniform(-0.05, 0.05)

            tx_entity = models.Transaction(
                transaction_id=f"tx-mock-auto-{uuid.uuid4()}",
                user_id=user_id,
                account_id="acc-mock-checking-8888",
                amount=spend_amount,
                currency="USD",
                category=chosen_category,
                merchant_name=chosen_merchant,
                transaction_date=target_date,
                pending=False,
                
                # 🌟 INJECT LIVE GEOMETRIC SPATIAL VARIATIONS
                latitude=HOME_LAT + random_lat_offset,
                longitude=HOME_LON + random_lon_offset,
                device_fingerprint="operator_windows_machine_v1",
                cardholder_ip="127.0.0.1"
            )
            simulated_records.append(tx_entity)
            
    return simulated_records

