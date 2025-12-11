# app.py
import time
from google.api_core import exceptions as google_exceptions
import os
from dotenv import load_dotenv
try:
    import google.generativeai as genai
    GOOGLE_AVAILABLE = True
except Exception:
    genai = None
    GOOGLE_AVAILABLE = False
import PIL.Image
import sqlite3
import json
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, g
from flask_cors import CORS
from sqlalchemy.exc import IntegrityError
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta, timezone 
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from decimal import Decimal

#import DB language 



load_dotenv()#AI API

def utc_now():
    """Return current UTC datetime (timezone-aware)"""
    return datetime.now(timezone.utc)

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={r"/api/*": {"origins": "*"}})


# basic config
basedir = os.path.abspath(os.path.dirname(__file__))
# Use a real sqlite database file (not the .sql schema file).
db_path = os.path.join(basedir, 'byte_and_bite.db')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.environ.get('FLASK_SECRET', 'dev-secret')


# initialise SQLAlchemy
db = SQLAlchemy(app)

# SQLAlchemy models
class Customers(db.Model):
    __tablename__ = 'Customers'
    customer_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    #balance = db.Column(db.Numeric(10, 2), default=0.00)         #wei use deposited_cash instead
    deposited_cash = db.Column(db.Numeric(10, 2), default=0.00)
    is_blacklisted = db.Column(db.Boolean, default=False)
    warning_count = db.Column(db.Integer, default=0)
    phone_number = db.Column(db.String(20))
    order_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime)

class Blacklist(db.Model):
    __tablename__ = 'Blacklist'
    blacklist_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), unique=True)
    email = db.Column(db.String(100), unique=True)
    reason = db.Column(db.Text)
    date_added = db.Column(db.DateTime)

class Dishes(db.Model):
    __tablename__ = 'Dishes'
    dish_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    chef_id = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    image_url = db.Column(db.String(255))
    is_vip = db.Column(db.Boolean, default=False)

class Employees(db.Model):
    __tablename__ = 'Employees'
    employee_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='Active')
    reputation_score = db.Column(db.Numeric(3, 2), default=5.00)
    profile_image_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime)
    demotion_count = db.Column(db.Integer, default=0)
    complaint_count = db.Column(db.Integer, default=0)
    compliment_count = db.Column(db.Integer, default=0)

class VIP_Customers(db.Model):
    __tablename__ = 'VIP_Customers'
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), primary_key=True)
    vip_start_date = db.Column(db.Date)
    free_deliveries_remaining = db.Column(db.Integer, default=0)
    order_count = db.Column(db.Integer, default=0)

class Orders(db.Model):
    __tablename__ = 'Orders'
    order_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
    chef_id = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'))
    delivery_person_id = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'))
    status = db.Column(db.String(20), default='Pending')
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    vip_discount = db.Column(db.Numeric(10, 2), default=0.00)
    delivery_fee = db.Column(db.Numeric(10, 2), default=5.00)
    order_time = db.Column(db.DateTime, default=utc_now)
    completion_time = db.Column(db.DateTime)

    delivery_address = db.Column(db.String(255))
    delivery_phone = db.Column(db.String(20))

class Order_Items(db.Model):
    __tablename__ = 'Order_Items'
    order_id = db.Column(db.Integer, db.ForeignKey('Orders.order_id'), primary_key=True)
    dish_id = db.Column(db.Integer, db.ForeignKey('Dishes.dish_id'), primary_key=True)
    quantity = db.Column(db.Integer, default=1)

class Delivery_Bids(db.Model):
    __tablename__ = 'Delivery_Bids'
    bidding_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.Integer, db.ForeignKey('Orders.order_id'), nullable=False)
    start_time = db.Column(db.DateTime, default=utc_now)
    end_time = db.Column(db.DateTime)
    memo = db.Column(db.Text)
    status = db.Column(db.String(20), default='created')

class Bid(db.Model):
    __tablename__ = 'Bid'
    bid_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    bidding_id = db.Column(db.Integer, db.ForeignKey('Delivery_Bids.bidding_id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'), nullable=False)
    bid_amount = db.Column(db.Numeric(10, 2), nullable=False)
    bid_time = db.Column(db.DateTime, default=utc_now)
    is_winning_bid = db.Column(db.Boolean, default=False)

