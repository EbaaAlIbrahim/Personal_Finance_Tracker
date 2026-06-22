import uuid
from sqlalchemy import Column, String, Boolean, Numeric, Date, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    plaid_items = relationship("PlaidItem", back_populates="user", cascade="all, delete-orphan")


class PlaidItem(Base):
    __tablename__ = "plaid_items"

    item_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Corrected: ondelete="CASCADE" goes inside ForeignKey()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    
    access_token_encrypted = Column(String, nullable=False)
    plaid_item_id = Column(String(255), unique=True, nullable=False)
    institution_id = Column(String(255), nullable=False)
    status = Column(String(50), default="active")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="plaid_items")


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(String(255), primary_key=True)
    # Corrected: ondelete="CASCADE" goes inside ForeignKey()
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(String(255), nullable=False)
    
    amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="USD")
    category = Column(String(100), nullable=True)
    merchant_name = Column(String(255), nullable=True)
    
    transaction_date = Column(Date, nullable=False, index=True)
    authorized_date = Column(Date, nullable=True)
    pending = Column(Boolean, default=False)

    terminal_id = Column(String(100), nullable=True, index=True)
    device_fingerprint = Column(String(255), nullable=True, index=True)
    cardholder_ip = Column(String(45), nullable=True) # Supports IPv4/IPv6
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    iso_processing_code = Column(String(6), nullable=True)

    user = relationship("User")
class Budget(Base):
    __tablename__ = "budgets"
    budget_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    category = Column(String(100), nullable=False) # e.g. "Food", "Global"
    limit_amount = Column(Numeric(12, 2), nullable=False)
