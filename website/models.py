from . import db  # Import the db object initialized in __init__.py
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from flask import current_app
from datetime import datetime


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    address = db.Column(db.String(255), nullable=True)
    postal_code = db.Column(db.String(10), nullable=True)
    password_hash = db.Column(db.String(128), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_verification_token(self, expires_sec=3600):
        """Generates a secure token that expires after `expires_sec` seconds."""
        s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        return s.dumps(self.email, salt="email-confirm")

    @staticmethod
    def verify_token(token, expiration=3600):
        """Verifies the token. If expired, returns 'expired'. If invalid, returns None."""
        s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
        try:
            email = s.loads(token, salt="email-confirm", max_age=expiration)
            return email  # ✅ Valid token, return email
        except SignatureExpired:
            return "expired"  # ✅ Token is expired
        except BadSignature:
            return None  # ❌ Token is invalid

    def __repr__(self):
        return f"<User {self.first_name} {self.last_name}>"


# Ryans part (ContactUS)
class ContactMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(15), nullable=True)
    country = db.Column(db.String(50), nullable=True)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())  # Automatically add timestamp

    def __repr__(self):
        return f"<ContactMessage {self.name} - {self.email}>"

# Brendons part (Employee)


class Product(db.Model):
    __tablename__ = 'products'  # Table name in the database

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)  # Unique identifier for the product
    name = db.Column(db.String(100), nullable=False)  # Product name
    description = db.Column(db.String(500), nullable=False)  # Product description
    price = db.Column(db.Float, nullable=False)  # Product price
    quantity = db.Column(db.Integer, nullable=False)  # Available quantity
    category = db.Column(db.String(255), nullable=False) #Product Category
    certification = db.Column(db.String(50), nullable=False) # Halal Certification
    image = db.Column(db.String(100), nullable=False)  # Path to the product image
    rating = db.Column(db.Float, default=0.0)

    def __repr__(self):
        return f"<Product {self.name}>"


#Employee class
class Employee(db.Model):

    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each employee
    first_name = db.Column(db.String(50), nullable=False)  # First name of the employee
    last_name = db.Column(db.String(50), nullable=False)  # Last name of the employee
    employee_id = db.Column(db.String(20), unique=True, nullable=False)  # Employee ID for login
    password_hash = db.Column(db.String(128), nullable=False)  # Hashed password for security


# Order class
class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Can be NULL for guests
    guest_email = db.Column(db.String(120), nullable=True)  # Store guest email
    address = db.Column(db.String(255), nullable=False)  # Store shipping address
    payment_method = db.Column(db.String(50), nullable=False)  # Cash/Card
    items = db.Column(db.Text, nullable=False)  # Store cart as JSON
    total_price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


