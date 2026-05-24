import base64
import jwt
from datetime import datetime, timedelta, timezone
from cryptography.fernet import Fernet
from passlib.context import CryptContext
from app.config import settings

try:
    cipher_suite = Fernet(settings.ENCRYPTION_KEY.encode())
except Exception as e:
    raise RuntimeError(f"Cryptographic Engine initialization failed. Check your ENCRYPTION_KEY format: {e}")

def encrypt_token(plain_text_token: str) -> str:
    """Encrypts raw Plaid tokens using symmetrical Fernet encryption."""
    if not plain_text_token:
        return ""
    encrypted_bytes = cipher_suite.encrypt(plain_text_token.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')

def decrypt_token(encrypted_token_string: str) -> str:
    """Decrypts an encrypted token string back into pure text format."""
    if not encrypted_token_string:
        return ""
    decrypted_bytes = cipher_suite.decrypt(encrypted_token_string.encode('utf-8'))
    return decrypted_bytes.decode('utf-8')


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Transforms a plaintext password into an unreadable cryptographic hash."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compares a raw login password attempt against a stored database hash."""
    return pwd_context.verify(plain_password, hashed_password)


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(data: dict) -> str:
    """Generates a secure, signed JSON Web Token containing user properties."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": int(expire.timestamp())})
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_access_token(token: str) -> dict:
    """Decodes and verifies an incoming session token string."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise RuntimeError("Token session has expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise RuntimeError("Invalid security credentials package. Access denied.")
