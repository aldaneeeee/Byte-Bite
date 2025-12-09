# app.py
import os
import sqlite3
from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, g
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta 
import jwt
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from decimal import Decimal
#import DB language 

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

# initialise DB
# If the .db file doesn't exist but a schema file is present, initialize the DB from the SQL script.
sql_schema_path = os.path.join(basedir, 'byte_and_bite.sql')
if not os.path.exists(db_path) and os.path.exists(sql_schema_path):
    try:
        with open(sql_schema_path, 'r', encoding='utf-8') as f:
            script = f.read()
        # create sqlite database file and run schema
        conn = sqlite3.connect(db_path)
        conn.executescript(script)
        conn.commit()
        conn.close()
    except Exception:
        # if initialization fails, remove possibly corrupt file
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass


# initialise SQLAlchemy
db = SQLAlchemy(app)

# SQLAlchemy models
class Customers(db.Model):
    __tablename__ = 'Customers'
    customer_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    balance = db.Column(db.Numeric(10, 2), default=0.00)
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

class VIP_Customers(db.Model):
    __tablename__ = 'VIP_Customers'
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), primary_key=True)
    vip_start_date = db.Column(db.Date)
    free_deliveries_remaining = db.Column(db.Integer, default=0)

class Orders(db.Model):
    __tablename__ = 'Orders'
    order_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
    chef_id = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'))
    delivery_person_id = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'))
    status = db.Column(db.String(20), default='Pending')
    total_price = db.Column(db.Numeric(10, 2), nullable=False)
    vip_discount = db.Column(db.Numeric(10, 2), default=0.00)
    order_time = db.Column(db.DateTime, default=datetime.utcnow)
    completion_time = db.Column(db.DateTime)

class Order_Items(db.Model):
    __tablename__ = 'Order_Items'
    order_id = db.Column(db.Integer, db.ForeignKey('Orders.order_id'), primary_key=True)
    dish_id = db.Column(db.Integer, db.ForeignKey('Dishes.dish_id'), primary_key=True)
    quantity = db.Column(db.Integer, default=1)

class Delivery_Bids(db.Model):
    __tablename__ = 'Delivery_Bids'
    bidding_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.Integer, db.ForeignKey('Orders.order_id'), nullable=False)
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    memo = db.Column(db.Text)
    status = db.Column(db.String(20), default='created')

class Bid(db.Model):
    __tablename__ = 'Bid'
    bid_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    bidding_id = db.Column(db.Integer, db.ForeignKey('Delivery_Bids.bidding_id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'), nullable=False)
    bid_amount = db.Column(db.Numeric(10, 2), nullable=False)
    bid_time = db.Column(db.DateTime, default=datetime.utcnow)
    is_winning_bid = db.Column(db.Boolean, default=False)

class Reviews(db.Model):
    __tablename__ = 'Reviews'
    review_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    order_id = db.Column(db.Integer, db.ForeignKey('Orders.order_id'), nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
    chef_id = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'))
    delivery_person_id = db.Column(db.Integer, db.ForeignKey('Employees.employee_id'))
    chef_rating = db.Column(db.Integer)
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
    customer_id = db.Column(db.Integer, db.ForeignKey('Customers.customer_id'), nullable=False)
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
                {'name': 'Chef Mario', 'email': 'chef1@bytebite.com', 'password_hash': generate_password_hash('chef123'), 'role': 'Chef', 'profile_image_url': 'https://images.unsplash.com/photo-1583394838336-acd977736f90?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpdGFsaWFuJTIwY2hlZnxlbnwxfHx8fDE3NjM0ODQwODR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
                {'name': 'Chef Luigi', 'email': 'chef2@bytebite.com', 'password_hash': generate_password_hash('chef123'), 'role': 'Chef', 'profile_image_url': 'https://images.unsplash.com/photo-1559847844-5315695dadae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVuY2glMjBjaGVmfGVufDF8fHx8MTc2MzQ4NDA4NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
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
            
            db.session.commit()

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
            
            # Check if this is a customer (not employee)
            if 'role' not in payload:
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
        # Non-VIP customers and visitors only see non-VIP dishes
        dishes = Dishes.query.filter_by(is_vip=False).all()
    
    menu_items = []
    for dish in dishes:
        # Get chef name if chef_id exists
        chef_name = None
        if dish.chef_id:
            chef = Employees.query.filter_by(employee_id=dish.chef_id).first()
            if chef:
                chef_name = chef.name
        
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

    if not check_password_hash(user.password_hash, password):
        return jsonify({"success": False, "message": "Invalid email or password"}), 401

    token = jwt.encode({
        'email': email,
        'exp': datetime.utcnow() + timedelta(hours=24)
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
        'exp': datetime.utcnow() + timedelta(hours=24)
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
            "reputation_score": float(emp.reputation_score) if emp.reputation_score else 5.0
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


# Get all customers (for management)
@app.route('/api/manager/customers', methods=['GET'])
@require_role('Manager')
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
            "balance": float(cust.balance) if cust.balance else 0.0,
            "warning_count": cust.warning_count,
            "order_count": cust.order_count,
            "is_vip": is_vip,
            "is_blacklisted": cust.is_blacklisted
        })
    return jsonify({"success": True, "customers": customer_list}), 200


    return jsonify({"success": True, "customers": customer_list}), 200


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
        }
    }), 200



