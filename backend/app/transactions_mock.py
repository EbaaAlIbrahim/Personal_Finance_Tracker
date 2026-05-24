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

def generate_mock_transactions_data(user_id: uuid.UUID, days_back: int = 30) -> list:
    """
    Constructs a robust, realistic list of database Transaction model entities 
    spread out over a selected history window for visualization simulation.
    """
    simulated_records = []
    current_date = date.today()
    
    rent_tx = models.Transaction(
        transaction_id=f"tx-mock-rent-{uuid.uuid4()}",
        user_id=user_id,
        account_id="acc-mock-checking-8888",
        amount=Decimal("1200.00"),
        currency="USD",
        category="Rent & Housing",
        merchant_name="Property Management",
        transaction_date=current_date - timedelta(days=days_back - 2),
        pending=False
    )
    simulated_records.append(rent_tx)

    for day_offset in range(days_back):
        target_date = current_date - timedelta(days=day_offset)
        
        daily_frequency = random.randint(0, 3)
        
        for _ in range(daily_frequency):
            chosen_category = random.choice(list(CATEGORIES_POOL.keys()))
            chosen_merchant = random.choice(CATEGORIES_POOL[chosen_category])
            
            if chosen_category == "Groceries":
                spend_amount = Decimal(f"{random.uniform(40.00, 160.00):.2f}")
            elif chosen_category == "Utilities":
                spend_amount = Decimal(f"{random.uniform(30.00, 120.00):.2f}")
            elif chosen_category == "Food & Dining":
                spend_amount = Decimal(f"{random.uniform(5.50, 45.00):.2f}")
            elif chosen_category == "Technology & Entertainment":
                spend_amount = Decimal(f"{random.uniform(9.99, 59.99):.2f}")
            else:
                spend_amount = Decimal(f"{random.uniform(10.00, 35.00):.2f}")

            tx_entity = models.Transaction(
                transaction_id=f"tx-mock-auto-{uuid.uuid4()}",
                user_id=user_id,
                account_id="acc-mock-checking-8888",
                amount=spend_amount,
                currency="USD",
                category=chosen_category,
                merchant_name=chosen_merchant,
                transaction_date=target_date,
                pending=False
            )
            simulated_records.append(tx_entity)
            
    return simulated_records