class Reviews(db.Model):
    __tablename__ = 'Reviews'
    review_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.Integer, db.ForeignKey('Orders.order_id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
    chef_id = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'))
    delivery_person_id = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'))
    chef_rating = db.Column(db.Integer)
    delivery_rating = db.Column(db.Integer)
    dish_rating = db.Column(db.Integer)
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Warnings(db.Model):
    __tablename__ = 'Warnings'
    warning_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AI_Knowledge_Base(db.Model):
    __tablename__ = 'AI_Knowledge_Base'
    kb_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'))
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    is_deleted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AI_Ratings(db.Model):
    __tablename__ = 'AI_Ratings'
    rating_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    kb_id = db.Column(db.Integer, db.ForeignKey('AI_Knowledge_Base.kb_id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=True)
    rating = db.Column(db.Integer)
    helpful_score = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Financial_Log(db.Model):
    __tablename__ = 'Financial_Log'
    log_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'))
    order_id = db.Column(db.Integer, db.ForeignKey('Orders.order_id'))
    type = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

<<<<<<< Updated upstream
=======
# Forum models
>>>>>>> Stashed changes
class Forum_Posts(db.Model):
    __tablename__ = 'Forum_Posts'
    post_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
<<<<<<< Updated upstream
    category = db.Column(db.String(50), default='general')
    created_at = db.Column(db.DateTime, default=utc_now)
=======
    category = db.Column(db.String(50), nullable=False)
    likes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=utc_now)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now)
>>>>>>> Stashed changes

class Forum_Comments(db.Model):
    __tablename__ = 'Forum_Comments'
    comment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    post_id = db.Column(db.Integer, db.ForeignKey('Forum_Posts.post_id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)

class Forum_Likes(db.Model):
    __tablename__ = 'Forum_Likes'
    like_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    post_id = db.Column(db.Integer, db.ForeignKey('Forum_Posts.post_id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
<<<<<<< Updated upstream
=======
class Forum_Comment_Likes(db.Model):
    __tablename__ = 'Forum_Comment_Likes'
    like_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    comment_id = db.Column(db.Integer, db.ForeignKey('Forum_Comments.comment_id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
class Forum_Post_Compliments(db.Model):
    __tablename__ = 'Forum_Post_Compliments'
    compliment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    post_id = db.Column(db.Integer, db.ForeignKey('Forum_Posts.post_id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
class Forum_Comment_Compliments(db.Model):
    __tablename__ = 'Forum_Comment_Compliments'
    compliment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    comment_id = db.Column(db.Integer, db.ForeignKey('Forum_Comments.comment_id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
class Forum_Reports(db.Model):
    __tablename__ = 'Forum_Reports'
    report_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
    content_type = db.Column(db.String(20), nullable=False)  # 'post' or 'comment'
    content_id = db.Column(db.Integer, nullable=False)  # post_id or comment_id
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'reviewed', 'resolved', 'notified', 'appealed', 'repealed', 'upheld'
    created_at = db.Column(db.DateTime, default=utc_now)
    reviewed_at = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'))
    appealed_at = db.Column(db.DateTime)
    appeal_message = db.Column(db.Text)

class User_Notifications(db.Model):
    __tablename__ = 'User_Notifications'
    notification_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'forum_report', 'system', etc.
    related_id = db.Column(db.Integer)  # Can reference report_id, post_id, etc.
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=utc_now)

class Complaints(db.Model):
    __tablename__ = 'Complaints'
    complaint_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    complainant_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)  # Who filed the complaint
    complainant_type = db.Column(db.String(20), nullable=False)  # 'customer' or 'delivery'
    accused_id = db.Column(db.Integer, nullable=False)  # ID of accused (customer_id or employee_id)
    accused_type = db.Column(db.String(20), nullable=False)  # 'customer', 'chef', 'delivery'
    complaint_type = db.Column(db.String(20), nullable=False)  # 'complaint' or 'compliment'
    category = db.Column(db.String(50), nullable=False)  # 'food_quality', 'service', 'behavior', 'delivery', etc.
    description = db.Column(db.Text, nullable=False)
    related_order_id = db.Column(db.Integer, db.ForeignKey('Orders.order_id'))  # For food/delivery complaints
    status = db.Column(db.String(20), default='pending')  # 'pending', 'under_review', 'upheld', 'dismissed', 'disputed', 'appealed', 'repealed', 'resolved'
    manager_reviewed_by = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'))
    manager_decision = db.Column(db.Text)  # Manager's explanation
    created_at = db.Column(db.DateTime, default=utc_now)
    reviewed_at = db.Column(db.DateTime)
    disputed_at = db.Column(db.DateTime)
    dispute_reason = db.Column(db.Text)
    appealed_at = db.Column(db.DateTime)
    appeal_message = db.Column(db.Text)
    disputed_at = db.Column(db.DateTime)
    dispute_reason = db.Column(db.Text)
>>>>>>> Stashed changes

def resolve_expired_biddings():
    """
    Checks all active biddings. If 5 minutes have passed since the first bid,
    automatically assign the order to the lowest bidder.
    """
    # Find all active biddings
    active_biddings = Delivery_Bids.query.filter_by(status='active').all()
    
    for bidding in active_biddings:
        # Check time (5 minutes expiration)
        # Note: start_time should be timezone-aware if using utc_now
        time_diff = datetime.now(timezone.utc) - bidding.start_time.replace(tzinfo=timezone.utc)
        
        if time_diff > timedelta(minutes=5):
            print(f"[SYSTEM] Bidding #{bidding.bidding_id} expired. Resolving...")
            
            # Find all bids for this session
            bids = Bid.query.filter_by(bidding_id=bidding.bidding_id).all()
            
            if not bids:
                # No bids? Maybe extend time or notify manager (For now, just leave it active)
                continue
                
            # Find lowest bid
            winning_bid = min(bids, key=lambda x: x.bid_amount)
            
            # 1. Update Order (Assign Employee)
            order = Orders.query.get(bidding.order_id)
            order.delivery_person_id = winning_bid.employee_id
            order.status = 'In Transit'
            
            # 2. Update Bidding status
            bidding.status = 'completed'
            
            # 3. Update Bid status
            winning_bid.is_winning_bid = True
            
            db.session.commit()
            print(f"[SYSTEM] Order #{order.order_id} assigned to Emp #{winning_bid.employee_id} at ${winning_bid.bid_amount}")


# Create all tables (commented out since DB is initialized from SQL)
with app.app_context():#wei
    db.create_all()

# Seed dishes if not exists
with app.app_context():
    if Dishes.query.count() == 0:
        # Get chef IDs for assignment
        chef_mario = Employees.query.filter_by(email='chef1@bytebite.com').first()
        chef_luigi = Employees.query.filter_by(email='chef2@bytebite.com').first()
        
        dishes_data = [
            {'name': 'Loaded Street Burger', 'price': 12.99, 'description': 'Double patty with special sauce, pickles, and crispy fries', 'image_url': 'https://images.unsplash.com/photo-1687937139478-1743eb2de051?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXJnZXIlMjBzdHJlZXQlMjBmb29kfGVufDF8fHx8MTc2MzQ4NDA4MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'chef_id': chef_mario.employee_id if chef_mario else None},
            {'name': 'Bao Buns', 'price': 10.99, 'description': 'Soft steamed buns with your choice of filling', 'image_url': 'https://images.unsplash.com/photo-1675096000167-4b8a276b6187?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYW8lMjBidW5zfGVufDF8fHx8MTc2MzQ4NDA4Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'chef_id': chef_luigi.employee_id if chef_luigi else None},
            {'name': 'Fusion Ramen Bowl', 'price': 14.99, 'description': 'Rich broth with handmade noodles, egg, and fresh toppings', 'image_url': 'https://images.unsplash.com/photo-1697652974652-a2336106043b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYW1lbiUyMGJvd2x8ZW58MXx8fHwxNzYzNDU2NTY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'chef_id': chef_mario.employee_id if chef_mario else None},
            {'name': 'Korean Fried Chicken', 'price': 16.99, 'description': 'Crispy chicken with sweet and spicy glaze', 'image_url': 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllZCUyMGNoaWNrZW58ZW58MXx8fHwxNzYzNDQ1Mjc5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'chef_id': chef_luigi.employee_id if chef_luigi else None},
            {'name': 'Street Tacos (3)', 'price': 13.99, 'description': 'Authentic street-style tacos with fresh cilantro and lime', 'image_url': 'https://images.unsplash.com/photo-1648437595587-e6a8b0cdf1f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjB0YWNvc3xlbnwxfHx8fDE3NjM0ODQwODF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'chef_id': chef_mario.employee_id if chef_mario else None},
            {'name': 'Truffle Wagyu Burger', 'price': 29.99, 'description': 'Premium wagyu beef with black truffle aioli and gold leaf garnish', 'image_url': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cnVmZmxlJTIwYnVyZ2VyfGVufDF8fHx8MTc2MzQ4NDA4M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'is_vip': True, 'chef_id': chef_mario.employee_id if chef_mario else None},
            {'name': 'Golden Foie Gras', 'price': 45.99, 'description': 'Pan-seared foie gras with edible gold dust and aged balsamic reduction', 'image_url': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb2llJTIwZ3Jhc3xlbnwxfHx8fDE3NjM0ODQwODR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'is_vip': True, 'chef_id': chef_luigi.employee_id if chef_luigi else None},
        ]
        for data in dishes_data:
            dish = Dishes(**data)
            db.session.add(dish)
        db.session.commit()

# Seed employees if not exists
with app.app_context():
    if Employees.query.count() == 0:
        employees_data = [
            {'name': 'John Manager', 'email': 'manager@bytebite.com', 'password_hash': generate_password_hash('manager123'), 'role': 'Manager', 'profile_image_url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW5hZ2VyJTIwcHJvZmlsZXxlbnwxfHx8fDE3NjM0ODQwODN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
            {'name': 'Chef Mario', 'email': 'chef1@bytebite.com', 'password_hash': generate_password_hash('chef123'), 'role': 'Chef', 'profile_image_url': 'https://mario.wiki.gallery/images/thumb/9/96/Mario_and_mushroom_SMB1_artwork.png/110px-Mario_and_mushroom_SMB1_artwork.png'},
            {'name': 'Chef Luigi', 'email': 'chef2@bytebite.com', 'password_hash': generate_password_hash('chef123'), 'role': 'Chef', 'profile_image_url': 'https://mario.wiki.gallery/images/thumb/b/b4/Luigi_NES.png/62px-Luigi_NES.png'},
            {'name': 'Delivery Dave', 'email': 'delivery1@bytebite.com', 'password_hash': generate_password_hash('delivery123'), 'role': 'Delivery', 'profile_image_url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWxpdmVyeSUyMGRyaXZlcnxlbnwxfHx8fDE3NjM0ODQwODYgfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
            {'name': 'Delivery Sarah', 'email': 'delivery2@bytebite.com', 'password_hash': generate_password_hash('delivery123'), 'role': 'Delivery', 'profile_image_url': 'https://images.unsplash.com/photo-1494790108755-2616b612b786?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBkZWxpdmVyeSUyMGRyaXZlcnxlbnwxfHx8fDE3NjM0ODQwODd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
        ]
        for data in employees_data:
            employee = Employees(**data)
            db.session.add(employee)
        db.session.commit()

    # Always ensure dishes have chef assignments
    chef_mario = Employees.query.filter_by(email='chef1@bytebite.com').first()
    chef_luigi = Employees.query.filter_by(email='chef2@bytebite.com').first()
    
    if chef_mario and chef_luigi:
        # Assign chefs to dishes
        burger = Dishes.query.filter_by(name='Loaded Street Burger').first()
        if burger and not burger.chef_id: burger.chef_id = chef_mario.employee_id
        
        bao = Dishes.query.filter_by(name='Bao Buns').first()
        if bao and not bao.chef_id: bao.chef_id = chef_luigi.employee_id
        
        ramen = Dishes.query.filter_by(name='Fusion Ramen Bowl').first()
        if ramen and not ramen.chef_id: ramen.chef_id = chef_mario.employee_id
        
        chicken = Dishes.query.filter_by(name='Korean Fried Chicken').first()
        if chicken and not chicken.chef_id: chicken.chef_id = chef_luigi.employee_id
        
        tacos = Dishes.query.filter_by(name='Street Tacos (3)').first()
        if tacos and not tacos.chef_id: tacos.chef_id = chef_mario.employee_id
        
        wagyu = Dishes.query.filter_by(name='Truffle Wagyu Burger').first()
        if wagyu and not wagyu.chef_id: wagyu.chef_id = chef_luigi.employee_id
        
        foie = Dishes.query.filter_by(name='Golden Foie Gras').first()
        if foie and not foie.chef_id: foie.chef_id = chef_mario.employee_id
        
        # Update Chef Mario's profile image
        if chef_mario:
            chef_mario.profile_image_url = 'https://mario.wiki.gallery/images/thumb/9/96/Mario_and_mushroom_SMB1_artwork.png/110px-Mario_and_mushroom_SMB1_artwork.png'
            db.session.commit()
        if chef_luigi:
            chef_luigi.profile_image_url = 'https://mario.wiki.gallery/images/thumb/b/b4/Luigi_NES.png/62px-Luigi_NES.png'
            db.session.commit()

# Seed AI Knowledge Base if not exists
with app.app_context():
        if AI_Knowledge_Base.query.count() == 0:
            print("Seeding AI Knowledge Base...")
            manager = Employees.query.filter_by(role='Manager').first()
            
            kb_data = [
                {
                    "question": "How can I become a VIP?",
                    "answer": "To become a VIP member, you need to spend at least $100 on delivered orders with us. Once you reach $100 in total order value, the system will automatically upgrade your status."
                },
                {
                    "question": "What are the benefits of being a VIP?",
                    "answer": "VIP members get access to exclusive menu items (like the Truffle Wagyu Burger) and receive special discounts on select orders."
                },
                {
                    "question": "What is the delivery process?",
                    "answer": "Our delivery process works in 3 steps: 1. You place an order. 2. Our chefs prepare it. 3. Our delivery staff bid to deliver your order. Once assigned, you can track the status from 'In Transit' to 'Delivered' in your profile."
                },
                {
                    "question": "Do you offer refunds?",
                    "answer": "Refunds are handled on a case-by-case basis. Please contact the manager at manager@bytebite.com if you have issues with your order."
                },
                {
                    "question": "Where are you located?",
                    "answer": "We are located at 123 Tech Avenue, San Francisco, CA 94103."
                }
            ]
            
            for item in kb_data:
                kb = AI_Knowledge_Base(
                    employee_id=manager.employee_id if manager else None,
                    question=item['question'],
                    answer=item['answer'],
                    created_at=datetime.now(timezone.utc)
                )
                db.session.add(kb)
            db.session.commit()
            print("AI Knowledge Base seeded!")

# Routes
@app.route("/")
def home():
    return jsonify({"message": "Byte&Bite API Server", "status": "running"})


@app.route("/menu")
def menu():
    return jsonify({"message": "Menu endpoint - use /api/menu instead"})



@app.route("/checkout", methods=["POST"])
def checkout():
    order_data = request.json
    # Increment order_count for the user
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
            payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
            email = payload.get('email')
            user = Customers.query.filter_by(email=email).first()
            print(f"[CHECKOUT] Found user: {user.email if user else None}, current order_count: {user.order_count if user else None}")
            if user:
                user.order_count = (user.order_count or 0) + 1
                db.session.add(user)
                db.session.commit()
                print(f"[CHECKOUT] Incremented order_count to: {user.order_count}")
            else:
                print(f"[CHECKOUT] No user found for email: {email}")
        except Exception as e:
            print(f"Error incrementing order_count in /checkout: {e}")
    return jsonify({"status": "success", "message": "Order received"})

@app.route("/order/<int:order_id>")
def order_status(order_id):
    # fetch order from database
    return render_template("order_status.html", order_id=order_id)


# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Backend is running"})


# Get single menu item
@app.route('/api/menu/<item_id>', methods=['GET'])
def get_menu_item(item_id):
    # Query menu item from database
    db_conn = sqlite3.connect(db_path)
    db_conn.row_factory = sqlite3.Row
    cursor = db_conn.cursor()
    cursor.execute("SELECT * FROM Dishes WHERE dish_id = ?", (item_id,))
    row = cursor.fetchone()
    db_conn.close()
    if row:
        item = dict(row)
        # Rename dish_id to id for frontend compatibility
        item['id'] = str(item.pop('dish_id'))
        item['price'] = float(item['price']) if item['price'] else 0
        return jsonify(item)
    return jsonify({"error": "Item not found"}), 404


# Get all menu items
@app.route('/api/menu', methods=['GET'])
def get_menu():
    category = request.args.get('category')
    
    # Check if user is authenticated and get VIP status
    is_vip = False
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
            payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
            email = payload.get('email')
            role = payload.get('role')
            
            # Check if this is a customer
            if role == 'Customer':
                customer = Customers.query.filter_by(email=email).first()
                if customer:
                    # Check if customer is VIP
                    vip_customer = VIP_Customers.query.filter_by(customer_id=customer.customer_id).first()
                    is_vip = vip_customer is not None
        except Exception as e:
            # If token is invalid, treat as unauthenticated
            pass
    
    # Get dishes based on VIP status
    if is_vip:
        # VIP customers see all dishes
        dishes = Dishes.query.all()
    else:
<<<<<<< Updated upstream
        # Non-VIP customers and visitors only see non-VIP dishes
=======
        # Non-VIP users and visitors only see non-VIP dishes
>>>>>>> Stashed changes
        dishes = Dishes.query.filter_by(is_vip=False).all()
    
    menu_items = []
    for dish in dishes:
        # Get chef name and image if chef_id exists
        chef_name = None
        chef_image = None
        if dish.chef_id:
            chef = Employees.query.filter_by(employee_id=dish.chef_id).first()
            if chef:
                chef_name = chef.name
                chef_image = chef.profile_image_url
        
        # Calculate average rating for this dish
        avg_rating = None
        try:
            # Get all reviews for orders containing this dish
            rating_result = db.session.query(db.func.avg(Reviews.dish_rating)).\
                join(Order_Items, Reviews.order_id == Order_Items.order_id).\
                filter(Order_Items.dish_id == dish.dish_id).\
                scalar()
            if rating_result is not None:
                avg_rating = round(float(rating_result), 1)
        except Exception as e:
            # If there's an error calculating rating, just continue without it
            pass
        
        item = {
            'id': str(dish.dish_id),
            'name': dish.name,
            'price': float(dish.price),
            'description': dish.description,
            'image': dish.image_url,
            'is_vip': dish.is_vip,
            'chef_name': chef_name,
            'chef_image': chef_image,
            'rating': avg_rating
        }
        menu_items.append(item)
    
    # Filter by category if provided (though schema doesn't have category, maybe add later)
    if category:
        # For now, no category filter
        pass
    
    return jsonify(menu_items)


# User registration
@app.route('/api/auth/register', methods=['POST'])
def register():

    data = request.get_json(silent=True) or request.form or {}
    username = (data.get('username') or data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    password = data.get('password') or ''
    phone_number = (data.get('phone_number') or '').strip()

    if not username or not email or not password or not phone_number:
        return jsonify({"success": False, "message": "username, email, password, and phone number are required"}), 400

    # Check blacklist table for banned email
    blacklisted = Blacklist.query.filter_by(email=email).first()
    if blacklisted:
        return jsonify({"success": False, "message": "This email is blacklisted from this website."}), 403

    # Check if email belongs to a blacklisted customer
    existing_blacklisted = Customers.query.filter_by(email=email, is_blacklisted=True).first()
    if existing_blacklisted:
        return jsonify({"success": False, "message": "This email belongs to a blacklisted account and cannot be used for registration."}), 403

    # Check for existing user
    existing = Customers.query.filter((Customers.username == username) | (Customers.email == email)).first()
    if existing:
        conflicts = []
        if existing.username == username:
            conflicts.append('username')
        if existing.email == email:
            conflicts.append('email')
        return jsonify({"success": False, "message": f"{' and '.join(conflicts)} already in use"}), 409

    # Hash password
    password_hash = generate_password_hash(password)
    # Insert new user
    try:
        new_user = Customers(
            username=username,
            email=email,
            password_hash=password_hash,
            phone_number=phone_number
        )
        db.session.add(new_user)
        db.session.commit()
        user_id = new_user.customer_id
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to create user", "error": str(e)}), 500

    return jsonify({"success": True, "message": "User registered successfully", "user": {"id": user_id, "username": username, "email": email}}), 201


# User login
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"success": False, "message": "email and password are required"}), 400

    user = Customers.query.filter_by(email=email).first()
    if not user:
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    # Check if user is blacklisted
    if user.is_blacklisted:
        return jsonify({"success": False, "message": "Your account has been blacklisted. Please contact support."}), 403

    if not check_password_hash(user.password_hash, password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    token = jwt.encode({
        'email': email,
        'role': 'Customer',
        'exp': datetime.now(timezone.utc) + timedelta(hours=24)
    }, app.secret_key, algorithm='HS256')

    return jsonify({
        "success": True,
        "token": token,
        "user": {
            "id": user.customer_id,
            "username": user.username,
            "email": user.email,
            "phone_number": user.phone_number,
            "warning_count": user.warning_count,
            "order_count": user.order_count,
        }
    }), 200


# Employee login
@app.route('/api/auth/employee/login', methods=['POST'])
def employee_login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"success": False, "message": "email and password are required"}), 400

    employee = Employees.query.filter_by(email=email).first()
    if not employee:
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    if not check_password_hash(employee.password_hash, password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    if employee.status != 'Active':
        return jsonify({"success": False, "message": "Account is not active"}), 403

    token = jwt.encode({
        'email': email,
        'role': employee.role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=24)
    }, app.secret_key, algorithm='HS256')

    return jsonify({
        "success": True,
        "token": token,
        "employee": {
            "id": employee.employee_id,
            "name": employee.name,
            "email": employee.email,
            "role": employee.role,
            "status": employee.status,
            "reputation_score": float(employee.reputation_score) if employee.reputation_score else 5.0
        }
    }), 200


# Get employee profile
@app.route('/api/auth/employee/profile', methods=['GET'])
def get_employee_profile():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Missing authorization header"}), 401

    try:
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        email = payload.get('email')
        role = payload.get('role')
    except Exception as e:
        return jsonify({"success": False, "message": "Invalid token"}), 401

    employee = Employees.query.filter_by(email=email).first()
    if not employee:
        return jsonify({"success": False, "message": "Employee not found"}), 404

    return jsonify({
        "success": True,
        "employee": {
            "id": employee.employee_id,
            "name": employee.name,
            "email": employee.email,
            "role": employee.role,
            "status": employee.status,
            "reputation_score": float(employee.reputation_score) if employee.reputation_score else 5.0
        }
    }), 200


# Role-based access control decorator
def require_role(required_role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get('Authorization')
            if not auth_header:
                return jsonify({"success": False, "message": "Missing authorization header"}), 401

            try:
                token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
                payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
                role = payload.get('role')
                if role != required_role:
                    return jsonify({"success": False, "message": "Insufficient permissions"}), 403
            except Exception as e:
                return jsonify({"success": False, "message": "Invalid token"}), 401

            return f(*args, **kwargs)
        return decorated_function
    return decorator


# Manager endpoints

# Get all employees
@app.route('/api/manager/employees', methods=['GET'])
@require_role('Manager')
def get_employees():
    employees = Employees.query.all()
    employee_list = []
    for emp in employees:
        employee_list.append({
            "id": emp.employee_id,
            "name": emp.name,
            "email": emp.email,
            "role": emp.role,
            "status": emp.status,
            "reputation_score": float(emp.reputation_score) if emp.reputation_score else 5.0,
            "complaint_count": emp.complaint_count,
            "demotion_count": emp.demotion_count
        })
    return jsonify({"success": True, "employees": employee_list}), 200


# Hire new employee
@app.route('/api/manager/employees', methods=['POST'])
@require_role('Manager')
def hire_employee():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not all([name, email, password, role]):
        return jsonify({"success": False, "message": "All fields are required"}), 400

    if role not in ['Chef', 'Delivery', 'Manager']:
        return jsonify({"success": False, "message": "Invalid role"}), 400

    # Check if email already exists
    existing = Employees.query.filter_by(email=email).first()
    if existing:
        return jsonify({"success": False, "message": "Email already exists"}), 400

    # Create new employee
    employee = Employees(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        role=role,
        status='Active'
    )
    db.session.add(employee)
    db.session.commit()

    return jsonify({"success": True, "message": "Employee hired successfully"}), 201


# Update employee status (fire/promote/demote)
@app.route('/api/manager/employees/<int:employee_id>', methods=['PUT'])
@require_role('Manager')
def update_employee(employee_id):
    data = request.get_json()
    action = data.get('action')  # 'fire', 'promote', 'demote', 'activate'

    employee = Employees.query.get(employee_id)
    if not employee:
        return jsonify({"success": False, "message": "Employee not found"}), 404

    if action == 'fire':
        employee.status = 'Fired'
    elif action == 'activate':
        employee.status = 'Active'
        employee.demotion_count = 0  # Reset demotions
        employee.complaint_count = 0  # Reset complaints
    elif action in ['promote', 'demote']:
        # For now, just update reputation score
        current_score = float(employee.reputation_score) if employee.reputation_score else 5.0
        if action == 'promote':
            employee.reputation_score = min(current_score + 0.5, 5.0)
        else:
            employee.reputation_score = max(current_score - 0.5, 1.0)
    else:
        return jsonify({"success": False, "message": "Invalid action"}), 400

    db.session.commit()
    return jsonify({"success": True, "message": f"Employee {action}d successfully"}), 200

# Update Employee Info (Manager) - Name, Email, Role
@app.route('/api/manager/employees/<int:employee_id>/info', methods=['PUT'])
@require_role('Manager')
def update_employee_info(employee_id):
    data = request.get_json()
    employee = Employees.query.get(employee_id)
    
    if not employee:
        return jsonify({"success": False, "message": "Employee not found"}), 404

    try:
        if 'name' in data:
            employee.name = data['name']
        if 'email' in data:
            employee.email = data['email']
        if 'role' in data:
            # Validate role
            if data['role'] in ['Chef', 'Delivery', 'Manager']:
                employee.role = data['role']
        
        db.session.commit()
        return jsonify({"success": True, "message": "Employee info updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to update employee info", "error": str(e)}), 500
    
# Delete employee
@app.route('/api/manager/employees/<int:employee_id>', methods=['DELETE'])
@require_role('Manager')
def delete_employee(employee_id):
    employee = Employees.query.get(employee_id)
    if not employee:
        return jsonify({"success": False, "message": "Employee not found"}), 404

    try:
        db.session.delete(employee)
        db.session.commit()
        return jsonify({"success": True, "message": "Employee deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to delete employee", "error": str(e)}), 500

# Get all customers (for management)
@app.route('/api/manager/customers', methods=['GET'])
@require_role('Manager')
<<<<<<< Updated upstream
def get_customers():
    customers = Customers.query.all()
    customer_list = []
    for cust in customers:
        # Check if VIP
        is_vip = VIP_Customers.query.filter_by(customer_id=cust.customer_id).first() is not None
        
        customer_list.append({
            "id": cust.customer_id,
            "username": cust.username,
            "email": cust.email,
            
            "balance": float(cust.deposited_cash) if cust.deposited_cash else 0.0,
            
            
            "phone_number": cust.phone_number if cust.phone_number else "", 
            
            "warning_count": cust.warning_count,
            "order_count": cust.order_count,
            "is_vip": is_vip,
            "is_blacklisted": cust.is_blacklisted
        })
    return jsonify({"success": True, "customers": customer_list}), 200
=======
def manage_customers():
    if request.method == 'GET':
        customers = Customers.query.all()
        customer_list = []
        for cust in customers:
            vip_record = VIP_Customers.query.filter_by(customer_id=cust.customer_id).first()
            is_vip = vip_record is not None
            customer_list.append({
                "id": cust.customer_id,
                "username": cust.username,
                "email": cust.email,
                "balance": float(cust.deposited_cash) if cust.deposited_cash else 0.0,
                "warning_count": cust.warning_count,
                "order_count": cust.order_count,
                "is_vip": is_vip,
                "is_blacklisted": cust.is_blacklisted
            })
        return jsonify({"success": True, "customers": customer_list}), 200

    elif request.method == 'PUT':
        data = request.get_json()
        customer_id = data.get('customer_id')
        action = data.get('action')  # 'promote_vip' or 'demote_vip'

        customer = Customers.query.get(customer_id)
        if not customer:
            return jsonify({"success": False, "message": "Customer not found"}), 404

        vip_record = VIP_Customers.query.filter_by(customer_id=customer.customer_id).first()

        if action == 'promote_vip':
            if not vip_record:
                new_vip = VIP_Customers(
                    customer_id=customer.customer_id,
                    vip_start_date=datetime.utcnow(),
                    free_deliveries_remaining=customer.order_count // 3,  # 1 free delivery for every 3 orders
                )
                db.session.add(new_vip)
                db.session.commit()
            return jsonify({"success": True, "message": f"{customer.username} promoted to VIP"}), 200

        elif action == 'demote_vip':
            if vip_record:
                db.session.delete(vip_record)
                db.session.commit()
            return jsonify({"success": True, "message": f"{customer.username} demoted from VIP"}), 200

        else:
            return jsonify({"success": False, "message": "Invalid action"}), 400 
>>>>>>> Stashed changes


    return jsonify({"success": True, "customers": customer_list}), 200
# Update Customer (Manager) - Specifically for Deposit
@app.route('/api/manager/customers/<int:customer_id>', methods=['PUT'])
@require_role('Manager')
def update_customer_manager(customer_id):
    data = request.get_json()
    print(f"Updating customer {customer_id} with data: {data}")
    customer = Customers.query.get(customer_id)
    
    if not customer:
        return jsonify({"success": False, "message": "Customer not found"}), 404

    try:
        # Update balance (deposit)
        if 'deposited_cash' in data:
            try:
                customer.deposited_cash = Decimal(str(data['deposited_cash']))
            except (ValueError, TypeError):
                return jsonify({"success": False, "message": "Invalid deposited_cash value"}), 400
        
        # Update other fields if needed
        if 'username' in data:
            customer.username = data['username']
        if 'email' in data:
            customer.email = data['email']
        if 'phone_number' in data:
            customer.phone_number = data['phone_number']
        
        # Handle Blacklist status
        if 'is_blacklisted' in data:
            old_blacklist_status = customer.is_blacklisted
            customer.is_blacklisted = data['is_blacklisted']
            
            if data['is_blacklisted'] and not old_blacklist_status:
                # Blacklisting: add to blacklist table
                existing_blacklist = Blacklist.query.filter(
                    (Blacklist.email == customer.email) | (Blacklist.customer_id == customer.customer_id)
                ).first()
                if not existing_blacklist:
                    blacklist_entry = Blacklist(
                        customer_id=customer.customer_id,
                        email=customer.email,
                        reason="Customer blacklisted by manager",
                        date_added=datetime.now(timezone.utc)
                    )
                    db.session.add(blacklist_entry)
            elif not data['is_blacklisted'] and old_blacklist_status:
                # Unblacklisting: remove from blacklist table
                blacklist_entry = Blacklist.query.filter_by(customer_id=customer.customer_id).first()
                if blacklist_entry:
                    db.session.delete(blacklist_entry)

        db.session.commit()
        return jsonify({"success": True, "message": "Customer updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error updating customer {customer_id}: {e}")
        return jsonify({"success": False, "message": "Failed to update customer", "error": str(e)}), 500
    
# Delete Customer (Manager)
@app.route('/api/manager/customers/<int:customer_id>', methods=['DELETE'])
@require_role('Manager')
def delete_customer_manager(customer_id):
    customer = Customers.query.get(customer_id)
    if not customer:
        return jsonify({"success": False, "message": "Customer not found"}), 404
        
    try:
        # If customer is blacklisted, ensure their email remains in blacklist table
        if customer.is_blacklisted:
            # Check if email is already in blacklist
            existing_blacklist = Blacklist.query.filter_by(email=customer.email).first()
            if not existing_blacklist:
                # Add to blacklist to prevent future registrations
                blacklist_entry = Blacklist(
                    customer_id=customer.customer_id,
                    email=customer.email,
                    reason="Account deleted while blacklisted",
                    date_added=datetime.now(timezone.utc)
                )
                db.session.add(blacklist_entry)
        
        # Note: You might need to handle cascading deletes for Orders/Reviews depending on your DB setup
        # For now, we assume simple deletion or you might prefer soft-delete (blacklisting)
        db.session.delete(customer)
        db.session.commit()
        return jsonify({"success": True, "message": "Customer deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to delete customer (User might have associated orders)", "error": str(e)}), 500

# Toggle VIP status for customer (Manager only)
@app.route('/api/manager/customers/<int:customer_id>/vip', methods=['PUT'])
@require_role('Manager')
def toggle_customer_vip(customer_id):
    data = request.get_json()
    promote = data.get('promote', False)
    
    customer = Customers.query.get(customer_id)
    if not customer:
        return jsonify({"success": False, "message": "Customer not found"}), 404
    
    try:
        if promote:
            # Add to VIP_Customers if not already VIP
            existing_vip = VIP_Customers.query.filter_by(customer_id=customer_id).first()
            if not existing_vip:
                vip_record = VIP_Customers(
                    customer_id=customer_id, 
                    vip_start_date=datetime.now().date(),
                    free_deliveries_remaining=customer.order_count // 3  # 1 free delivery for every 3 orders
                )
                db.session.add(vip_record)
                # Reset warnings as VIP "forgiveness"
                customer.warning_count = 0
        else:
            # Remove from VIP_Customers
            vip_record = VIP_Customers.query.filter_by(customer_id=customer_id).first()
            if vip_record:
                db.session.delete(vip_record)
                customer.warning_count = 0  # Uncomment if you want to reset on demotion too
        
        db.session.commit()
        return jsonify({"success": True, "message": f"Customer {'promoted to' if promote else 'demoted from'} VIP successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to update VIP status"}), 500

# Add warning to customer (Manager only)
@app.route('/api/manager/customers/<int:customer_id>/warning', methods=['POST'])
@require_role('Manager')
def add_customer_warning(customer_id):
    customer = Customers.query.get(customer_id)
    if not customer:
        return jsonify({"success": False, "message": "Customer not found"}), 404
    
    try:
        # Increment warning count
        customer.warning_count += 1
        
        # Auto-demote VIP customers after 2 warnings
        if customer.warning_count >= 2:
            vip_record = VIP_Customers.query.filter_by(customer_id=customer.customer_id).first()
            if vip_record:
                db.session.delete(vip_record)
                customer.warning_count = 0
        
        # Auto-blacklist after 3 warnings
        if customer.warning_count >= 3:
            customer.is_blacklisted = True
        
        # Create warning record
        warning = Warnings(
            customer_id=customer_id,
            reason="Warning issued by manager",
            created_at=datetime.utcnow()
        )
        db.session.add(warning)
        db.session.commit()
        
        return jsonify({"success": True, "message": "Warning added successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to add warning"}), 500

# 1. Get all active biddings with details
@app.route('/api/manager/biddings', methods=['GET'])
@require_role('Manager')
def get_manager_biddings():
    # Resolve any expired ones first
    resolve_expired_biddings()
    
    # Get active biddings
    active_biddings = Delivery_Bids.query.filter_by(status='active').all()
    
    biddings_data = []
    for b in active_biddings:
        order = Orders.query.get(b.order_id)
        # Get all bids for this session
        bids = Bid.query.filter_by(bidding_id=b.bidding_id).all()
        
        bids_info = []
        for bid in bids:
            emp = Employees.query.get(bid.employee_id)
            bids_info.append({
                "bid_id": bid.bid_id,
                "employee_id": bid.employee_id,
                "employee_name": emp.name,
                "bid_amount": float(bid.bid_amount),
                "bid_time": bid.bid_time.isoformat()
            })
            
        # Calculate time remaining
        elapsed = datetime.now(timezone.utc) - b.start_time.replace(tzinfo=timezone.utc)
        remaining_seconds = max(0, 300 - elapsed.total_seconds()) # 5 mins = 300s

        biddings_data.append({
            "bidding_id": b.bidding_id,
            "order_id": b.order_id,
            "start_time": b.start_time.isoformat(),
            "remaining_seconds": int(remaining_seconds),
            "order_total": float(order.total_price),
            "bids": bids_info
        })
        
    return jsonify({"success": True, "biddings": biddings_data}), 200

# 2. Manual Assignment (Manager Override)
@app.route('/api/manager/assign', methods=['POST'])
@require_role('Manager')
def manager_assign_order():
    data = request.get_json()
    bidding_id = data.get('bidding_id')
    employee_id = data.get('employee_id') # The employee chosen by manager
    memo = data.get('memo')
    
    bidding = Delivery_Bids.query.get(bidding_id)
    if not bidding or bidding.status != 'active':
        return jsonify({"success": False, "message": "Bidding session not active"}), 400
        
    try:
        # 1. Assign Order
        order = Orders.query.get(bidding.order_id)
        order.delivery_person_id = employee_id
        order.status = 'In Transit'
        
        # 2. Close Bidding
        bidding.status = 'completed_manually'
        bidding.end_time = datetime.now(timezone.utc)
        bidding.memo = memo # Save the manager's memo
        
        # 3. Mark the winning bid (if this employee made a bid)
        # Note: Manager can assign to someone who didn't bid, or someone who did.
        # If they bid, mark it.
        user_bid = Bid.query.filter_by(bidding_id=bidding.bidding_id, employee_id=employee_id).first()
        if user_bid:
            user_bid.is_winning_bid = True
            
        db.session.commit()
        return jsonify({"success": True, "message": "Order manually assigned successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Assignment failed", "error": str(e)}), 500


# Chef endpoints
# Create new dish
@app.route('/api/chef/dishes', methods=['POST'])
@require_role('Chef')
def create_dish():
    data = request.get_json()
    
    # Get chef ID from token
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    email = payload.get('email')
    chef = Employees.query.filter_by(email=email).first()
    
    if not chef or chef.role != 'Chef':
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    name = data.get('name')
    description = data.get('description')
    price = data.get('price')
    image_url = data.get('image_url', '')
    is_vip = data.get('is_vip', False)

    if not all([name, description, price]):
        return jsonify({"success": False, "message": "Name, description, and price are required"}), 400

    try:
        dish = Dishes(
            chef_id=chef.employee_id,
            name=name,
            description=description,
            price=price,
            image_url=image_url,
            is_vip=is_vip
        )
        db.session.add(dish)
        db.session.commit()
        return jsonify({"success": True, "message": "Dish created successfully", "dish_id": dish.dish_id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to create dish"}), 500


# Update dish
@app.route('/api/chef/dishes/<int:dish_id>', methods=['PUT'])
@require_role('Chef')
def update_dish(dish_id):
    data = request.get_json()
    
    # Get chef ID from token
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    email = payload.get('email')
    chef = Employees.query.filter_by(email=email).first()
    
    if not chef or chef.role != 'Chef':
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    dish = Dishes.query.get(dish_id)
    if not dish:
        return jsonify({"success": False, "message": "Dish not found"}), 404
    
    # Check if chef owns this dish
    if dish.chef_id != chef.employee_id:
        return jsonify({"success": False, "message": "You can only edit your own dishes"}), 403

    try:
        if 'name' in data:
            dish.name = data['name']
        if 'description' in data:
            dish.description = data['description']
        if 'price' in data:
            dish.price = data['price']
        if 'image_url' in data:
            dish.image_url = data['image_url']
        if 'is_vip' in data:
            dish.is_vip = data['is_vip']
        
        db.session.commit()
        return jsonify({"success": True, "message": "Dish updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to update dish"}), 500


# Delete dish
@app.route('/api/chef/dishes/<int:dish_id>', methods=['DELETE'])
@require_role('Chef')
def delete_dish(dish_id):
    # Get chef ID from token
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    email = payload.get('email')
    chef = Employees.query.filter_by(email=email).first()
    
    if not chef or chef.role != 'Chef':
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    dish = Dishes.query.get(dish_id)
    if not dish:
        return jsonify({"success": False, "message": "Dish not found"}), 404
    
    # Check if chef owns this dish
    if dish.chef_id != chef.employee_id:
        return jsonify({"success": False, "message": "You can only delete your own dishes"}), 403

    try:
        db.session.delete(dish)
        db.session.commit()
        return jsonify({"success": True, "message": "Dish deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to delete dish"}), 500


# Get chef's dishes
@app.route('/api/chef/dishes', methods=['GET'])
@require_role('Chef')
def get_chef_dishes():
    # Get chef ID from token
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    email = payload.get('email')
    chef = Employees.query.filter_by(email=email).first()
    
    if not chef or chef.role != 'Chef':
        return jsonify({"success": False, "message": "Unauthorized"}), 403

    dishes = Dishes.query.filter_by(chef_id=chef.employee_id).all()
    dish_list = []
    for dish in dishes:
        dish_list.append({
            "dish_id": dish.dish_id,
            "name": dish.name,
            "description": dish.description,
            "price": float(dish.price),
            "image_url": dish.image_url,
            "is_vip": dish.is_vip
        })
    
    return jsonify({"success": True, "dishes": dish_list}), 200

#wei
# Get chef's active orders (Pending / Cooking)
@app.route('/api/chef/orders', methods=['GET'])
@require_role('Chef')
def get_chef_orders():
    # Get current chef information
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1]
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    chef = Employees.query.filter_by(email=payload['email']).first()

    # Query orders assigned to this chef that are not yet completed
    # Note: This filters out 'Delivered', 'Cancelled', etc. statuses
    active_orders = Orders.query.filter(
        Orders.chef_id == chef.employee_id,
        Orders.status.in_(['Pending', 'Cooking'])
    ).order_by(Orders.order_time).all()

    orders_data = []
    for order in active_orders:
        # Get details of dishes included in this order
        items = []
        order_items = Order_Items.query.filter_by(order_id=order.order_id).all()
        for oi in order_items:
            dish = Dishes.query.get(oi.dish_id)
            items.append({
                "name": dish.name,
                "quantity": oi.quantity,
                "image_url": dish.image_url
            })

        orders_data.append({
            "order_id": order.order_id,
            "status": order.status,
            "total_price": float(order.total_price),
            "order_time": order.order_time.isoformat(),
            "items": items,  # Contains specific dish list
            "customer_id": order.customer_id
        })

    return jsonify({"success": True, "orders": orders_data}), 200 #wei


# Update order status
@app.route('/api/chef/orders/<int:order_id>/status', methods=['PUT'])
@require_role('Chef')
def update_order_status(order_id):
    data = request.get_json()
    new_status = data.get('status')
    
    # Allowed status transitions
    allowed_statuses = ['Cooking', 'Ready for Delivery']
    if new_status not in allowed_statuses:
        return jsonify({"success": False, "message": "Invalid status"}), 400

    order = Orders.query.get(order_id)
    
    # Permission check: can only modify own orders
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1]
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    chef = Employees.query.filter_by(email=payload['email']).first()
    
    if not order or order.chef_id != chef.employee_id:
        return jsonify({"success": False, "message": "Order not found or unauthorized"}), 404

    order.status = new_status
    db.session.commit()
    
    return jsonify({"success": True, "message": f"Order status updated to {new_status}"}), 200

# Get user profile
@app.route('/api/auth/profile', methods=['GET'])
def get_profile():
    print("[GET_PROFILE] Request received")
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        print("[GET_PROFILE] Missing auth header")
        return jsonify({"success": False, "message": "Missing authorization header"}), 401

    try:
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        email = payload.get('email')
        print(f"[GET_PROFILE] Decoded email: {email}")
    except Exception as e:
        print(f"[GET_PROFILE] Token decode error: {e}")
        return jsonify({"success": False, "message": "Invalid token"}), 401

    user = Customers.query.filter_by(email=email).first()
    if not user:
        print(f"[GET_PROFILE] User not found: {email}")
        return jsonify({"success": False, "message": "User not found"}), 404

    vip_record = VIP_Customers.query.filter_by(customer_id=user.customer_id).first()
    is_vip = vip_record is not None

    # Calculate total spent on delivered orders
    total_spent = db.session.query(db.func.sum(Orders.total_price)).filter(
        Orders.customer_id == user.customer_id, 
        Orders.status == 'Delivered'
    ).scalar() or Decimal('0.00')

    # Automatic promotion if total spent >= $100
    if not is_vip and total_spent >= Decimal('100.00'):
        try:
            # Promote user to VIP
            new_vip = VIP_Customers(
                customer_id=user.customer_id,
                vip_start_date=datetime.utcnow(),
                free_deliveries_remaining=user.order_count // 3,  # 1 free delivery for every 3 orders
            )
            db.session.add(new_vip)
            db.session.commit()
            is_vip = True
            vip_record = new_vip
            print(f"[GET_PROFILE] Auto-promoted {user.username} to VIP based on ${total_spent} spent")
        except IntegrityError:
            db.session.rollback()
            # Already VIP, perhaps promoted elsewhere
            vip_record = VIP_Customers.query.filter_by(customer_id=user.customer_id).first()
            is_vip = vip_record is not None
            print(f"[GET_PROFILE] User {user.username} already VIP") 
    print(f"[GET_PROFILE] Returning user data: deposited_cash={getattr(user, 'deposited_cash', None)}")
    return jsonify({
        "success": True,
        "user": {
            "id": user.customer_id,
            "username": user.username,
            "email": user.email,
            "deposited_cash": float(user.deposited_cash) if user.deposited_cash is not None else None,
            "phone_number": user.phone_number,
            "warning_count": user.warning_count,
            "order_count": user.order_count,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "is_vip": is_vip
        }
    }), 200



# Update user profile (with Financial Logging for deposits)
@app.route('/api/auth/profile', methods=['PUT'])
def update_profile():
    print("[UPDATE_PROFILE] Received update request")
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        print("[UPDATE_PROFILE] Missing auth header")
        return jsonify({"success": False, "message": "Missing authorization header"}), 401
    
    try:
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        email = payload.get('email')
        print(f"[UPDATE_PROFILE] Decoded email: {email}")
    except Exception as e:
        print(f"[UPDATE_PROFILE] Token decode error: {e}")
        return jsonify({"success": False, "message": "Invalid token"}), 401
    
    try:
        user = Customers.query.filter_by(email=email).first()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        data = request.get_json()
        print(f"[UPDATE_PROFILE] Received data: {data}")

        # Update fields if provided
        if 'username' in data:
            user.username = data['username']
        if 'email' in data:
            # Check if email is already taken by another user
            existing_user = Customers.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.customer_id != user.customer_id:
                return jsonify({"success": False, "message": "Email address is already in use"}), 400
            user.email = data['email']
        if 'phone_number' in data:
            user.phone_number = data['phone_number']
        if 'name' in data:
            user.username = data['name'] # Note: Assuming frontend sends 'name' for username updates
        if 'address' in data:
            # Assuming you might add an address field later, or map it appropriately
            pass 
            
        if 'deposited_cash' in data:
            print(f"[UPDATE_PROFILE] Updating deposited_cash: {data['deposited_cash']}")
            try:
                amount = Decimal(str(data['deposited_cash']))
                # Only log positive amounts (add funds)
                if amount > 0:
                    print(f"[UPDATE_PROFILE] Amount to add: {amount}")
                    user.deposited_cash = (user.deposited_cash or Decimal('0')) + amount
                    print(f"[UPDATE_PROFILE] New deposited_cash: {user.deposited_cash}")
                    
                    # --- Financial Log: Record Deposit ---
                    log = Financial_Log(
                        customer_id=user.customer_id,
                        type='Deposit',
                        amount=amount,
                        created_at=datetime.now(timezone.utc)
                    )
                    db.session.add(log)
                    print(f"[FINANCE] Logged deposit of ${amount} for User {user.customer_id}")
                    # -------------------------------------

            except (ValueError, TypeError) as e:
                print(f"[UPDATE_PROFILE] Error converting deposited_cash: {e}")
                return jsonify({"success": False, "message": "Invalid deposited_cash value"}), 400
                
        if 'payment_method' in data:
            # user.payment_method = data['payment_method'] # Uncomment if you have this column
            pass

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Profile updated successfully",
            "user": {
                "id": user.customer_id,
                "username": user.username,
                "email": user.email,
                "deposited_cash": float(user.deposited_cash) if user.deposited_cash is not None else None,
                "phone_number": user.phone_number,
                "warning_count": user.warning_count,
                "order_count": user.order_count,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Database error", "error": str(e)}), 500


# Place order (with Financial Logging for revenue)
@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    
    # Extract order data    
    cart_items = data.get('items', [])
    total_price = data.get('totalPrice', 0)
    delivery_info = data.get('deliveryInfo', {})
    full_address = f"{delivery_info.get('address', '')}, {delivery_info.get('city', '')} {delivery_info.get('zip', '')}".strip(', ')
    contact_phone = delivery_info.get('phone', '')

    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    try:
        # Authenticate user and check balance
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = Customers.query.filter_by(email=payload.get('email')).first()
        
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Check if user is blacklisted
        if user.is_blacklisted:
            return jsonify({"success": False, "message": "Your account has been blacklisted. Please contact support."}), 403

        # Check if user can order VIP dishes
        vip_record = VIP_Customers.query.filter_by(customer_id=user.customer_id).first()
        is_vip = vip_record is not None
        
        for item in cart_items:
            dish = Dishes.query.get(int(item['id']))
            if not dish:
                return jsonify({"success": False, "message": f"Dish with ID {item['id']} not found"}), 404
            if dish.is_vip and not is_vip:
                return jsonify({"success": False, "message": f"You must be a VIP customer to order {dish.name}"}), 403

        order_total = float(total_price)
        
        # Calculate delivery fee
        delivery_fee = Decimal('5.00')  # Default delivery fee
        requires_delivery = full_address and full_address != "Pickup"
        
        if requires_delivery and is_vip and vip_record:
            # For VIP customers, every 3rd order is free delivery
            current_order_count = vip_record.order_count or 0
            if (current_order_count + 1) % 3 == 0:
                delivery_fee = Decimal('0.00')
        
        # Add delivery fee to order total
        order_total = order_total + float(delivery_fee)
        
        # Check if user is VIP and apply 5% discount only to non-VIP dishes
        vip_record = VIP_Customers.query.filter_by(customer_id=user.customer_id).first()
        is_vip = vip_record is not None
        vip_discount = Decimal('0.00')
        
        if is_vip:
            # Calculate discount only on non-VIP dishes
            non_vip_subtotal = Decimal('0.00')
            for item in cart_items:
                dish = Dishes.query.get(int(item['id']))
                if dish and not dish.is_vip:  # Only apply discount to non-VIP dishes
                    item_total = Decimal(str(dish.price)) * Decimal(str(item['quantity']))
                    non_vip_subtotal += item_total
            
            vip_discount = non_vip_subtotal * Decimal('0.05')  # 5% discount on non-VIP dishes only
            order_total = float(Decimal(str(order_total)) - vip_discount)
        
        current_balance = float(user.deposited_cash or 0)

        if current_balance < order_total:
            # Record warning for insufficient balance
            user.warning_count = (user.warning_count or 0) + 1
            
            # Auto-demote VIP customers after 2 warnings
            if user.warning_count >= 2:
                vip_record = VIP_Customers.query.filter_by(customer_id=user.customer_id).first()
                if vip_record:
                    db.session.delete(vip_record)
                    user.warning_count = 0
            
            # Auto-blacklist after 3 warnings
            if user.warning_count >= 3:
                user.is_blacklisted = True
            
            db.session.commit()
            return jsonify({"success": False, "message": "Insufficient funds"}), 400

        # Deduct payment
        user.deposited_cash = current_balance - order_total
        user.order_count = (user.order_count or 0) + 1
        
        # Get cart dishes to assign chef
        cart_dishes = [Dishes.query.get(int(item['id'])) for item in cart_items]
        
        # Assign chef based on dishes in cart
        chef_id = None
        if cart_dishes:
            # Get all chef_ids from dishes in cart
            chef_ids = [dish.chef_id for dish in cart_dishes if dish and dish.chef_id]
            if chef_ids:
                # Count occurrences of each chef
                from collections import Counter
                chef_counts = Counter(chef_ids)
                # Assign to chef with most dishes in the order
                most_common_chef = chef_counts.most_common(1)[0][0]
                chef_id = most_common_chef
            else:
                # Fallback to first chef if no dishes have chefs assigned
                default_chef = Employees.query.filter_by(role='Chef').first()
                chef_id = default_chef.employee_id if default_chef else None

        # A. Create order record
        new_order = Orders(
            customer_id=user.customer_id,
            chef_id=chef_id, 
            status='Pending',
            total_price=order_total,
            vip_discount=vip_discount,
            delivery_fee=delivery_fee,
            order_time=datetime.now(timezone.utc),
            delivery_address=full_address if full_address else "Pickup",
            delivery_phone=contact_phone if contact_phone else user.phone_number
        )
        db.session.add(new_order)
        db.session.flush() # Generate new_order.order_id immediately

        # B. Create order details (Order_Items)
        for item in cart_items:
            order_item = Order_Items(
                order_id=new_order.order_id,
                dish_id=int(item['id']),
                quantity=item['quantity']
            )
            db.session.add(order_item)

        # --- Financial Log: Record Order Revenue ---
        log = Financial_Log(
            customer_id=user.customer_id,
            order_id=new_order.order_id,
            type='Order',
            amount=Decimal(str(order_total)),
            created_at=datetime.now(timezone.utc)
        )
        db.session.add(log)
        print(f"[FINANCE] Logged order revenue ${order_total} for Order #{new_order.order_id}")
        # -------------------------------------------

        # Commit all changes (deduction + order + items + log)
        db.session.commit()

        print(f"[SUCCESS] Order #{new_order.order_id} created for {user.username}")

        return jsonify({
            "success": True,
            "orderId": new_order.order_id,
            "message": "Order placed successfully",
            "estimatedDelivery": "30-45 minutes",
            "deliveryFee": float(delivery_fee),
            "vipDiscount": float(vip_discount),
            "finalTotal": order_total
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Create order failed: {e}")
        return jsonify({"success": False, "message": "Failed to create order", "error": str(e)}), 500
    
# Get financial logs (Manager only)
@app.route('/api/manager/financials', methods=['GET'])
@require_role('Manager')
def get_financial_logs():
    try:
        # Join with Customers table to get usernames and emails for the logs
        logs = db.session.query(Financial_Log, Customers.username, Customers.email)\
            .join(Customers, Financial_Log.customer_id == Customers.customer_id)\
            .order_by(Financial_Log.created_at.desc())\
            .all()
            
        logs_data = []
        for log, username, email in logs:
            logs_data.append({
                "log_id": log.log_id,
                "customer_name": username,
                "customer_email": email,
                "type": log.type, # 'Deposit' or 'Order'
                "amount": float(log.amount),
                "order_id": log.order_id,
                "created_at": log.created_at.isoformat()
            })
            
        return jsonify({"success": True, "logs": logs_data}), 200
    except Exception as e:
        print(f"Error fetching financial logs: {e}")
        return jsonify({"success": False, "message": "Failed to fetch logs"}), 500
    
# Get user orders wei
@app.route('/api/orders', methods=['GET'])
def get_orders():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Authentication required to view orders"}), 401
    
    try:
        # Decode token to get user email
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = Customers.query.filter_by(email=payload['email']).first()
        
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Query orders for this customer, newest first
        orders = Orders.query.filter_by(customer_id=user.customer_id).order_by(Orders.order_time.desc()).all()
        
        orders_data = []
        for order in orders:
            # Check if this order already has a review
            review = Reviews.query.filter_by(order_id=order.order_id).first()
            
            orders_data.append({
                "order_id": order.order_id,
                "total": float(order.total_price),
                "status": order.status,
                "date": order.order_time.strftime('%Y-%m-%d') if order.order_time else None,
                "has_review": review is not None
            })
            
        return jsonify({"success": True, "orders": orders_data}), 200
        
    except jwt.ExpiredSignatureError:
        return jsonify({"success": False, "message": "Session expired. Please login again"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"success": False, "message": "Invalid session. Please login again"}), 401
    except Exception as e:
        print(f"Error fetching orders: {e}")
        return jsonify({"success": False, "message": "Failed to fetch orders"}), 500


# Get detailed information for a specific order
@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order_details(order_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    try:
        # Decode token to get user email
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = Customers.query.filter_by(email=payload['email']).first()
        
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Get the order and verify it belongs to this user
        order = Orders.query.filter_by(order_id=order_id, customer_id=user.customer_id).first()
        if not order:
            return jsonify({"success": False, "message": "Order not found"}), 404

        # Get order items with dish details
        order_items = db.session.query(
            Order_Items.quantity,
            Dishes.dish_id,
            Dishes.name,
            Dishes.description,
            Dishes.price,
            Dishes.image_url,
            Employees.name.label('chef_name')
        ).join(Dishes, Order_Items.dish_id == Dishes.dish_id)\
         .join(Employees, Dishes.chef_id == Employees.employee_id)\
         .filter(Order_Items.order_id == order_id)\
         .all()

        items_data = []
        for item in order_items:
            items_data.append({
                'dish_id': item.dish_id,
                'name': item.name,
                'description': item.description,
                'price': float(item.price),
                'quantity': item.quantity,
                'image': item.image_url,
                'chef_name': item.chef_name,
                'subtotal': float(item.price * item.quantity)
            })

        # Get delivery person name if assigned
        delivery_person_name = None
        if order.delivery_person_id:
            delivery_person = Employees.query.filter_by(employee_id=order.delivery_person_id).first()
            if delivery_person:
                delivery_person_name = delivery_person.name

        order_data = {
            'order_id': order.order_id,
            'status': order.status,
            'total_price': float(order.total_price),
            'vip_discount': float(order.vip_discount) if order.vip_discount else 0.0,
            'order_time': order.order_time.isoformat() if order.order_time else None,
            'completion_time': order.completion_time.isoformat() if order.completion_time else None,
            'delivery_person_name': delivery_person_name,
            'delivery_address': order.delivery_address,
            'delivery_phone': order.delivery_phone,
            'items': items_data
        }

        return jsonify({"success": True, "order": order_data}), 200
        
    except Exception as e:
        print(f"Error fetching order details: {e}")
        return jsonify({"success": False, "message": "Failed to fetch order details"}), 500


# Delivery API endpoints wei

# --- 👇👇👇 Replacement for Delivery API endpoints section 👇👇👇 ---

# 1. Get available orders for bidding (Status is 'Ready for Delivery' and no one has taken the order)
@app.route('/api/delivery/available-orders', methods=['GET'])
@require_role('Delivery')
def get_available_orders():
    # Trigger system check before showing list
    resolve_expired_biddings()

    # Get current delivery person
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1]
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    me = Employees.query.filter_by(email=payload['email']).first()

    # Find orders that are 'Ready for Delivery' and NOT yet assigned
    orders = Orders.query.filter_by(status='Ready for Delivery', delivery_person_id=None).all()
    
    order_list = []
    for order in orders:
        # Check if I have already bid on this order
        # First, find the active bidding session for this order
        bidding = Delivery_Bids.query.filter_by(order_id=order.order_id, status='active').first()
        
        has_bid = False
        if bidding:
            my_bid = Bid.query.filter_by(bidding_id=bidding.bidding_id, employee_id=me.employee_id).first()
            if my_bid:
                has_bid = True
        
        # Only show if I haven't bid yet
        if not has_bid:
            customer = Customers.query.get(order.customer_id)
            order_list.append({
                "order_id": order.order_id,
                "customer_id": order.customer_id,
                "customer_name": customer.username,
                "customer_address": order.delivery_address, 
                "customer_phone": order.delivery_phone,
                "status": order.status,
                "total_price": float(order.total_price),
                "order_time": order.order_time.isoformat()
            })
    
    return jsonify({"success": True, "orders": order_list}), 200


# 2. Place Bid (Updated: Just record bid, do not auto-assign)
@app.route('/api/delivery/bid', methods=['POST'])
@require_role('Delivery')
def place_delivery_bid():
    data = request.get_json()
    order_id = data.get('order_id')
    bid_amount = data.get('bid_amount')

    if not order_id or not bid_amount:
        return jsonify({"success": False, "message": "Missing fields"}), 400

    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1]
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    delivery_person = Employees.query.filter_by(email=payload['email']).first()

    try:
        # 1. Get or Create active Bidding Session
        bidding = Delivery_Bids.query.filter_by(order_id=order_id, status='active').first()
        
        if not bidding:
            # First bid! Start the 5-minute timer now.
            bidding = Delivery_Bids(
                order_id=order_id,
                start_time=datetime.now(timezone.utc), # Timer starts here
                status='active'
            )
            db.session.add(bidding)
            db.session.flush() # Generate ID
            print(f"[BIDDING] Started for Order #{order_id} at {bidding.start_time}")

        # 2. Record the Bid
        new_bid = Bid(
            bidding_id=bidding.bidding_id,
            employee_id=delivery_person.employee_id,
            bid_amount=bid_amount,
            bid_time=datetime.now(timezone.utc),
            is_winning_bid=False # Not a winner yet
        )
        db.session.add(new_bid)
        db.session.commit()
        
        return jsonify({"success": True, "message": "Bid placed successfully! Waiting for system selection."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to place bid", "error": str(e)}), 500



# 3. Get "my" bid history
@app.route('/api/delivery/my-bids', methods=['GET'])
@require_role('Delivery')
def get_delivery_bids():
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1]
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    delivery_person = Employees.query.filter_by(email=payload['email']).first()

    bids = Bid.query.filter_by(employee_id=delivery_person.employee_id).order_by(Bid.bid_time.desc()).all()
    
    bids_list = []
    for bid in bids:
        # Get associated order ID
        bidding = Delivery_Bids.query.get(bid.bidding_id)
        bids_list.append({
            "bid_id": bid.bid_id,
            "order_id": bidding.order_id,
            "bid_amount": float(bid.bid_amount),
            "bid_time": bid.bid_time.isoformat(),
            "is_winning_bid": bid.is_winning_bid
        })
    
    return jsonify({"success": True, "bids": bids_list}), 200


# 4. Get tasks "I" am currently delivering (In Transit)
@app.route('/api/delivery/my-deliveries', methods=['GET'])
@require_role('Delivery')
def get_delivery_deliveries():
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1]
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    delivery_person = Employees.query.filter_by(email=payload['email']).first()

    # Get current deliveries (In Transit)
    current_deliveries = Orders.query.filter(
        Orders.delivery_person_id == delivery_person.employee_id,
        Orders.status == 'In Transit'
    ).all()

    # Get recently completed deliveries (last 30 days) for feedback submission
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    completed_deliveries = Orders.query.filter(
        Orders.delivery_person_id == delivery_person.employee_id,
        Orders.status == 'Delivered',
        Orders.completion_time >= thirty_days_ago
    ).order_by(Orders.completion_time.desc()).all()

    deliveries_list = []
    
    # Add current deliveries
    for order in current_deliveries:
        customer = Customers.query.get(order.customer_id)
        deliveries_list.append({
            "order_id": order.order_id,
            "customer_id": order.customer_id,
            "customer_name": customer.username if customer else "Unknown",
            "customer_address": order.delivery_address,
            "customer_phone": order.delivery_phone,
            "status": order.status,
            "total_price": float(order.total_price),
            "order_time": order.order_time.isoformat(),
            "can_submit_feedback": False,
            "feedback_submitted": False
        })

    # Add completed deliveries with feedback status
    for order in completed_deliveries:
        customer = Customers.query.get(order.customer_id)
        
        # Check if feedback has already been submitted for this delivery
        feedback_submitted = Complaints.query.filter_by(
            complainant_id=delivery_person.employee_id,
            complainant_type='delivery',
            accused_id=order.customer_id,
            accused_type='customer',
            related_order_id=order.order_id
        ).first() is not None
        
        deliveries_list.append({
            "order_id": order.order_id,
            "customer_id": order.customer_id,
            "customer_name": customer.username if customer else "Unknown",
            "customer_address": order.delivery_address,
            "customer_phone": order.delivery_phone,
            "status": order.status,
            "total_price": float(order.total_price),
            "order_time": order.order_time.isoformat(),
            "completion_time": order.completion_time.isoformat() if order.completion_time else None,
            "can_submit_feedback": True,
            "feedback_submitted": feedback_submitted
        })

    return jsonify({"success": True, "deliveries": deliveries_list}), 200

# Get feedback categories for delivery drivers
@app.route('/api/delivery/feedback-categories', methods=['GET'])
@require_role('Delivery')
def get_delivery_feedback_categories():
    """Get available categories for delivery driver feedback about customers"""
    categories = {
        "complaint": [
            "rude_behavior",
            "property_damage", 
            "unsafe_location",
            "inappropriate_requests",
            "payment_issues",
            "other"
        ],
        "compliment": [
            "friendly",
            "helpful",
            "clean_property",
            "good_communication",
            "generous_tip",
            "other"
        ]
    }
    
    return jsonify({
        "success": True, 
        "categories": categories,
        "feedback_types": ["complaint", "compliment"]
    }), 200

# 5. Update delivery status (In Transit -> Delivered)
@app.route('/api/delivery/update-status', methods=['POST'])
@require_role('Delivery')
def update_delivery_status():
    data = request.get_json()
    order_id = data.get('order_id')
    new_status = data.get('status') # Should be 'Delivered'

    order = Orders.query.get(order_id)
    if not order:
        return jsonify({"success": False, "message": "Order not found"}), 404
    
    order.status = new_status
    if new_status == 'Delivered':
        order.completion_time = datetime.now(timezone.utc)
    
    db.session.commit()
    return jsonify({"success": True, "message": f"Order status updated to {new_status}", "show_feedback_prompt": new_status == 'Delivered'}), 200

# Delivery driver feedback about customer after delivery completion
@app.route('/api/delivery/customer-feedback', methods=['POST'])
@require_role('Delivery')
def submit_delivery_customer_feedback():
    """Allow delivery drivers to submit complaints or compliments about customers after delivery completion"""
    data = request.get_json()
    order_id = data.get('order_id')
    feedback_type = data.get('feedback_type')  # 'complaint' or 'compliment'
    category = data.get('category')  # e.g., 'rude', 'helpful', 'clean', 'messy', etc.
    description = data.get('description')

    if not all([order_id, feedback_type, category, description]):
        return jsonify({"success": False, "message": "All fields required"}), 400

    if feedback_type not in ['complaint', 'compliment']:
        return jsonify({"success": False, "message": "Invalid feedback type"}), 400

    try:
        # Get delivery driver info
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        delivery_driver = Employees.query.filter_by(email=payload['email']).first()

        # Verify the order exists and was delivered by this driver
        order = Orders.query.filter_by(
            order_id=order_id,
            delivery_person_id=delivery_driver.employee_id,
            status='Delivered'
        ).first()

        if not order:
            return jsonify({"success": False, "message": "Order not found or not delivered by you"}), 404

        # Get customer info
        customer = Customers.query.get(order.customer_id)
        if not customer:
            return jsonify({"success": False, "message": "Customer not found"}), 404

        # Check if feedback already submitted for this order by this driver
        existing_feedback = Complaints.query.filter_by(
            complainant_id=delivery_driver.employee_id,
            complainant_type='delivery',
            accused_id=customer.customer_id,
            accused_type='customer',
            related_order_id=order_id
        ).first()

        if existing_feedback:
            return jsonify({"success": False, "message": "Feedback already submitted for this delivery"}), 400

        # Create the feedback complaint/compliment
        new_feedback = Complaints(
            complainant_id=delivery_driver.employee_id,
            complainant_type='delivery',
            accused_id=customer.customer_id,
            accused_type='customer',
            complaint_type=feedback_type,
            category=category,
            description=description,
            related_order_id=order_id
        )

        # If this is a compliment, mark as resolved and decrement warning count
        if feedback_type == 'compliment':
            new_feedback.status = 'resolved'
            new_feedback.reviewed_at = datetime.now(timezone.utc)
            if customer.warning_count > 0:
                customer.warning_count -= 1

        db.session.add(new_feedback)
        db.session.commit()

        return jsonify({"success": True, "message": f"Feedback submitted successfully"}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Delivery feedback error: {e}")
        return jsonify({"success": False, "message": "Failed to submit feedback"}), 500


# 1. Submit a review
@app.route('/api/reviews', methods=['POST'])
def create_review():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    # Parse the token to obtain the user ID.
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = Customers.query.filter_by(email=payload['email']).first()
    except:
        return jsonify({"success": False, "message": "Invalid token"}), 401

    # Check if customer is VIP
    is_vip = VIP_Customers.query.filter_by(customer_id=user.customer_id).first() is not None
    multiplier = 2 if is_vip else 1

    data = request.get_json()
    order_id = data.get('order_id')
    chef_rating = data.get('chef_rating')
    dish_rating = data.get('dish_rating')
    delivery_rating = data.get('delivery_rating')
    comment = data.get('comment')
    compliment_chef = data.get('compliment_chef', False)
    complaint_chef = data.get('complaint_chef', False)
    compliment_delivery = data.get('compliment_delivery', False)
    complaint_delivery = data.get('complaint_delivery', False)

    # Simple verification
    if not all([order_id, chef_rating, dish_rating, delivery_rating]):
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    # Check if the order exists and belongs to this user.
    order = Orders.query.filter_by(order_id=order_id, customer_id=user.customer_id).first()
    if not order:
        return jsonify({"success": False, "message": "Order not found or access denied"}), 404

    # Check if it has already been reviewed.
    if Reviews.query.filter_by(order_id=order_id).first():
        return jsonify({"success": False, "message": "Order already reviewed"}), 400

    try:
        # 1. Save the review first
        review = Reviews(
            order_id=order_id,
            customer_id=user.customer_id,
            chef_id=order.chef_id, 
            delivery_person_id=order.delivery_person_id,
            chef_rating=chef_rating,
            dish_rating=dish_rating,
            delivery_rating=delivery_rating,
            comment=comment,
            created_at=datetime.now(timezone.utc)
        )
        db.session.add(review)
        # Commit here so the new rating is included in the average calculation below
        db.session.commit() 

        # 2. Update Chef's Reputation Score
        if order.chef_id:
            # Calculate new average rating for the chef
            avg_chef_rating = db.session.query(db.func.avg(Reviews.chef_rating))\
                .filter(Reviews.chef_id == order.chef_id).scalar()
            
            if avg_chef_rating:
                chef = Employees.query.get(order.chef_id)
                # Convert to Decimal and round to 2 decimal places
                chef.reputation_score = round(Decimal(avg_chef_rating), 2)
                
                # Evaluate chef performance after rating update
                evaluate_employee_performance(chef)

        # 3. Update Delivery Person's Reputation Score
        if order.delivery_person_id:
            # Calculate new average rating for the delivery person
            avg_delivery_rating = db.session.query(db.func.avg(Reviews.delivery_rating))\
                .filter(Reviews.delivery_person_id == order.delivery_person_id).scalar()
            
            if avg_delivery_rating:
                delivery_person = Employees.query.get(order.delivery_person_id)
                # Convert to Decimal and round to 2 decimal places
                delivery_person.reputation_score = round(Decimal(avg_delivery_rating), 2)

        # Commit the updates to employee scores
        db.session.commit()

        # 4. Handle compliments and complaints
        if compliment_chef and order.chef_id:
            chef_compliment = Complaints(
                complainant_id=user.customer_id,
                complainant_type='customer',
                accused_id=order.chef_id,
                accused_type='chef',
                complaint_type='compliment',
                category='service',
                description=f"Compliment from review: {comment}",
                related_order_id=order_id
            )
            db.session.add(chef_compliment)
            # Increment chef's compliment_count and decrement complaint_count
            chef = Employees.query.get(order.chef_id)
            if chef:
                chef.compliment_count += multiplier
                chef.complaint_count = max(0, chef.complaint_count - multiplier)
                db.session.add(chef)

        if complaint_chef and order.chef_id:
            chef_complaint = Complaints(
                complainant_id=user.customer_id,
                complainant_type='customer',
                accused_id=order.chef_id,
                accused_type='chef',
                complaint_type='complaint',
                category='service',
                description=f"Complaint from review: {comment}",
                related_order_id=order_id
            )
            db.session.add(chef_complaint)
            # Increment chef's complaint_count
            chef = Employees.query.get(order.chef_id)
            if chef:
                chef.complaint_count += multiplier
                db.session.add(chef)

        if compliment_delivery and order.delivery_person_id:
            delivery_compliment = Complaints(
                complainant_id=user.customer_id,
                complainant_type='customer',
                accused_id=order.delivery_person_id,
                accused_type='delivery',
                complaint_type='compliment',
                category='service',
                description=f"Compliment from review: {comment}",
                related_order_id=order_id
            )
            db.session.add(delivery_compliment)
            # Increment delivery's compliment_count and decrement complaint_count
            delivery_person = Employees.query.get(order.delivery_person_id)
            if delivery_person:
                delivery_person.compliment_count += multiplier
                delivery_person.complaint_count = max(0, delivery_person.complaint_count - multiplier)
                db.session.add(delivery_person)

        if complaint_delivery and order.delivery_person_id:
            delivery_complaint = Complaints(
                complainant_id=user.customer_id,
                complainant_type='customer',
                accused_id=order.delivery_person_id,
                accused_type='delivery',
                complaint_type='complaint',
                category='service',
                description=f"Complaint from review: {comment}",
                related_order_id=order_id
            )
            db.session.add(delivery_complaint)
            # Increment delivery's complaint_count
            delivery_person = Employees.query.get(order.delivery_person_id)
            if delivery_person:
                delivery_person.complaint_count += multiplier
                db.session.add(delivery_person)

        db.session.commit()

        return jsonify({"success": True, "message": "Review submitted and scores updated successfully"}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to save review", "error": str(e)}), 500

# 2. Get chef reviews (for use in ChefDashboard)
@app.route('/api/chef/reviews', methods=['GET'])
@require_role('Chef') # Use the decorator you defined earlier.
def get_chef_reviews():
    # Get the current chef.
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1]
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    chef = Employees.query.filter_by(email=payload['email']).first()

    # Retrieve all reviews associated with this chef.
    reviews = Reviews.query.filter_by(chef_id=chef.employee_id).order_by(Reviews.created_at.desc()).all()
    
    review_list = []
    for r in reviews:
        # Retrieve the associated dish names (this is a simplified approach; in reality, it might require a join query through Order_Items).
        review_list.append({
            "review_id": r.review_id,
            "dish_rating": r.dish_rating,
            "comment": r.comment,
            "created_at": r.created_at.isoformat(),
            "customer_id": r.customer_id
        })
    
    return jsonify({"success": True, "reviews": review_list}), 200


# Get featured chefs for home page
@app.route('/api/chefs/featured', methods=['GET'])
def get_featured_chefs():
    try:
        # Get chef with most dishes
        chef_most_dishes = db.session.query(
            Employees.employee_id, Employees.name, Employees.reputation_score, Employees.profile_image_url,
            db.func.count(Dishes.dish_id).label('total_dishes')
        ).join(Dishes, Employees.employee_id == Dishes.chef_id)\
         .filter(Employees.role == 'Chef')\
         .group_by(Employees.employee_id, Employees.name, Employees.reputation_score, Employees.profile_image_url)\
         .order_by(db.func.count(Dishes.dish_id).desc())\
         .first()
        
        # Get chef with highest rating
        chef_highest_rating = db.session.query(
            Employees.employee_id, Employees.name, Employees.reputation_score, Employees.profile_image_url,
            db.func.avg(Reviews.chef_rating).label('avg_rating')
        ).join(Reviews, Employees.employee_id == Reviews.chef_id)\
         .filter(Employees.role == 'Chef')\
         .group_by(Employees.employee_id, Employees.name, Employees.reputation_score, Employees.profile_image_url)\
         .order_by(db.func.avg(Reviews.chef_rating).desc())\
         .first()
        
        featured_chefs = []
        
        # Add chef with most dishes
        if chef_most_dishes:
            # Calculate dish count for this chef
            dish_count = Dishes.query.filter_by(chef_id=chef_most_dishes.employee_id).count()
            
            featured_chefs.append({
                'employee_id': chef_most_dishes.employee_id,
                'name': chef_most_dishes.name,
                'rating': None,  # We'll calculate this below
                'dish_count': dish_count,
                'reputation_score': float(chef_most_dishes.reputation_score) if chef_most_dishes.reputation_score else 5.0,
                'profile_image_url': chef_most_dishes.profile_image_url,
                'total_dishes': chef_most_dishes.total_dishes
            })
        
        # If we don't have 2 chefs yet, try to get the second highest rated chef
        if len(featured_chefs) < 2:
            # Get the second highest rated chef (excluding the one we already have)
            excluded_ids = [chef['employee_id'] for chef in featured_chefs]
            chef_second_highest = db.session.query(
                Employees.employee_id, Employees.name, Employees.reputation_score, Employees.profile_image_url,
                db.func.avg(Reviews.chef_rating).label('avg_rating')
            ).join(Reviews, Employees.employee_id == Reviews.chef_id)\
             .filter(Employees.role == 'Chef')\
             .filter(~Employees.employee_id.in_(excluded_ids))\
             .group_by(Employees.employee_id, Employees.name, Employees.reputation_score, Employees.profile_image_url)\
             .order_by(db.func.avg(Reviews.chef_rating).desc())\
             .first()
            
            if chef_second_highest:
                # Calculate dish count for this chef
                dish_count = Dishes.query.filter_by(chef_id=chef_second_highest.employee_id).count()
                
                featured_chefs.append({
                    'employee_id': chef_second_highest.employee_id,
                    'name': chef_second_highest.name,
                    'rating': round(float(chef_second_highest.avg_rating), 1),
                    'dish_count': dish_count,
                    'reputation_score': float(chef_second_highest.reputation_score) if chef_second_highest.reputation_score else 5.0,
                    'profile_image_url': chef_second_highest.profile_image_url,
                    'total_orders': None  # We'll calculate this below
                })
        
        # If we still don't have 2 chefs, get any other chef with dishes
        if len(featured_chefs) < 2:
            # Get another chef with dishes (excluding ones we already have)
            excluded_ids = [chef['employee_id'] for chef in featured_chefs]
            other_chef = db.session.query(
                Employees.employee_id, Employees.name, Employees.reputation_score, Employees.profile_image_url
            ).join(Dishes, Employees.employee_id == Dishes.chef_id)\
             .filter(Employees.role == 'Chef')\
             .filter(~Employees.employee_id.in_(excluded_ids))\
             .group_by(Employees.employee_id, Employees.name, Employees.reputation_score, Employees.profile_image_url)\
             .first()
            
            if other_chef:
                # Calculate dish count and rating for this chef
                dish_count = Dishes.query.filter_by(chef_id=other_chef.employee_id).count()
                
                # Calculate average rating
                rating = None
                try:
                    rating_result = db.session.query(db.func.avg(Reviews.chef_rating)).\
                        filter(Reviews.chef_id == other_chef.employee_id).\
                        scalar()
                    if rating_result is not None:
                        rating = round(float(rating_result), 1)
                except Exception as e:
                    pass
                
                featured_chefs.append({
                    'employee_id': other_chef.employee_id,
                    'name': other_chef.name,
                    'rating': rating,
                    'dish_count': dish_count,
                    'reputation_score': float(other_chef.reputation_score) if other_chef.reputation_score else 5.0,
                    'profile_image_url': other_chef.profile_image_url,
                    'total_orders': None  # We'll calculate this below
                })
        
        # Calculate ratings and order counts for all featured chefs
        for chef in featured_chefs:
            if chef['rating'] is None:
                # Calculate average rating
                try:
                    rating_result = db.session.query(db.func.avg(Reviews.chef_rating)).\
                        filter(Reviews.chef_id == chef['employee_id']).\
                        scalar()
                    if rating_result is not None:
                        chef['rating'] = round(float(rating_result), 1)
                except Exception as e:
                    chef['rating'] = None
            
            if chef.get('total_orders') is None and chef.get('total_dishes') is None:
                # Calculate total orders or dishes
                try:
                    orders_result = db.session.query(db.func.count(Order_Items.order_id)).\
                        join(Dishes, Order_Items.dish_id == Dishes.dish_id)\
                        .join(Orders, Order_Items.order_id == Orders.order_id)\
                        .filter(Dishes.chef_id == chef['employee_id'])\
                        .filter(Orders.status == 'Delivered')\
                        .scalar()
                    chef['total_orders'] = orders_result or 0
                except Exception as e:
                    chef['total_orders'] = 0
        
        return jsonify({"success": True, "chefs": featured_chefs}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to fetch featured chefs"}), 500


# Get recent orders for home page display
@app.route('/api/orders/recent', methods=['GET'])
def get_recent_orders():
    try:
        # Check if user is authenticated
        auth_header = request.headers.get('Authorization')
        customer_id = None
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
                payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
                email = payload.get('email')
                
                # Check if this is a customer (not employee)
                role = payload.get('role')
                if role == 'Customer':
                    customer = Customers.query.filter_by(email=email).first()
                    if customer:
                        customer_id = customer.customer_id
            except Exception as e:
                # If token is invalid, treat as unauthenticated
                pass
        
        if customer_id:
            # Return recent orders for this specific customer
            orders = Orders.query.filter_by(customer_id=customer_id)\
                .filter(Orders.status.in_(['Delivered', 'In Transit', 'Ready for Delivery']))\
                .order_by(Orders.order_time.desc())\
                .limit(6)\
                .all()
        else:
            # Return general recent orders for display (when not logged in)
            orders = Orders.query\
                .filter(Orders.status.in_(['Delivered', 'In Transit', 'Ready for Delivery']))\
                .order_by(Orders.order_time.desc())\
                .limit(6)\
                .all()
        
        orders_data = []
        for order in orders:
            # Get customer name
            customer = Customers.query.get(order.customer_id)
            customer_name = customer.username if customer else "Unknown Customer"
            
            # Get order items count
            items_count = Order_Items.query.filter_by(order_id=order.order_id).count()
            
            orders_data.append({
                'order_id': order.order_id,
                'customer_name': customer_name,
                'items_count': items_count,
                'total': float(order.total_price),
                'date': order.order_time.isoformat() if order.order_time else None,
                'status': order.status
            })
        
        return jsonify({"success": True, "orders": orders_data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to fetch recent orders"}), 500
@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    try:
        # Check if user is authenticated
        auth_header = request.headers.get('Authorization')
        customer_id = None
        is_authenticated = False
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
                payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
                email = payload.get('email')
                
                # Check if this is a customer (not employee)
                role = payload.get('role')
                if role == 'Customer':
                    customer = Customers.query.filter_by(email=email).first()
                    if customer:
                        customer_id = customer.customer_id
                        is_authenticated = True
            except Exception as e:
                # If token is invalid, treat as unauthenticated
                pass
        
        if is_authenticated and customer_id:
            # Check if customer has any orders
            has_orders = Orders.query.filter_by(customer_id=customer_id).count() > 0
            if has_orders:
                return get_personalized_recommendations(customer_id)
            else:
                # New customers with no orders see general recommendations
                return get_general_recommendations()
        else:
            return get_general_recommendations()
            
    except Exception as e:
        print(f"Error in get_recommendations: {e}")
        return jsonify({"success": False, "message": "Failed to fetch recommendations"}), 500

<<<<<<< Updated upstream
=======

def get_personalized_recommendations(customer_id):
    """Get personalized recommendations based on user's order history"""
    # Get most ordered dishes by this customer
    most_ordered = get_customer_most_ordered(customer_id)
    
    # Get highest rated dishes by this customer
    highest_rated = get_customer_highest_rated(customer_id)
    
    return jsonify({
        "success": True,
        "recommendations": {
            "type": "personalized",
            "most_ordered": most_ordered,
            "highest_rated": highest_rated
        }
    }), 200


def get_general_recommendations():
    """Get general recommendations for visitors - most popular and top rated dishes"""
    # Get most popular dishes overall
    most_popular = get_most_popular_dishes()
    
    # Get top rated dishes overall
    top_rated = get_top_rated_dishes()
    
    return jsonify({
        "success": True,
        "recommendations": {
            "type": "general",
            "most_popular": most_popular,
            "top_rated": top_rated
        }
    }), 200


def get_customer_most_ordered(customer_id, limit=3):
    """Get most ordered dishes by a specific customer"""
    query = db.session.query(
        Dishes.dish_id, Dishes.name, Dishes.description, Dishes.image_url, Dishes.price,
        db.func.count(Order_Items.dish_id).label('order_count'),
        Employees.name.label('chef_name'), Employees.profile_image_url
    ).join(Order_Items, Dishes.dish_id == Order_Items.dish_id)\
     .join(Orders, Order_Items.order_id == Orders.order_id)\
     .join(Employees, Dishes.chef_id == Employees.employee_id)\
     .filter(Orders.customer_id == customer_id)\
     .filter(Orders.status == 'Delivered')\
     .group_by(Dishes.dish_id, Dishes.name, Dishes.description, Dishes.image_url, Dishes.price, Employees.name, Employees.profile_image_url)\
     .order_by(db.func.count(Order_Items.dish_id).desc())\
     .limit(limit)\
     .all()
    
    return format_dish_results(query, include_order_count=True)


def get_customer_highest_rated(customer_id, limit=3):
    """Get highest rated dishes by a specific customer"""
    query = db.session.query(
        Dishes.dish_id, Dishes.name, Dishes.description, Dishes.image_url, Dishes.price,
        db.func.avg(Reviews.dish_rating).label('rating'),
        db.func.count(Reviews.review_id).label('review_count'),
        Employees.name.label('chef_name'), Employees.profile_image_url
    ).join(Order_Items, Dishes.dish_id == Order_Items.dish_id)\
     .join(Orders, Order_Items.order_id == Orders.order_id)\
     .join(Reviews, Orders.order_id == Reviews.order_id)\
     .join(Employees, Dishes.chef_id == Employees.employee_id)\
     .filter(Orders.customer_id == customer_id)\
     .group_by(Dishes.dish_id, Dishes.name, Dishes.description, Dishes.image_url, Dishes.price, Employees.name, Employees.profile_image_url)\
     .order_by(db.func.avg(Reviews.dish_rating).desc())\
     .limit(limit)\
     .all()
    
    return format_dish_results(query, include_rating=True)


def get_most_popular_dishes(limit=3, include_vip=False):
    """Get most popular dishes overall"""
    query = db.session.query(
        Dishes.dish_id, Dishes.name, Dishes.description, Dishes.image_url, Dishes.price,
        db.func.count(Order_Items.dish_id).label('total_orders'),
        db.func.avg(Reviews.dish_rating).label('rating'),
        db.func.count(Reviews.review_id).label('review_count'),
        Employees.name.label('chef_name'), Employees.profile_image_url
    ).join(Order_Items, Dishes.dish_id == Order_Items.dish_id)\
     .join(Orders, Order_Items.order_id == Orders.order_id)\
     .outerjoin(Reviews, Order_Items.order_id == Reviews.order_id)\
     .join(Employees, Dishes.chef_id == Employees.employee_id)\
     .filter(Orders.status == 'Delivered')
    
    if not include_vip:
        query = query.filter(Dishes.is_vip == False)
    
    query = query.group_by(Dishes.dish_id, Dishes.name, Dishes.description, Dishes.image_url, Dishes.price, Employees.name, Employees.profile_image_url)\
     .order_by(db.func.count(Order_Items.dish_id).desc())\
     .limit(limit)\
     .all()
    
    return format_dish_results(query, include_order_count=True, include_rating=True)


def get_top_rated_dishes(limit=3, include_vip=False):
    """Get top rated dishes overall"""
    query = db.session.query(
        Dishes.dish_id, Dishes.name, Dishes.description, Dishes.image_url, Dishes.price,
        db.func.avg(Reviews.dish_rating).label('rating'),
        db.func.count(Reviews.review_id).label('review_count'),
        Employees.name.label('chef_name'), Employees.profile_image_url
    ).join(Order_Items, Dishes.dish_id == Order_Items.dish_id)\
     .join(Reviews, Order_Items.order_id == Reviews.order_id)\
     .join(Employees, Dishes.chef_id == Employees.employee_id)
    
    if not include_vip:
        query = query.filter(Dishes.is_vip == False)
    
    query = query.group_by(Dishes.dish_id, Dishes.name, Dishes.description, Dishes.image_url, Dishes.price, Employees.name, Employees.profile_image_url)\
     .order_by(db.func.avg(Reviews.dish_rating).desc())\
     .limit(limit)\
     .all()
    
    return format_dish_results(query, include_rating=True)


def format_dish_results(query_results, include_order_count=False, include_rating=False):
    """Format dish query results into consistent structure"""
    results = []
    for row in query_results:
        dish_data = {
            'id': row.dish_id,
            'name': row.name,
            'description': row.description,
            'image': row.image_url,
            'price': float(row.price),
            'chef': {
                'name': row.chef_name,
                'profile_image_url': row.profile_image_url
            }
        }
        
        if include_order_count and hasattr(row, 'order_count'):
            dish_data['order_count'] = row.order_count
        elif include_order_count and hasattr(row, 'total_orders'):
            dish_data['total_orders'] = row.total_orders
            
        if include_rating and hasattr(row, 'rating') and row.rating:
            dish_data['rating'] = round(float(row.rating), 1)
            dish_data['review_count'] = getattr(row, 'review_count', 0)
        
        results.append(dish_data)
    return results

# Forum API endpoints

# Report forum content (post or comment)
@app.route('/api/forum/reports', methods=['POST'])
def report_forum_content():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Authentication required"}), 401
    
    try:
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        customer = Customers.query.filter_by(email=payload.get('email')).first()
        
        if not customer:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        data = request.get_json()
        new_report = Forum_Reports(
            reporter_id=customer.customer_id,
            content_type=data['contentType'],
            content_id=int(data['contentId']),
            reason=data['reason']
        )
        db.session.add(new_report)
        db.session.commit()
        
        return jsonify({"success": True, "message": "Report submitted successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to submit report"}), 500

# Get all forum reports (Manager only)
@app.route('/api/manager/forum-reports', methods=['GET'])
@require_role('Manager')
def get_forum_reports():
    try:
        reports = Forum_Reports.query.order_by(Forum_Reports.created_at.desc()).all()
        reports_data = []
        
        for report in reports:
            reporter = Customers.query.get(report.reporter_id)
            reviewer = Employees.query.get(report.reviewed_by) if report.reviewed_by else None
            
            # Get content details
            content_info = {}
            if report.content_type == 'post':
                post = Forum_Posts.query.get(report.content_id)
                if post:
                    content_info = {
                        "title": post.title,
                        "content": post.content[:100] + "..." if len(post.content) > 100 else post.content,
                        "author": Customers.query.get(post.customer_id).username if Customers.query.get(post.customer_id) else "Unknown"
                    }
            elif report.content_type == 'comment':
                comment = Forum_Comments.query.get(report.content_id)
                if comment:
                    content_info = {
                        "content": comment.content,
                        "author": Customers.query.get(comment.customer_id).username if Customers.query.get(comment.customer_id) else "Unknown"
                    }
            
            reports_data.append({
                "report_id": report.report_id,
                "reporter_name": reporter.username if reporter else "Unknown",
                "content_type": report.content_type,
                "content_info": content_info,
                "reason": report.reason,
                "status": report.status,
                "created_at": report.created_at.isoformat() if report.created_at else None,
                "reviewed_at": report.reviewed_at.isoformat() if report.reviewed_at else None,
                "reviewed_by": reviewer.name if reviewer else None,
                "appealed_at": report.appealed_at.isoformat() if report.appealed_at else None,
                "appeal_message": report.appeal_message
            })
        
        return jsonify({"success": True, "reports": reports_data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to fetch reports"}), 500

# Update report status (Manager only)
@app.route('/api/manager/forum-reports/<int:report_id>', methods=['PUT'])
@require_role('Manager')
def update_report_status(report_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Authentication required"}), 401
    
    try:
        # Get manager info
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        manager = Employees.query.filter_by(email=payload.get('email')).first()
        
        if not manager or manager.role != 'Manager':
            return jsonify({"success": False, "message": "Manager access required"}), 403
        
        data = request.get_json()
        report = Forum_Reports.query.get(report_id)
        
        if not report:
            return jsonify({"success": False, "message": "Report not found"}), 404
        
        report.status = data.get('status', report.status)
        if report.status in ['reviewed', 'resolved', 'notified']:
            report.reviewed_at = datetime.now(timezone.utc)
            report.reviewed_by = manager.employee_id
            
            # Check if reporter is VIP (for double weighting)
            reporter_is_vip = False
            reporter_customer = Customers.query.get(report.reporter_id)
            if reporter_customer:
                vip_record = VIP_Customers.query.filter_by(customer_id=reporter_customer.customer_id).first()
                reporter_is_vip = vip_record is not None
            weight = 2 if reporter_is_vip else 1
            
            # If resolving the report (meaning it was valid), warn the accused
            if report.status == 'resolved':
                # Find the accused user
                accused_user_id = None
                if report.content_type == 'post':
                    post = Forum_Posts.query.get(report.content_id)
                    if post:
                        accused_user_id = post.customer_id
                elif report.content_type == 'comment':
                    comment = Forum_Comments.query.get(report.content_id)
                    if comment:
                        accused_user_id = comment.customer_id
                
                if accused_user_id:
                    accused_customer = Customers.query.get(accused_user_id)
                    if accused_customer:
                        # Add warnings based on weight
                        accused_customer.warning_count += weight
                        
                        # Auto-demote VIP customers after 2 warnings
                        if accused_customer.warning_count >= 2:
                            vip_record = VIP_Customers.query.filter_by(customer_id=accused_customer.customer_id).first()
                            if vip_record:
                                db.session.delete(vip_record)
                                accused_customer.warning_count = 0
                        
                        # Auto-blacklist after 3 warnings
                        if accused_customer.warning_count >= 3:
                            accused_customer.is_blacklisted = True
                        
                        # Create warning records
                        for _ in range(weight):
                            warning = Warnings(
                                customer_id=accused_user_id,
                                reason=f"Warning for reported {report.content_type} (report resolved)",
                                created_at=datetime.now(timezone.utc)
                            )
                            db.session.add(warning)
            
            # If notifying accused party, create a notification
            if report.status == 'notified':
                # Find the accused user (author of the reported content)
                accused_user_id = None
                if report.content_type == 'post':
                    post = Forum_Posts.query.get(report.content_id)
                    if post:
                        accused_user_id = post.customer_id
                elif report.content_type == 'comment':
                    comment = Forum_Comments.query.get(report.content_id)
                    if comment:
                        accused_user_id = comment.customer_id
                
                if accused_user_id:
                    # Create notification for accused user
                    print(f"DEBUG: Creating notification for user {accused_user_id} about {report.content_type} report")
                    notification = User_Notifications(
                        user_id=accused_user_id,
                        title="Forum Content Report",
                        message=f"Your {report.content_type} has been reported for: {report.reason}. A manager will review this matter. You may be contacted for more information.",
                        type="forum_report",
                        related_id=report.report_id
                    )
                    db.session.add(notification)
                    print(f"DEBUG: Notification added to session")
        
        db.session.commit()
        
        return jsonify({"success": True, "message": "Report updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to update report"}), 500

# Appeal a forum report (by accused party)
@app.route('/api/forum-reports/<int:report_id>/appeal', methods=['POST'])
def appeal_forum_report(report_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Authentication required"}), 401
    
    try:
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user_email = payload.get('email')
        
        user = Customers.query.filter_by(email=user_email).first()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        report = Forum_Reports.query.get(report_id)
        if not report:
            return jsonify({"success": False, "message": "Report not found"}), 404
        
        # Check if user is the accused (author of the reported content)
        accused_user_id = None
        if report.content_type == 'post':
            post = Forum_Posts.query.get(report.content_id)
            if post:
                accused_user_id = post.customer_id
        elif report.content_type == 'comment':
            comment = Forum_Comments.query.get(report.content_id)
            if comment:
                accused_user_id = comment.customer_id
        
        if accused_user_id != user.customer_id:
            return jsonify({"success": False, "message": "You are not authorized to appeal this report"}), 403
        
        # Check if report status allows appeal (notified)
        if report.status != 'notified':
            return jsonify({"success": False, "message": "Report cannot be appealed at this stage"}), 400
        
        data = request.get_json()
        appeal_message = data.get('appeal_message', '').strip()
        if not appeal_message:
            return jsonify({"success": False, "message": "Appeal message is required"}), 400
        
        report.status = 'appealed'
        report.appeal_message = appeal_message
        report.appealed_at = datetime.now(timezone.utc)
        
        # Mark the related notification as read
        try:
            notification = User_Notifications.query.filter_by(
                related_id=report_id,
                type='forum_report'
            ).first()
            
            if notification:
                notification.is_read = True
        except Exception as e:
            print(f"Error marking notification as read: {e}")
        
        db.session.commit()
        
        return jsonify({"success": True, "message": "Appeal submitted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to submit appeal"}), 500

# Review forum report appeal (Manager only)
@app.route('/api/manager/forum-reports/<int:report_id>/review-appeal', methods=['POST'])
@require_role('Manager')
def review_forum_report_appeal(report_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Authentication required"}), 401
    
    try:
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        manager = Employees.query.filter_by(email=payload.get('email')).first()
        
        if not manager or manager.role != 'Manager':
            return jsonify({"success": False, "message": "Manager access required"}), 403
        
        data = request.get_json()
        decision = data.get('decision')  # 'repeal' or 'uphold'
        if decision not in ['repeal', 'uphold']:
            return jsonify({"success": False, "message": "Invalid decision"}), 400
        
        report = Forum_Reports.query.get(report_id)
        if not report:
            return jsonify({"success": False, "message": "Report not found"}), 404
        
        if report.status != 'appealed':
            return jsonify({"success": False, "message": "Report is not in appealed status"}), 400
        
        if decision == 'repeal':
            report.status = 'repealed'
            # Add 2 warnings to the reporter for abusing the report system
            reporter = Customers.query.get(report.reporter_id)
            if reporter:
                # Increment warning count by 2
                reporter.warning_count += 2
                
                # Auto-demote VIP customers after 2 warnings
                if reporter.warning_count >= 2:
                    vip_record = VIP_Customers.query.filter_by(customer_id=reporter.customer_id).first()
                    if vip_record:
                        db.session.delete(vip_record)
                        reporter.warning_count = 0
                
                # Auto-blacklist after 3 warnings
                if reporter.warning_count >= 3:
                    reporter.is_blacklisted = True
                
                # Create two warning records
                for _ in range(2):
                    warning = Warnings(
                        customer_id=report.reporter_id,
                        reason="Warning for abusing forum report system (appeal repealed)",
                        created_at=datetime.now(timezone.utc)
                    )
                    db.session.add(warning)
        elif decision == 'uphold':
            report.status = 'upheld'
            # Add 1 warning to the accused (author of the reported content)
            try:
                # Get the author based on content_type and content_id
                accused_username = None
                if report.content_type == 'post':
                    post = Forum_Posts.query.get(report.content_id)
                    if post:
                        customer = Customers.query.get(post.customer_id)
                        accused_username = customer.username if customer else None
                elif report.content_type == 'comment':
                    comment = Forum_Comments.query.get(report.content_id)
                    if comment:
                        customer = Customers.query.get(comment.customer_id)
                        accused_username = customer.username if customer else None
                
                if accused_username:
                    accused = Customers.query.filter_by(username=accused_username).first()
                    if accused:
                        accused.warning_count += 1
                        
                        # Auto-demote VIP customers after 2 warnings
                        if accused.warning_count >= 2:
                            vip_record = VIP_Customers.query.filter_by(customer_id=accused.customer_id).first()
                            if vip_record:
                                db.session.delete(vip_record)
                        
                        # Auto-blacklist after 3 warnings
                        if accused.warning_count >= 3:
                            accused.is_blacklisted = True
                        
                        # Create a warning record
                        warning = Warnings(
                            customer_id=accused.customer_id,
                            reason="Warning for upheld forum report appeal",
                            created_at=datetime.now(timezone.utc)
                        )
                        db.session.add(warning)
            except Exception as e:
                print(f"Error processing upheld appeal: {e}")
                return jsonify({"success": False, "message": "Error processing appeal"}), 500
                accused = Customers.query.filter_by(username=accused_username).first()
                if accused:
                    accused.warning_count += 1
                    
                    # Auto-demote VIP customers after 2 warnings
                    if accused.warning_count >= 2:
                        vip_record = VIP_Customers.query.filter_by(customer_id=accused.customer_id).first()
                        if vip_record:
                            db.session.delete(vip_record)
                            accused.warning_count = 0
                    
                    # Auto-blacklist after 3 warnings
                    if accused.warning_count >= 3:
                        accused.is_blacklisted = True
                    
                    # Create a warning record
                    warning = Warnings(
                        customer_id=accused.customer_id,
                        reason="Warning for upheld forum report appeal",
                        created_at=datetime.now(timezone.utc)
                    )
                    db.session.add(warning)
        
        report.reviewed_at = datetime.now(timezone.utc)
        report.reviewed_by = manager.employee_id
        
        db.session.commit()
        
        return jsonify({"success": True, "message": f"Appeal {decision}ed successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to review appeal"}), 500

# Get user notifications
@app.route('/api/user/notifications', methods=['GET'])
def get_user_notifications():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Authentication required"}), 401
    
    try:
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user_email = payload.get('email')
        
        # Try to find user as customer first
        user = Customers.query.filter_by(email=user_email).first()
        user_id = user.customer_id if user else None
        user_type = 'customer' if user else None
        
        # If not found as customer, try as employee
        if not user:
            user = Employees.query.filter_by(email=user_email).first()
            user_id = user.employee_id if user else None
            user_type = 'employee' if user else None
        
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        print(f"DEBUG: User {user_id} ({user_email}) requesting notifications")
        notifications = User_Notifications.query.filter_by(user_id=user_id).order_by(User_Notifications.created_at.desc()).all()
        print(f"DEBUG: Found {len(notifications)} notifications for user {user_id}")
        
        notifications_data = [{
            "notification_id": n.notification_id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "related_id": n.related_id,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None
        } for n in notifications]
        
        return jsonify({"success": True, "notifications": notifications_data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to get notifications"}), 500

# Mark notification as read
@app.route('/api/user/notifications/<int:notification_id>/read', methods=['PUT'])
def mark_notification_read(notification_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Authentication required"}), 401
    
    try:
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user_email = payload.get('email')
        
        # Try to find user as customer first
        user = Customers.query.filter_by(email=user_email).first()
        user_id = user.customer_id if user else None
        
        # If not found as customer, try as employee
        if not user:
            user = Employees.query.filter_by(email=user_email).first()
            user_id = user.employee_id if user else None
        
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        
        notification = User_Notifications.query.filter_by(
            notification_id=notification_id, 
            user_id=user_id
        ).first()
        
        if not notification:
            return jsonify({"success": False, "message": "Notification not found"}), 404
        
        notification.is_read = True
        db.session.commit()
        
        return jsonify({"success": True, "message": "Notification marked as read"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to mark notification as read"}), 500

>>>>>>> Stashed changes

# Get all forum posts
@app.route('/api/forum/posts', methods=['GET'])
def get_forum_posts():
    current_user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
            user = Customers.query.filter_by(email=payload.get('email')).first()
            if user: current_user_id = user.customer_id
        except: pass

    posts = db.session.query(Forum_Posts, Customers.username).join(Customers).order_by(Forum_Posts.created_at.desc()).all()
    
    result = []
    for post, author in posts:
        # Count likes
        likes_count = Forum_Likes.query.filter_by(post_id=post.post_id).count()
        # Count comments
        comments_count = Forum_Comments.query.filter_by(post_id=post.post_id).count()
        # Count compliments
        compliments_count = Forum_Post_Compliments.query.filter_by(post_id=post.post_id).count()
        # Check if current user liked this post
        is_liked = False
        if current_user_id:
            if Forum_Likes.query.filter_by(post_id=post.post_id, customer_id=current_user_id).first():
                is_liked = True
        # Check if current user complimented this post
        is_complimented = False
        if current_user_id:
            if Forum_Post_Compliments.query.filter_by(post_id=post.post_id, customer_id=current_user_id).first():
                is_complimented = True

        result.append({
            "id": str(post.post_id),
            "authorName": author,
            "title": post.title,
            "content": post.content,
            "category": post.category,
            "likes": likes_count,
            "compliments": compliments_count,
            "commentCount": comments_count,
            "createdAt": post.created_at.isoformat(),
            "isLiked": is_liked,
            "isComplimented": is_complimented
        })
    
    return jsonify({"success": True, "posts": result}), 200

# Create a new post
@app.route('/api/forum/posts', methods=['POST'])
def create_forum_post():
    auth_header = request.headers.get('Authorization')
    if not auth_header: return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = Customers.query.filter_by(email=payload.get('email')).first()
    except: return jsonify({"success": False, "message": "Invalid token"}), 401

    data = request.get_json()
    new_post = Forum_Posts(
        customer_id=user.customer_id,
        title=data.get('title'),
        content=data.get('content'),
        category=data.get('category', 'general'),
        created_at=datetime.now(timezone.utc)
    )
    db.session.add(new_post)
    db.session.commit()
    return jsonify({"success": True, "message": "Post created"}), 201

# Toggle Like on a post
@app.route('/api/forum/posts/<int:post_id>/like', methods=['POST'])
def like_forum_post(post_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header: return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = Customers.query.filter_by(email=payload.get('email')).first()
    except: return jsonify({"success": False, "message": "Invalid token"}), 401

    existing_like = Forum_Likes.query.filter_by(post_id=post_id, customer_id=user.customer_id).first()
    
    if existing_like:
        db.session.delete(existing_like) # Unlike
        action = "unliked"
    else:
        new_like = Forum_Likes(post_id=post_id, customer_id=user.customer_id)
        db.session.add(new_like) # Like
        action = "liked"
    
    db.session.commit()
    return jsonify({"success": True, "action": action}), 200

# Toggle Like on a comment
@app.route('/api/forum/comments/<int:comment_id>/like', methods=['POST'])
def like_forum_comment(comment_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header: return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = Customers.query.filter_by(email=payload.get('email')).first()
    except: return jsonify({"success": False, "message": "Invalid token"}), 401

    existing_like = Forum_Comment_Likes.query.filter_by(comment_id=comment_id, customer_id=user.customer_id).first()
    
    if existing_like:
        db.session.delete(existing_like) # Unlike
        action = "unliked"
    else:
        new_like = Forum_Comment_Likes(comment_id=comment_id, customer_id=user.customer_id)
        db.session.add(new_like) # Like
        action = "liked"
    
    db.session.commit()
    return jsonify({"success": True, "action": action}), 200

# Give compliment to a post (one-time, decreases warnings by 1 if > 0)
@app.route('/api/forum/posts/<int:post_id>/compliment', methods=['POST'])
def compliment_forum_post(post_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header: return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = Customers.query.filter_by(email=payload.get('email')).first()
    except: return jsonify({"success": False, "message": "Invalid token"}), 401

    # Check if already complimented
    existing = Forum_Post_Compliments.query.filter_by(post_id=post_id, customer_id=user.customer_id).first()
    if existing:
        return jsonify({"success": False, "message": "Already complimented"}), 400

    # Decrease warnings of poster
    post = Forum_Posts.query.get(post_id)
    if post:
        poster = Customers.query.get(post.customer_id)
        if poster and poster.warning_count > 0:
            poster.warning_count -= 1
            db.session.add(poster)
    
    # Save compliment
    new_compliment = Forum_Post_Compliments(post_id=post_id, customer_id=user.customer_id)
    db.session.add(new_compliment)
    
    db.session.commit()
    return jsonify({"success": True, "message": "Compliment given"}), 200

# Give compliment to a comment (one-time, decreases warnings by 1 if > 0)
@app.route('/api/forum/comments/<int:comment_id>/compliment', methods=['POST'])
def compliment_forum_comment(comment_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header: return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = Customers.query.filter_by(email=payload.get('email')).first()
    except: return jsonify({"success": False, "message": "Invalid token"}), 401

    # Check if already complimented
    existing = Forum_Comment_Compliments.query.filter_by(comment_id=comment_id, customer_id=user.customer_id).first()
    if existing:
        return jsonify({"success": False, "message": "Already complimented"}), 400

    # Decrease warnings of commenter
    comment = Forum_Comments.query.get(comment_id)
    if comment:
        commenter = Customers.query.get(comment.customer_id)
        if commenter and commenter.warning_count > 0:
            commenter.warning_count -= 1
            db.session.add(commenter)
    
    # Save compliment
    new_compliment = Forum_Comment_Compliments(comment_id=comment_id, customer_id=user.customer_id)
    db.session.add(new_compliment)
    
    db.session.commit()
    return jsonify({"success": True, "message": "Compliment given"}), 200

# Get comments for a post
@app.route('/api/forum/posts/<int:post_id>/comments', methods=['GET'])
def get_post_comments(post_id):
    # Get current user if authenticated
    current_user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
            user = Customers.query.filter_by(email=payload.get('email')).first()
            if user:
                current_user_id = user.customer_id
        except:
            pass
    
    comments = db.session.query(Forum_Comments, Customers.username)\
        .join(Customers)\
        .filter(Forum_Comments.post_id == post_id)\
        .order_by(Forum_Comments.created_at.asc())\
        .all()
        
    result = []
    for comment, author in comments:
        # Count likes
        likes_count = Forum_Comment_Likes.query.filter_by(comment_id=comment.comment_id).count()
        # Count compliments
        compliments_count = Forum_Comment_Compliments.query.filter_by(comment_id=comment.comment_id).count()
        
        # Check if current user liked this comment
        is_liked = False
        if current_user_id:
            if Forum_Comment_Likes.query.filter_by(comment_id=comment.comment_id, customer_id=current_user_id).first():
                is_liked = True
        
        # Check if current user complimented this comment
        is_complimented = False
        if current_user_id:
            if Forum_Comment_Compliments.query.filter_by(comment_id=comment.comment_id, customer_id=current_user_id).first():
                is_complimented = True
        
        result.append({
            "id": str(comment.comment_id),
            "postId": str(comment.post_id),
            "authorName": author,
            "content": comment.content,
            "createdAt": comment.created_at.isoformat(),
            "likes": likes_count,
            "compliments": compliments_count,
            "isLiked": is_liked,
            "isComplimented": is_complimented
        })
    return jsonify({"success": True, "comments": result}), 200

# Add a comment
@app.route('/api/forum/posts/<int:post_id>/comments', methods=['POST'])
def create_comment(post_id):
    auth_header = request.headers.get('Authorization')
    if not auth_header: return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = Customers.query.filter_by(email=payload.get('email')).first()
    except: return jsonify({"success": False, "message": "Invalid token"}), 401

    data = request.get_json()
    new_comment = Forum_Comments(
        post_id=post_id,
        customer_id=user.customer_id,
        content=data.get('content'),
        created_at=datetime.now(timezone.utc)
    )
    db.session.add(new_comment)
    db.session.commit()
    return jsonify({"success": True, "message": "Comment added"}), 201


@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    """
    Handle chat messages using Google Gemini with Database Context (Menu + Knowledge Base).
    Includes robust retry logic for rate limits.
    """
    GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
    if not GOOGLE_API_KEY:
        return jsonify({"success": False, "message": "Server API Key missing"}), 500

    data = request.get_json()
    user_message = data.get('message', '')

    if not user_message:
        return jsonify({"success": False, "message": "Message is empty"}), 400

    try:
        # 1. Fetch Context
        dishes = Dishes.query.all()
        menu_context = "\n".join([f"- {d.name}: ${d.price} ({d.description})" for d in dishes])

        kb_entries = AI_Knowledge_Base.query.filter_by(is_deleted=False).all()
        kb_context_list = [f"Q: {entry.question}\nA: {entry.answer}" for entry in kb_entries]
        kb_context_str = "\n---\n".join(kb_context_list)

        # 2. Construct System Prompt
        system_instruction = f"""
        You are the helpful AI assistant for 'Byte & Bite', a tech-themed street food restaurant.
        
        Your Goal:
        Answer user questions accurately based ONLY on the provided "Official Knowledge Base" and "Current Menu".
        
        Instructions:
        1. Check the Knowledge Base for VIP, delivery, or policy questions.
        2. Check the Menu for food questions.
        3. If the answer is not found, ask them to contact the manager.
        4. Keep answers concise.
        
        === Official Knowledge Base ===
        {kb_context_str}
        
        === Current Menu ===
        {menu_context}
        
        === User Query ===
        {user_message}
        """

        # 3. Configure Gemini
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash') 

        # 4. Call API with Retry Logic (Exponential Backoff)
        max_retries = 3
        response_text = "I'm having trouble connecting. Please try again."

        for attempt in range(max_retries):
            try:
                # Attempt to generate content
                response = model.generate_content(system_instruction)
                response_text = response.text
                break # Success! Exit the loop
            
            except google_exceptions.ResourceExhausted:
                # If quota exceeded (429 error)
                if attempt < max_retries - 1:
                    wait_time = 20 + (attempt * 10) # Attempt 0: 20s, Attempt 1: 30s
                    print(f"[Gemini] Quota exceeded. Retrying in {wait_time} seconds (Attempt {attempt + 1}/{max_retries})...")
                    time.sleep(wait_time)
                else:
                    print("[Gemini] Quota exceeded. Max retries reached.")
                    return jsonify({
                        "success": False, 
                        "message": "System is busy (High Traffic).",
                        "reply": "Our AI servers are currently overloaded with requests. Please wait a minute and try asking again!"
                    }), 429
            except Exception as e:
                raise e # Throw other errors immediately

        return jsonify({
            "success": True, 
            "reply": response_text
        }), 200

    except Exception as e:
        print(f"Gemini Error: {e}")
        return jsonify({
            "success": False, 
            "message": "AI is currently offline.",
            "reply": "I'm encountering a system error. Please try again later."
        }), 500
@app.route('/api/menu/search-by-image', methods=['POST'])
def search_food_by_image():
    # 1. Validate File
    if 'image' not in request.files:
        return jsonify({"success": False, "message": "No image uploaded"}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({"success": False, "message": "No selected file"}), 400

    # Validate file type
    allowed_extensions = {'png', 'jpg', 'jpeg', 'webp'}
    if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
        return jsonify({"success": False, "message": "Invalid file type. Allowed: png, jpg, jpeg, webp"}), 400

    # 2. Call Gemini Vision API
    try:
        if not GOOGLE_AVAILABLE:
            return jsonify({"success": False, "message": "AI features are not available"}), 503
            
        GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY')
        if not GOOGLE_API_KEY:
            return jsonify({"success": False, "message": "Server API Key missing"}), 500

        img = PIL.Image.open(file)
        
        # Configure Gemini
        genai.configure(api_key=GOOGLE_API_KEY)
        model = genai.GenerativeModel('gemini-2.0-flash') # Use Flash for speed

        prompt = """
        Analyze this image. 
        1. Is it a picture of food? If not, respond EXACTLY: "ERROR: NOT_FOOD".
        2. Are there multiple distinct dishes that are too confusing? If yes, respond EXACTLY: "ERROR: MULTIPLE".
        3. If it is a single food item, return ONLY the generic name of the dish (e.g., "Burger", "Ramen", "Tacos"). 
           Do not add punctuation or extra words.
        """

        response = model.generate_content([prompt, img])
        result_text = response.text.strip()

        # 3. Handle Exceptions from AI
        if "ERROR: NOT_FOOD" in result_text:
            return jsonify({"success": False, "message": "Food not recognized in the image."}), 404
        
        if "ERROR: MULTIPLE" in result_text:
            return jsonify({"success": False, "message": "Multiple foods detected. Please upload a photo of a single dish."}), 400

        # 4. Search Database for matches
        print(f"[Image Search] AI identified: '{result_text}'")
        
        # Get all dishes for reference
        all_dishes = Dishes.query.all()
        print(f"[Image Search] Total dishes in DB: {len(all_dishes)}")
        
        # Simple but effective search: try multiple variations
        search_terms = [
            result_text.lower(),
            result_text.lower().replace(' ', ''),  # Remove spaces
            result_text.lower().split()[0] if ' ' in result_text else result_text.lower()  # First word only
        ]
        
        matched_dishes = set()
        
        for term in search_terms:
            search_pattern = f"%{term}%"
            
            # Search in names
            name_matches = Dishes.query.filter(Dishes.name.ilike(search_pattern)).all()
            for dish in name_matches:
                matched_dishes.add(dish)
            
            # Search in descriptions
            desc_matches = Dishes.query.filter(Dishes.description.ilike(search_pattern)).all()
            for dish in desc_matches:
                matched_dishes.add(dish)
        
        matched_dishes = list(matched_dishes)
        print(f"[Image Search] Found {len(matched_dishes)} matches")

        if not matched_dishes:
            # Get some sample dishes to suggest alternatives
            sample_dishes = Dishes.query.limit(3).all()
            suggestions = [dish.name for dish in sample_dishes]
            
            return jsonify({
                "success": False, 
                "message": f"I identified '{result_text}' in your image, but we don't have that exact dish. Try searching our menu for similar items!",
                "identified_name": result_text,
                "suggestions": suggestions
            }), 404

        # 5. Return Results
        results = []
        for dish in matched_dishes:
            # Get Chef Name
            chef_name = "Unknown"
            if dish.chef_id:
                chef = Employees.query.get(dish.chef_id)
                if chef: chef_name = chef.name

            results.append({
                'id': str(dish.dish_id),
                'name': dish.name,
                'price': float(dish.price),
                'description': dish.description,
                'image': dish.image_url,
                'is_vip': dish.is_vip,
                'chef_name': chef_name
            })

        return jsonify({
            "success": True, 
            "identified_as": result_text,
            "dishes": results
        }), 200

    except Exception as e:
        print(f"Image Search Error: {e}")
        return jsonify({"success": False, "message": "Failed to process image", "error": str(e)}), 500   
@app.route('/api/chat/rate', methods=['POST'])
def rate_ai_answer():
    auth_header = request.headers.get('Authorization')
    customer_id = None
    
    # 1. Get Customer ID (if logged in)
    if auth_header:
        try:
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
            user = Customers.query.filter_by(email=payload.get('email')).first()
            if user: customer_id = user.customer_id
        except: pass

    data = request.get_json()
    question = data.get('question')
    answer = data.get('answer')
    rating = data.get('rating') # 0-5

    if rating is None or not question or not answer:
        return jsonify({"success": False, "message": "Missing fields"}), 400

    try:
        # 2. Check if this Q&A pair already exists in KB
        # We search by question content (exact or similar)
        kb_entry = AI_Knowledge_Base.query.filter(AI_Knowledge_Base.question.like(f"%{question}%")).first()

        # 3. Handle Logic based on Rating
        
        # Scenario: Rating 5 (Add to KB if new)
        if rating == 5:
            if not kb_entry:
                # Add to local KB
                print("[AI Rating] High rating! Adding to Knowledge Base.")
                kb_entry = AI_Knowledge_Base(
                    question=question,
                    answer=answer,
                    created_at=datetime.now(timezone.utc),
                    is_deleted=False
                )
                db.session.add(kb_entry)
                db.session.flush() # Generate ID
            else:
                # If verified, ensure it's not deleted
                kb_entry.is_deleted = False

        # Scenario: Rating 0 (Flag/Remove from KB)
        elif rating == 0:
            print("[AI Rating] Zero rating. Flagging content.")
            if kb_entry:
                # Soft delete from KB
                kb_entry.is_deleted = True
            else:
                # If it's not in KB, we don't need to delete anything.
                # But we can't save the rating to DB because kb_id is required.
                return jsonify({"success": True, "message": "Feedback received (Low rating logged)."}), 200

        # 4. Save Rating Record
        # We can only save to AI_Ratings if we have a valid kb_id and a logged-in user
        if kb_entry and customer_id:
            new_rating = AI_Ratings(
                kb_id=kb_entry.kb_id,
                customer_id=customer_id,
                rating=rating,
                helpful_score=rating, # Using rating as helpful score for now
                created_at=datetime.now(timezone.utc)
            )
            db.session.add(new_rating)
            db.session.commit()
            return jsonify({"success": True, "message": "Rating saved and KB updated."}), 200
        elif kb_entry:
            # Guest user: KB updated but rating not saved
            db.session.commit()
            return jsonify({"success": True, "message": "Feedback received and KB updated."}), 200
        else:
            # If we are here, it means Rating is 1-4 AND it wasn't in KB.
            # We cannot save to DB due to constraints, but we acknowledge the user.
            return jsonify({"success": True, "message": "Rating received."}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Rating Error: {e}")
        return jsonify({"success": False, "message": "Failed to save rating"}), 500
@app.route('/api/manager/kb', methods=['GET'])
def get_kb_entries():
    # Verify Manager Role
    auth_header = request.headers.get('Authorization')
    if not auth_header: return jsonify({"success": False}), 401
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        if payload.get('role') != 'Manager': return jsonify({"success": False}), 403
    except: return jsonify({"success": False}), 401

    # Query: Join KB with Ratings to calculate average
    # We use outerjoin because some entries might not have ratings yet
    results = db.session.query(
        AI_Knowledge_Base,
        db.func.avg(AI_Ratings.rating).label('avg_rating'),
        db.func.count(AI_Ratings.rating_id).label('rating_count')
    ).outerjoin(AI_Ratings, AI_Knowledge_Base.kb_id == AI_Ratings.kb_id)\
     .filter(AI_Knowledge_Base.is_deleted == False)\
     .group_by(AI_Knowledge_Base.kb_id)\
     .order_by(AI_Knowledge_Base.created_at.desc())\
     .all()

    kb_list = []
    for kb, avg, count in results:
        # Get Author Name (Employee) if exists
        author_name = "System"
        if kb.employee_id:
            emp = Employees.query.get(kb.employee_id)
            if emp: author_name = emp.name

        kb_list.append({
            "id": kb.kb_id,
            "question": kb.question,
            "answer": kb.answer,
            "author": author_name,
            "avg_rating": round(float(avg), 1) if avg else 0,
            "rating_count": count,
            "created_at": kb.created_at.strftime('%Y-%m-%d')
        })

    return jsonify({"success": True, "entries": kb_list}), 200

@app.route('/api/manager/kb', methods=['POST'])
def add_kb_entry():
    # Verify Manager
    auth_header = request.headers.get('Authorization')
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        if payload.get('role') != 'Manager': return jsonify({"success": False}), 403
        manager_email = payload.get('email')
    except: return jsonify({"success": False}), 401

    data = request.get_json()
    question = data.get('question')
    answer = data.get('answer')

    if not question or not answer:
        return jsonify({"success": False, "message": "Question and Answer required"}), 400

    try:
        manager = Employees.query.filter_by(email=manager_email).first()
        
        new_kb = AI_Knowledge_Base(
            employee_id=manager.employee_id,
            question=question,
            answer=answer,
            created_at=datetime.now(timezone.utc),
            is_deleted=False
        )
        db.session.add(new_kb)
        db.session.commit()
        return jsonify({"success": True, "message": "Knowledge added"}), 201
    except Exception as e:
        print(e)
        return jsonify({"success": False, "message": "Database error"}), 500

@app.route('/api/manager/kb/<int:kb_id>', methods=['DELETE'])
def delete_kb_entry(kb_id):
    # Verify Manager Role
    auth_header = request.headers.get('Authorization')
    if not auth_header: return jsonify({"success": False}), 401
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        if payload.get('role') != 'Manager': return jsonify({"success": False}), 403
    except: return jsonify({"success": False}), 401

    # Find and soft delete the KB entry
    kb_entry = AI_Knowledge_Base.query.get(kb_id)
    if not kb_entry:
        return jsonify({"success": False, "message": "Knowledge entry not found"}), 404

    try:
        kb_entry.is_deleted = True
        db.session.commit()
        return jsonify({"success": True, "message": "Knowledge entry deleted"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Delete KB Error: {e}")
        return jsonify({"success": False, "message": "Database error"}), 500

# Complaint/Compliment System Endpoints

@app.route('/api/complaints', methods=['POST'])
def file_complaint():
    """File a complaint or compliment against a customer, chef, or delivery person"""
    try:
        token = request.headers.get('Authorization').split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        complainant_email = payload.get('email')
        complainant_role = payload.get('role')
    except: return jsonify({"success": False}), 401

    data = request.get_json()
    accused_id = data.get('accused_id')
    accused_type = data.get('accused_type')  # 'customer', 'chef', 'delivery'
    complaint_type = data.get('complaint_type')  # 'complaint' or 'compliment'
    category = data.get('category')
    description = data.get('description')
    related_order_id = data.get('related_order_id')

    if not all([accused_id, accused_type, complaint_type, category, description]):
        return jsonify({"success": False, "message": "All fields required"}), 400

    if complaint_type not in ['complaint', 'compliment']:
        return jsonify({"success": False, "message": "Invalid complaint type"}), 400

    if accused_type not in ['customer', 'chef', 'delivery']:
        return jsonify({"success": False, "message": "Invalid accused type"}), 400

    try:
        # Get complainant ID based on role
        if complainant_role == 'Customer':
            complainant = Customers.query.filter_by(email=complainant_email).first()
            complainant_id = complainant.customer_id
            complainant_type = 'customer'
        elif complainant_role == 'Delivery':
            complainant = Employees.query.filter_by(email=complainant_email).first()
            complainant_id = complainant.employee_id
            complainant_type = 'delivery'
        else:
            return jsonify({"success": False, "message": "Unauthorized"}), 403

        # Validate accused exists
        if accused_type == 'customer':
            accused = Customers.query.get(accused_id)
        elif accused_type in ['chef', 'delivery']:
            accused = Employees.query.get(accused_id)
        else:
            return jsonify({"success": False, "message": "Invalid accused type"}), 400

        if not accused:
            return jsonify({"success": False, "message": "Accused not found"}), 404

        # Create complaint
        new_complaint = Complaints(
            complainant_id=complainant_id,
            complainant_type=complainant_type,
            accused_id=accused_id,
            accused_type=accused_type,
            complaint_type=complaint_type,
            category=category,
            description=description,
            related_order_id=related_order_id
        )

        # Handle compliments automatically
        if complaint_type == 'compliment':
            new_complaint.status = 'resolved'
            new_complaint.reviewed_at = datetime.now(timezone.utc)
            
            # Decrement warning count for the accused party
            if accused_type == 'customer' and accused.warning_count > 0:
                accused.warning_count -= 1
        else:
            # Complaints need manager review
            new_complaint.status = 'pending'

        db.session.add(new_complaint)
        db.session.commit()

        return jsonify({"success": True, "message": "Complaint filed successfully", "complaint_id": new_complaint.complaint_id}), 201

    except Exception as e:
        print(e)
        return jsonify({"success": False, "message": "Database error"}), 500

@app.route('/api/complaints', methods=['GET'])
def get_complaints():
    """Get complaints based on user role"""
    try:
        token = request.headers.get('Authorization').split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user_role = payload.get('role')
        user_email = payload.get('email')
        
        # If role is not set in token, infer it from user existence
        if not user_role:
            user = Customers.query.filter_by(email=user_email).first()
            if user:
                user_role = 'Customer'
            else:
                user = Employees.query.filter_by(email=user_email).first()
                if user:
                    user_role = user.role
                else:
                    return jsonify({"success": False, "message": "User not found"}), 404
    except:
        return jsonify({"success": False, "message": "Invalid token"}), 401

    try:
        # Get user info
        if user_role == 'Customer':
            user = Customers.query.filter_by(email=user_email).first()
            user_id = user.customer_id if user else None
        elif user_role in ['Delivery', 'Chef', 'Manager']:
            user = Employees.query.filter_by(email=user_email).first()
            user_id = user.employee_id if user else None
        else:
            return jsonify({"success": False, "message": "Invalid user role"}), 403

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Filter complaints based on user role
        if user_role == 'Manager':
            # Managers see all complaints
            complaints = Complaints.query.order_by(Complaints.created_at.desc()).all()
        elif user_role == 'Customer':
            # Customers see complaints they filed or complaints against them
            complaints = Complaints.query.filter(
                ((Complaints.complainant_type == 'customer') & (Complaints.complainant_id == user_id)) |
                ((Complaints.accused_type == 'customer') & (Complaints.accused_id == user_id))
            ).order_by(Complaints.created_at.desc()).all()
        elif user_role in ['Delivery', 'Chef']:
            # Delivery drivers and chefs see complaints they filed or complaints against them
            employee_type = 'delivery' if user_role == 'Delivery' else 'chef'
            complaints = Complaints.query.filter(
                ((Complaints.complainant_type == employee_type) & (Complaints.complainant_id == user_id)) |
                ((Complaints.accused_type == employee_type) & (Complaints.accused_id == user_id))
            ).order_by(Complaints.created_at.desc()).all()
        else:
            return jsonify({"success": False, "message": "Unauthorized"}), 403

        complaints_list = []

        for c in complaints:
            # Get complainant info
            if c.complainant_type == 'customer':
                complainant = Customers.query.get(c.complainant_id)
                complainant_name = complainant.username if complainant else 'Unknown'
            else:  # delivery
                complainant = Employees.query.get(c.complainant_id)
                complainant_name = complainant.name if complainant else 'Unknown'

            # Get accused info
            if c.accused_type == 'customer':
                accused = Customers.query.get(c.accused_id)
                accused_name = accused.username if accused else 'Unknown'
            else:  # chef or delivery
                accused = Employees.query.get(c.accused_id)
                accused_name = accused.name if accused else 'Unknown'

            complaints_list.append({
                'complaint_id': c.complaint_id,
                'complainant_name': complainant_name,
                'complainant_type': c.complainant_type,
                'accused_name': accused_name,
                'accused_type': c.accused_type,
                'complaint_type': c.complaint_type,
                'category': c.category,
                'description': c.description,
                'related_order_id': c.related_order_id,
                'status': c.status,
                'created_at': c.created_at.isoformat() if c.created_at else None,
                'reviewed_at': c.reviewed_at.isoformat() if c.reviewed_at else None,
                'disputed_at': c.disputed_at.isoformat() if c.disputed_at else None,
                'dispute_reason': c.dispute_reason,
                'appeal_submitted_at': c.appealed_at.isoformat() if c.appealed_at else None,
                'appeal_message': c.appeal_message
            })

        return jsonify({"success": True, "complaints": complaints_list}), 200

    except Exception as e:
        print(e)
        return jsonify({"success": False, "message": "Database error"}), 500

# Evaluate employee performance and apply demotions/promotions
def evaluate_employee_performance(employee):
    """Evaluate employee performance based on complaints, compliments, and ratings"""
    
    # Check for demotion conditions
    should_demote = False
    
    # Condition 1: 3 or more complaints
    if employee.complaint_count >= 3:
        should_demote = True
    
    # Condition 2: For chefs - consistently low ratings (<2 average)
    if employee.role == 'Chef':
        # Calculate average rating for chef's dishes
        avg_rating = db.session.query(db.func.avg(Reviews.dish_rating)).\
            join(Order_Items, Reviews.order_id == Order_Items.order_id).\
            join(Dishes, Order_Items.dish_id == Dishes.dish_id).\
            filter(Dishes.chef_id == employee.employee_id).\
            scalar()
        
        if avg_rating and avg_rating < 2.0:
            should_demote = True
    
    # Condition 3: For delivery people - could add similar rating checks if needed
    # (Currently only complaint-based for delivery people)
    
    if should_demote:
        employee.demotion_count += 1
        employee.complaint_count %= 3  # Reset complaint count after demotion
        
        # Check if employee should be fired (2 demotions)
        if employee.demotion_count >= 2:
            employee.status = 'Fired'
    
    # Check for bonus conditions (3 compliments)
    if employee.compliment_count >= 3:
        # Reset complaint count or give bonus (not tracking salary)
        employee.complaint_count = 0
        # Decrement demotion count as promotion reward
        employee.demotion_count = max(0, employee.demotion_count - 1)
    
    # Condition 2: For chefs - high ratings (>4 average)
    if employee.role == 'Chef':
        # Calculate average rating for chef's dishes
        avg_rating = db.session.query(db.func.avg(Reviews.dish_rating)).\
            join(Order_Items, Reviews.order_id == Order_Items.order_id).\
            join(Dishes, Order_Items.dish_id == Dishes.dish_id).\
            filter(Dishes.chef_id == employee.employee_id).\
            scalar()
        
        if avg_rating and avg_rating > 4.0:
            # Give bonus (not tracking salary, could reset complaint count or other benefits)
            employee.complaint_count = max(0, employee.complaint_count - 1)  # Reduce complaints as bonus
            # Decrement demotion count as promotion reward
            employee.demotion_count = max(0, employee.demotion_count - 1)

@app.route('/api/complaints/<int:complaint_id>/review', methods=['PUT'])
def review_complaint(complaint_id):
    """Manager reviews and decides on a complaint"""
    try:
        token = request.headers.get('Authorization').split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        if payload.get('role') != 'Manager': return jsonify({"success": False}), 403
        manager_email = payload.get('email')
    except: return jsonify({"success": False}), 401

    data = request.get_json()
    decision = data.get('decision')  # 'upheld' or 'dismissed'
    manager_decision = data.get('manager_decision')

    if decision not in ['upheld', 'dismissed']:
        return jsonify({"success": False, "message": "Invalid decision"}), 400

    if not manager_decision:
        return jsonify({"success": False, "message": "Decision explanation required"}), 400

    try:
        manager = Employees.query.filter_by(email=manager_email).first()
        complaint = Complaints.query.get(complaint_id)

        if not complaint:
            return jsonify({"success": False, "message": "Complaint not found"}), 404

        if complaint.status != 'pending':
            return jsonify({"success": False, "message": "Complaint already reviewed"}), 400

        # Update complaint
        complaint.status = decision
        complaint.manager_reviewed_by = manager.employee_id
        complaint.manager_decision = manager_decision
        complaint.reviewed_at = datetime.now(timezone.utc)

        # Check if complainant is VIP (for double weighting)
        complainant_is_vip = False
        if complaint.complainant_type == 'customer':
            complainant_customer = Customers.query.get(complaint.complainant_id)
            if complainant_customer:
                vip_record = VIP_Customers.query.filter_by(customer_id=complainant_customer.customer_id).first()
                complainant_is_vip = vip_record is not None
        weight = 2 if complainant_is_vip else 1

        # Handle complaints and compliments based on type and accused type
        if decision == 'upheld':
            if complaint.complaint_type == 'complaint':
                if complaint.accused_type == 'customer':
                    # Handle customer complaints (existing logic)
                    accused_customer = Customers.query.get(complaint.accused_id)
                    if accused_customer:
                        accused_customer.warning_count += 1
                        
                        # Auto-demote VIP customers after 2 warnings
                        if accused_customer.warning_count >= 2:
                            vip_record = VIP_Customers.query.filter_by(customer_id=accused_customer.customer_id).first()
                            if vip_record:
                                db.session.delete(vip_record)
                                accused_customer.warning_count = 0
                        
                        # Auto-blacklist after 3 warnings
                        if accused_customer.warning_count >= 3:
                            accused_customer.is_blacklisted = True
                            
                elif complaint.accused_type in ['chef', 'delivery']:
                    # Handle employee complaints
                    accused_employee = Employees.query.get(complaint.accused_id)
                    if accused_employee:
                        accused_employee.complaint_count += weight
                        # Evaluate performance after complaint
                        evaluate_employee_performance(accused_employee)
                        
            elif complaint.complaint_type == 'compliment':
                if complaint.accused_type in ['chef', 'delivery']:
                    # Handle employee compliments
                    accused_employee = Employees.query.get(complaint.accused_id)
                    if accused_employee:
                        accused_employee.complaint_count = max(0, accused_employee.complaint_count - weight)
                        # Evaluate performance after compliment
                        evaluate_employee_performance(accused_employee)

        db.session.commit()

        return jsonify({"success": True, "message": "Complaint reviewed successfully"}), 200

    except Exception as e:
        print(e)
        return jsonify({"success": False, "message": "Database error"}), 500

@app.route('/api/complaints/<int:complaint_id>/dispute', methods=['PUT'])
def dispute_complaint(complaint_id):
    """Allow complainant to dispute a manager's decision"""
    try:
        token = request.headers.get('Authorization').split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        complainant_email = payload.get('email')
        complainant_role = payload.get('role')
    except: return jsonify({"success": False}), 401

    data = request.get_json()
    dispute_reason = data.get('dispute_reason')

    if not dispute_reason:
        return jsonify({"success": False, "message": "Dispute reason required"}), 400

    try:
        # Get complainant ID
        if complainant_role == 'Customer':
            complainant = Customers.query.filter_by(email=complainant_email).first()
            complainant_id = complainant.customer_id
        elif complainant_role == 'Delivery':
            complainant = Employees.query.filter_by(email=complainant_email).first()
            complainant_id = complainant.employee_id
        else:
            return jsonify({"success": False, "message": "Unauthorized"}), 403

        complaint = Complaints.query.get(complaint_id)

        if not complaint:
            return jsonify({"success": False, "message": "Complaint not found"}), 404

        # Verify complainant owns this complaint
        if complaint.complainant_id != complainant_id:
            return jsonify({"success": False, "message": "Unauthorized"}), 403

        if complaint.status not in ['upheld', 'dismissed']:
            return jsonify({"success": False, "message": "Can only dispute reviewed complaints"}), 400

        if complaint.disputed_at:
            return jsonify({"success": False, "message": "Already disputed"}), 400

        # Update complaint with dispute
        complaint.status = 'disputed'
        complaint.disputed_at = datetime.now(timezone.utc)
        complaint.dispute_reason = dispute_reason

        db.session.commit()

        return jsonify({"success": True, "message": "Dispute filed successfully"}), 200

    except Exception as e:
        print(e)
        return jsonify({"success": False, "message": "Database error"}), 500

@app.route('/api/complaints/<int:complaint_id>/appeal', methods=['POST'])
def appeal_complaint(complaint_id):
    """Allow accused party to appeal a complaint with a message to the manager"""
    try:
        token = request.headers.get('Authorization').split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        accused_email = payload.get('email')
        accused_role = payload.get('role')
    except Exception as e:
        print(f"JWT decode error: {e}")
        return jsonify({"success": False}), 401

    data = request.get_json()
    appeal_message = data.get('appeal_message')

    if not appeal_message:
        return jsonify({"success": False, "message": "Appeal message required"}), 400

    try:
        # Get accused ID
        accused = None
        accused_id = None
        
        # First try to find as customer
        accused = Customers.query.filter_by(email=accused_email).first()
        if accused:
            accused_id = accused.customer_id
            accused_role = 'Customer'  # Override role if not set
        else:
            # Try to find as employee
            accused = Employees.query.filter_by(email=accused_email).first()
            if accused:
                accused_id = accused.employee_id
                accused_role = accused.role  # Use the role from employee record
            else:
                return jsonify({"success": False, "message": "User not found"}), 404

        complaint = Complaints.query.get(complaint_id)

        if not complaint:
            return jsonify({"success": False, "message": "Complaint not found"}), 404

        # Verify accused is the target of this complaint
        if complaint.accused_id != accused_id:
            return jsonify({"success": False, "message": "Unauthorized"}), 403

        if complaint.status not in ['pending', 'notified']:
            return jsonify({"success": False, "message": f"Can only appeal pending or notified complaints, current status: {complaint.status}"}), 400

        if hasattr(complaint, 'appeal_message') and complaint.appeal_message:
            return jsonify({"success": False, "message": "Already appealed"}), 400

        # Update complaint with appeal
        complaint.status = 'appealed'
        complaint.appeal_message = appeal_message
        complaint.appealed_at = datetime.now(timezone.utc)

        db.session.commit()

        # Mark the related notification as read
        try:
            # Find the notification related to this complaint
            notification = User_Notifications.query.filter_by(
                related_id=complaint_id,
                type='complaint'
            ).first()
            
            if notification:
                notification.is_read = True
                db.session.commit()
        except Exception as e:
            print(f"Error marking notification as read: {e}")
            # Don't fail the appeal if marking notification fails

        return jsonify({"success": True, "message": "Appeal submitted successfully"}), 200

    except Exception as e:
        print(f"Error filing appeal: {e}")
        db.session.rollback()
        return jsonify({"success": False, "message": "Database error"}), 500

@app.route('/api/complaints/<int:complaint_id>/review-appeal', methods=['PUT'])
@require_role('Manager')
def review_complaint_appeal(complaint_id):
    """Manager reviews an appeal and decides to repeal or uphold the complaint"""
    try:
        token = request.headers.get('Authorization').split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        manager = Employees.query.filter_by(email=payload.get('email')).first()

        if not manager or manager.role != 'Manager':
            return jsonify({"success": False, "message": "Manager access required"}), 403

        data = request.get_json()
        decision = data.get('decision')  # 'repeal' or 'uphold'
        review_notes = data.get('review_notes', '')

        if decision not in ['repeal', 'uphold']:
            return jsonify({"success": False, "message": "Invalid decision"}), 400

        complaint = Complaints.query.get(complaint_id)
        if not complaint:
            return jsonify({"success": False, "message": "Complaint not found"}), 404

        if complaint.status != 'appealed':
            return jsonify({"success": False, "message": "Complaint not in appealed status"}), 400

        # Get complainant (accuser) and accused
        complainant = None
        accused = None

        if complaint.complainant_type == 'customer':
            complainant = Customers.query.get(complaint.complainant_id)
        else:
            complainant = Employees.query.get(complaint.complainant_id)

        if complaint.accused_type == 'customer':
            accused = Customers.query.get(complaint.accused_id)
        else:
            accused = Employees.query.get(complaint.accused_id)

        if decision == 'repeal':
            # Repeal: Add 2 complaints to the complainant (accuser)
            if complainant:
                if complaint.complainant_type == 'customer':
                    complainant.warning_count += 2
                else:  # employee (chef or delivery)
                    complainant.complaint_count += 2
                    
                    # Check for demotion (3 complaints = 1 demotion)
                    if complainant.complaint_count >= 3:
                        complainant.demotion_count += 1
                        complainant.complaint_count = 0  # Reset complaint count after demotion
                        
                        # Handle role demotion
                        if complainant.role == 'Chef':
                            complainant.role = 'Delivery'
                        elif complainant.role == 'Delivery':
                            # Delivery drivers get fired on demotion since there's no lower role
                            complainant.status = 'Fired'
                            complainant.demotion_count = 0
                        
                        # Check for firing (2 demotions = fired), but only if not already fired
                        if complainant.demotion_count >= 2 and complainant.status != 'Fired':
                            complainant.status = 'Fired'
                            complainant.demotion_count = 0
            
            complaint.status = 'repealed'
            complaint.manager_decision = f"REPEALED: {review_notes}"
        else:  # uphold
            # Uphold: Add 1 warning to the accused
            if accused:
                if complaint.accused_type == 'customer':
                    accused.warning_count += 1
                else:  # employee
                    accused.complaint_count += 1
                    
                    # Check for demotion
                    if accused.complaint_count >= 3:
                        accused.demotion_count += 1
                        accused.complaint_count = 0
                        
                        # Handle role demotion
                        if accused.role == 'Chef':
                            accused.role = 'Delivery'
                        elif accused.role == 'Delivery':
                            # Delivery drivers get fired on demotion
                            accused.status = 'Fired'
                            accused.demotion_count = 0
                        
                        # Check for firing (2 demotions = fired), but only if not already fired
                        if accused.demotion_count >= 2 and accused.status != 'Fired':
                            accused.status = 'Fired'
                            accused.demotion_count = 0
            
            complaint.status = 'upheld'
            complaint.manager_decision = f"UPHELD: {review_notes}"

        complaint.reviewed_at = datetime.now(timezone.utc)
        complaint.manager_reviewed_by = manager.employee_id

        db.session.commit()

        return jsonify({"success": True, "message": f"Complaint {decision}ed successfully"}), 200

    except Exception as e:
        print(f"Error reviewing appeal: {e}")
        db.session.rollback()
        return jsonify({"success": False, "message": "Database error"}), 500

@app.route('/api/complaints/<int:complaint_id>/notify', methods=['POST'])
@require_role('Manager')
def notify_complaint_accused(complaint_id):
    """Notify the accused party about a complaint"""
    try:
        token = request.headers.get('Authorization').split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        manager = Employees.query.filter_by(email=payload.get('email')).first()
        
        if not manager or manager.role != 'Manager':
            return jsonify({"success": False, "message": "Manager access required"}), 403

        complaint = Complaints.query.get(complaint_id)
        if not complaint:
            return jsonify({"success": False, "message": "Complaint not found"}), 404

        # Get accused user info
        accused_user_id = None
        accused_name = ""
        if complaint.accused_type == 'customer':
            accused = Customers.query.get(complaint.accused_id)
            if accused:
                accused_user_id = accused.customer_id
                accused_name = accused.username
        elif complaint.accused_type in ['chef', 'delivery']:
            accused = Employees.query.get(complaint.accused_id)
            if accused:
                accused_user_id = accused.employee_id
                accused_name = accused.name

        if not accused_user_id:
            return jsonify({"success": False, "message": "Accused user not found"}), 404

        # Create notification for accused user
        notification = User_Notifications(
            user_id=accused_user_id,
            title="Complaint Filed Against You",
            message=f"A {complaint.complaint_type} has been filed against you regarding: {complaint.description}. Category: {complaint.category}. A manager will review this matter. You have the option to appeal this complaint if you believe it is unjust.",
            type="complaint",
            related_id=complaint.complaint_id
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({"success": True, "message": f"Notification sent to {accused_name}"}), 200

    except Exception as e:
        print(f"Error notifying accused: {e}")
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to notify accused party"}), 500

@app.route('/api/complaints/<int:complaint_id>/status', methods=['PUT'])
@require_role('Manager')
def update_complaint_status(complaint_id):
    """Update complaint status (used for marking as notified)"""
    try:
        token = request.headers.get('Authorization').split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        manager = Employees.query.filter_by(email=payload.get('email')).first()
        
        if not manager or manager.role != 'Manager':
            return jsonify({"success": False, "message": "Manager access required"}), 403

        data = request.get_json()
        status = data.get('status')

        complaint = Complaints.query.get(complaint_id)
        if not complaint:
            return jsonify({"success": False, "message": "Complaint not found"}), 404

        complaint.status = status
        if status in ['notified', 'upheld', 'dismissed']:
            complaint.reviewed_at = datetime.now(timezone.utc)

        db.session.commit()

        return jsonify({"success": True, "message": f"Complaint status updated to {status}"}), 200

    except Exception as e:
        print(f"Error updating complaint status: {e}")
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to update complaint status"}), 500

if __name__ == "__main__":
    app.run(debug=True)