# Update user profile
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
        if 'name' in data:
            user.name = data['name']
        if 'address' in data:
            user.address = data['address']
        if 'deposited_cash' in data:
            print(f"[UPDATE_PROFILE] Updating deposited_cash: {data['deposited_cash']}")
            try:
                amount = Decimal(str(data['deposited_cash']))
                print(f"[UPDATE_PROFILE] Amount to add: {amount}")
                user.deposited_cash = (user.deposited_cash or Decimal('0')) + amount
                print(f"[UPDATE_PROFILE] New deposited_cash: {user.deposited_cash}")
            except (ValueError, TypeError) as e:
                print(f"[UPDATE_PROFILE] Error converting deposited_cash: {e}")
                return jsonify({"success": False, "message": "Invalid deposited_cash value"}), 400
        if 'payment_method' in data:
            user.payment_method = data['payment_method']

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Profile updated successfully",
            "user": {
                "id": user.customer_id,
                "username": user.username,
                "email": user.email,
                "deposited_cash": float(user.deposited_cash) if user.deposited_cash is not None else None,
                "payment_method": getattr(user, 'payment_method', None),
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "warning_count": user.warning_count,
                "phone_number": user.phone_number,
                "order_count": user.order_count
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Database error", "error": str(e)}), 500


#wei
# Place order
@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    
    # Extract order data   
    cart_items = data.get('items', [])
    total_price = data.get('totalPrice', 0)

    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    try:
        # 2. Authenticate user and check balance
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = Customers.query.filter_by(email=payload.get('email')).first()
        
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        order_total = float(total_price)
        current_balance = float(user.deposited_cash or 0)

        if current_balance < order_total:
            # Record warning for insufficient balance
            user.warning_count = (user.warning_count or 0) + 1
            db.session.commit()
            return jsonify({"success": False, "message": "Insufficient funds"}), 400

        # 3. Deduct payment
        user.deposited_cash = current_balance - order_total
        user.order_count = (user.order_count or 0) + 1
        
        # --- 👇👇👇 New core logic: Create real order 👇👇👇 ---

        # To make the review system work, we need to assign a chef to the order
        # Here we simply assign it to the first chef found (chef1)
        default_chef = Employees.query.filter_by(role='Chef').first()
        chef_id = default_chef.employee_id if default_chef else None

        # A. Create order record
        new_order = Orders(
            customer_id=user.customer_id,
            chef_id=chef_id, # Assign chef
            status='Pending',
            total_price=order_total,
            order_time=datetime.utcnow()
        )
        db.session.add(new_order)
        db.session.flush() # This step is to immediately generate new_order.order_id

        # B. Create order details (Order_Items)
        for item in cart_items:
            order_item = Order_Items(
                order_id=new_order.order_id,
                dish_id=int(item['id']),
                quantity=item['quantity']
            )
            db.session.add(order_item)

        # 4. Commit all changes (user deduction + order + order details)
        db.session.commit()

        print(f"[SUCCESS] Order #{new_order.order_id} created for {user.username}")

        return jsonify({
            "success": True,
            "orderId": new_order.order_id, # Return the actual numeric ID
            "message": "Order placed successfully",
            "estimatedDelivery": "30-45 minutes"
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Create order failed: {e}")
        return jsonify({"success": False, "message": "Failed to create order", "error": str(e)}), 500  #wei

# Get user orders wei
@app.route('/api/orders', methods=['GET'])
def get_orders():
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

        # Query orders for this customer, newest first
        orders = Orders.query.filter_by(customer_id=user.customer_id).order_by(Orders.order_time.desc()).all()
        
        orders_data = []
        for order in orders:
            # Check if this order already has a review in the Reviews table
            review = Reviews.query.filter_by(order_id=order.order_id).first()
            
            orders_data.append({
                "order_id": order.order_id,
                "total": float(order.total_price),
                "status": order.status,
                # Format date as YYYY-MM-DD
                "date": order.order_time.strftime('%Y-%m-%d'), 
                "has_review": review is not None
            })
            
        return jsonify({"success": True, "orders": orders_data}), 200
        
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
    # Find all orders where status is 'Ready for Delivery' and delivery_person_id is not yet assigned
    orders = Orders.query.filter_by(status='Ready for Delivery', delivery_person_id=None).all()
    
    order_list = []
    for order in orders:
        # Get customer information to display the address
        customer = Customers.query.get(order.customer_id)
        
        order_list.append({
            "order_id": order.order_id,
            "customer_id": order.customer_id,
            "customer_name": customer.username,
            "customer_address": "123 Tech Ave (Demo Address)", # If your Customer table has an address field, replace this
            "status": order.status,
            "total_price": float(order.total_price),
            "order_time": order.order_time.isoformat()
        })
    
    return jsonify({"success": True, "orders": order_list}), 200


# 2. Delivery person bid (Simplified logic: placing a bid automatically accepts the order)
@app.route('/api/delivery/bid', methods=['POST'])
@require_role('Delivery')
def place_delivery_bid():
    data = request.get_json()
    order_id = data.get('order_id')
    bid_amount = data.get('bid_amount')

    if not order_id or not bid_amount:
        return jsonify({"success": False, "message": "Missing fields"}), 400

    # Get current delivery person
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1]
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    delivery_person = Employees.query.filter_by(email=payload['email']).first()

    try:
        # 1. Create or retrieve Delivery_Bids session
        bidding = Delivery_Bids.query.filter_by(order_id=order_id).first()
        if not bidding:
            bidding = Delivery_Bids(
                order_id=order_id,
                start_time=datetime.utcnow(),
                status='active'
            )
            db.session.add(bidding)
            db.session.flush() # Generate ID

        # 2. Record bid (Bid)
        new_bid = Bid(
            bidding_id=bidding.bidding_id,
            employee_id=delivery_person.employee_id,
            bid_amount=bid_amount,
            bid_time=datetime.utcnow(),
            is_winning_bid=True # MVP simplification: set directly as winning bid
        )
        db.session.add(new_bid)

        # 3. [Critical] Directly assign the order to this delivery person and change status to "In Transit"
        order = Orders.query.get(order_id)
        order.delivery_person_id = delivery_person.employee_id
        order.status = 'In Transit' # As soon as someone takes the order, delivery starts

        db.session.commit()
        return jsonify({"success": True, "message": "Bid placed and order assigned!"}), 200

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

    # Get orders assigned to me that have not yet become Delivered
    orders = Orders.query.filter(
        Orders.delivery_person_id == delivery_person.employee_id,
        Orders.status == 'In Transit' # Only show what is currently being delivered; delivered items are not shown
    ).all()

    deliveries_list = []
    for order in orders:
        customer = Customers.query.get(order.customer_id)
        deliveries_list.append({
            "order_id": order.order_id,
            "customer_id": order.customer_id,
            "customer_name": customer.username,
            "customer_address": "123 Tech Ave (Demo Address)",
            "status": order.status,
            "total_price": float(order.total_price),
            "order_time": order.order_time.isoformat()
        })

    return jsonify({"success": True, "deliveries": deliveries_list}), 200


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
        order.completion_time = datetime.utcnow()
    
    db.session.commit()
    return jsonify({"success": True, "message": f"Order status updated to {new_status}"}), 200#wei
    
# app.py (添加以下代码)  wei

# 1. 提交评价
@app.route('/api/reviews', methods=['POST'])
def create_review():
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    # 解析 Token 获取用户 ID
    try:
        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        user = Customers.query.filter_by(email=payload['email']).first()
    except:
        return jsonify({"success": False, "message": "Invalid token"}), 401

    data = request.get_json()
    order_id = data.get('order_id')
    chef_rating = data.get('chef_rating')
    dish_rating = data.get('dish_rating')
    comment = data.get('comment')

    # 简单的验证
    if not all([order_id, chef_rating, dish_rating]):
        return jsonify({"success": False, "message": "Missing required fields"}), 400

    # 检查订单是否存在且属于该用户
    order = Orders.query.filter_by(order_id=order_id, customer_id=user.customer_id).first()
    if not order:
        return jsonify({"success": False, "message": "Order not found or access denied"}), 404

    # 检查是否已经评价过
    if Reviews.query.filter_by(order_id=order_id).first():
        return jsonify({"success": False, "message": "Order already reviewed"}), 400

    try:
        review = Reviews(
            order_id=order_id,
            customer_id=user.customer_id,
            chef_id=order.chef_id, # 假设订单关联了厨师
            delivery_person_id=order.delivery_person_id,
            chef_rating=chef_rating,
            dish_rating=dish_rating,
            comment=comment,
            created_at=datetime.utcnow()
        )
        db.session.add(review)
        db.session.commit()
        return jsonify({"success": True, "message": "Review submitted successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Failed to save review", "error": str(e)}), 500

# 2. 获取厨师的评价 (供 ChefDashboard 使用)
@app.route('/api/chef/reviews', methods=['GET'])
@require_role('Chef') # 使用你之前定义的装饰器
def get_chef_reviews():
    # 获取当前厨师
    auth_header = request.headers.get('Authorization')
    token = auth_header.split(' ')[1]
    payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
    chef = Employees.query.filter_by(email=payload['email']).first()

    # 查询所有关联该厨师的评论
    reviews = Reviews.query.filter_by(chef_id=chef.employee_id).order_by(Reviews.created_at.desc()).all()
    
    review_list = []
    for r in reviews:
        # 获取关联的菜品名（这里简化处理，实际可能需要通过 Order_Items 关联查询）
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
        # Get all chefs with their average ratings
        chefs = Employees.query.filter_by(role='Chef').all()
        featured_chefs = []
        
        for chef in chefs:
            # Calculate average chef rating from reviews
            avg_rating = None
            try:
                rating_result = db.session.query(db.func.avg(Reviews.chef_rating)).\
                    filter(Reviews.chef_id == chef.employee_id).\
                    scalar()
                if rating_result is not None:
                    avg_rating = round(float(rating_result), 1)
            except Exception as e:
                pass
            
            # Count dishes by this chef
            dish_count = Dishes.query.filter_by(chef_id=chef.employee_id).count()
            
            featured_chefs.append({
                'employee_id': chef.employee_id,
                'name': chef.name,
                'rating': avg_rating,
                'dish_count': dish_count,
                'reputation_score': float(chef.reputation_score) if chef.reputation_score else 5.0
            })
        
        # Sort by rating (highest first) and limit to top 3
        featured_chefs.sort(key=lambda x: x['rating'] or 0, reverse=True)
        featured_chefs = featured_chefs[:3]
        
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
                if 'role' not in payload:
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
                'total_price': float(order.total_price),
                'completion_time': order.order_time.isoformat() if order.order_time else None
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
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
                if payload.get('type') == 'customer':
                    customer_id = payload.get('customer_id')
                    is_authenticated = True
            except jwt.ExpiredSignatureError:
                pass  # Token expired, treat as unauthenticated
            except jwt.InvalidTokenError:
                pass  # Invalid token, treat as unauthenticated
        
        if is_authenticated and customer_id:
            # Personalized recommendations based on user's order history
            
            # Get most ordered dishes by this customer
            most_ordered_query = db.session.query(
                Dishes.dish_id,
                Dishes.name,
                Dishes.description,
                Dishes.image_url,
                Dishes.price,
                db.func.count(Order_Items.dish_id).label('order_count'),
                Employees.name.label('chef_name'),
                Employees.profile_image_url
            ).join(Order_Items, Dishes.dish_id == Order_Items.dish_id)\
             .join(Orders, Order_Items.order_id == Orders.order_id)\
             .join(Employees, Dishes.chef_id == Employees.employee_id)\
             .filter(Orders.customer_id == customer_id)\
             .filter(Orders.status == 'Delivered')\
             .group_by(Dishes.dish_id, Dishes.name, Dishes.description, Dishes.image_url, Dishes.price, Employees.name, Employees.profile_image_url)\
             .order_by(db.func.count(Order_Items.dish_id).desc())\
             .limit(3)\
             .all()
            
            most_ordered = [{
                'id': row.dish_id,
                'name': row.name,
                'description': row.description,
                'image': row.image_url,
                'price': float(row.price),
                'order_count': row.order_count,
                'chef': {
                    'name': row.chef_name,
                    'profile_image_url': row.profile_image_url
                }
            } for row in most_ordered_query]
            
            # Get highest rated dishes by this customer
            highest_rated_query = db.session.query(
                Dishes.dish_id,
                Dishes.name,
                Dishes.description,
                Dishes.image_url,
                Dishes.price,
                db.func.avg(Reviews.dish_rating).label('rating'),
                db.func.count(Reviews.review_id).label('review_count'),
                Employees.name.label('chef_name'),
                Employees.profile_image_url
            ).join(Order_Items, Dishes.dish_id == Order_Items.dish_id)\
             .join(Orders, Order_Items.order_id == Orders.order_id)\
             .join(Reviews, Orders.order_id == Reviews.order_id)\
             .join(Employees, Dishes.chef_id == Employees.employee_id)\
             .filter(Orders.customer_id == customer_id)\
             .group_by(Dishes.dish_id, Dishes.name, Dishes.description, Dishes.image_url, Dishes.price, Employees.name, Employees.profile_image_url)\
             .order_by(db.func.avg(Reviews.dish_rating).desc())\
             .limit(3)\
             .all()
            
            highest_rated = [{
                'id': row.dish_id,
                'name': row.name,
                'description': row.description,
                'image': row.image_url,
                'price': float(row.price),
                'rating': round(float(row.rating), 1),
                'review_count': row.review_count,
                'chef': {
                    'name': row.chef_name,
                    'profile_image_url': row.profile_image_url
                }
            } for row in highest_rated_query]
            
            return jsonify({
                "success": True,
                "recommendations": {
                    "type": "personalized",
                    "most_ordered": most_ordered,
                    "highest_rated": highest_rated
                }
            }), 200
            
        else:
            # General recommendations for visitors
            
            # Get most popular dishes (most ordered overall)
            most_popular_query = db.session.query(
                Dishes.dish_id,
                Dishes.name,
                Dishes.description,
                Dishes.image_url,
                Dishes.price,
                db.func.count(Order_Items.dish_id).label('total_orders'),
                Employees.name.label('chef_name'),
                Employees.profile_image_url
            ).join(Order_Items, Dishes.dish_id == Order_Items.dish_id)\
             .join(Orders, Order_Items.order_id == Orders.order_id)\
             .join(Employees, Dishes.chef_id == Employees.employee_id)\
             .filter(Orders.status == 'Delivered')\
             .group_by(Dishes.dish_id, Dishes.name, Dishes.description, Dishes.image_url, Dishes.price, Employees.name, Employees.profile_image_url)\
             .order_by(db.func.count(Order_Items.dish_id).desc())\
             .limit(3)\
             .all()
            
            most_popular = [{
                'id': row.dish_id,
                'name': row.name,
                'description': row.description,
                'image': row.image_url,
                'price': float(row.price),
                'total_orders': row.total_orders,
                'chef': {
                    'name': row.chef_name,
                    'profile_image_url': row.profile_image_url
                }
            } for row in most_popular_query]
            
            # Get top rated dishes overall
            top_rated_query = db.session.query(
                Dishes.dish_id,
                Dishes.name,
                Dishes.description,
                Dishes.image_url,
                Dishes.price,
                db.func.avg(Reviews.dish_rating).label('rating'),
                db.func.count(Reviews.review_id).label('review_count'),
                Employees.name.label('chef_name'),
                Employees.profile_image_url
            ).join(Order_Items, Dishes.dish_id == Order_Items.dish_id)\
             .join(Reviews, Order_Items.order_id == Reviews.order_id)\
             .join(Employees, Dishes.chef_id == Employees.employee_id)\
             .group_by(Dishes.dish_id, Dishes.name, Dishes.description, Dishes.image_url, Dishes.price, Employees.name, Employees.profile_image_url)\
             .order_by(db.func.avg(Reviews.dish_rating).desc())\
             .limit(3)\
             .all()
            
            top_rated = [{
                'id': row.dish_id,
                'name': row.name,
                'description': row.description,
                'image': row.image_url,
                'price': float(row.price),
                'rating': round(float(row.rating), 1),
                'review_count': row.review_count,
                'chef': {
                    'name': row.chef_name,
                    'profile_image_url': row.profile_image_url
                }
            } for row in top_rated_query]
            
            return jsonify({
                "success": True,
                "recommendations": {
                    "type": "general",
                    "most_popular": most_popular,
                    "top_rated": top_rated
                }
            }), 200
            
    except Exception as e:
        print(f"Error in get_recommendations: {e}")
        return jsonify({"success": False, "message": "Failed to fetch recommendations"}), 500


if __name__ == "__main__":
    app.run(debug=True)