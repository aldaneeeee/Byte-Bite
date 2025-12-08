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
# with app.app_context():
#     db.create_all()
    
    # Seed dishes if not exists
    with app.app_context():
        if Dishes.query.count() == 0:
            dishes_data = [
                {'name': 'Loaded Street Burger', 'price': 12.99, 'description': 'Double patty with special sauce, pickles, and crispy fries', 'image_url': 'https://images.unsplash.com/photo-1687937139478-1743eb2de051?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXJnZXIlMjBzdHJlZXQlMjBmb29kfGVufDF8fHx8MTc2MzQ4NDA4MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
                {'name': 'Bao Buns', 'price': 10.99, 'description': 'Soft steamed buns with your choice of filling', 'image_url': 'https://images.unsplash.com/photo-1675096000167-4b8a276b6187?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYW8lMjBidW5zfGVufDF8fHx8MTc2MzQ4NDA4Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
                {'name': 'Fusion Ramen Bowl', 'price': 14.99, 'description': 'Rich broth with handmade noodles, egg, and fresh toppings', 'image_url': 'https://images.unsplash.com/photo-1697652974652-a2336106043b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYW1lbiUyMGJvd2x8ZW58MXx8fHwxNzYzNDU2NTY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
                {'name': 'Korean Fried Chicken', 'price': 16.99, 'description': 'Crispy chicken with sweet and spicy glaze', 'image_url': 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllZCUyMGNoaWNrZW58ZW58MXx8fHwxNzYzNDQ1Mjc5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
                {'name': 'Street Tacos (3)', 'price': 13.99, 'description': 'Authentic street-style tacos with fresh cilantro and lime', 'image_url': 'https://images.unsplash.com/photo-1648437595587-e6a8b0cdf1f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjB0YWNvc3xlbnwxfHx8fDE3NjM0ODQwODF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
            ]
            for data in dishes_data:
                dish = Dishes(**data)
                db.session.add(dish)
            db.session.commit()

    # Seed employees if not exists
    with app.app_context():
        if Employees.query.count() == 0:
            employees_data = [
                {'name': 'John Manager', 'email': 'manager@bytebite.com', 'password_hash': generate_password_hash('manager123'), 'role': 'Manager'},
                {'name': 'Chef Mario', 'email': 'chef1@bytebite.com', 'password_hash': generate_password_hash('chef123'), 'role': 'Chef'},
                {'name': 'Chef Luigi', 'email': 'chef2@bytebite.com', 'password_hash': generate_password_hash('chef123'), 'role': 'Chef'},
                {'name': 'Delivery Dave', 'email': 'delivery1@bytebite.com', 'password_hash': generate_password_hash('delivery123'), 'role': 'Delivery'},
                {'name': 'Delivery Sarah', 'email': 'delivery2@bytebite.com', 'password_hash': generate_password_hash('delivery123'), 'role': 'Delivery'},
            ]
            for data in employees_data:
                employee = Employees(**data)
                db.session.add(employee)
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
    dishes = Dishes.query.all()
    menu_items = []
    for dish in dishes:
        item = {
            'id': str(dish.dish_id),
            'name': dish.name,
            'price': float(dish.price),
            'description': dish.description,
            'image': dish.image_url,
            'is_vip': dish.is_vip
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

# Place order
@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    
    # Extract order data
    cart_items = data.get('items', [])
    delivery_info = data.get('deliveryInfo', {})
    total_price = data.get('totalPrice', 0)
    
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
            payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
            email = payload.get('email')
            user = Customers.query.filter_by(email=email).first()
            print(f"[ORDERS] Found user: {user.email if user else None}, current order_count: {user.order_count if user else None}")
            if not user:
                print(f"[ORDERS] No user found for email: {email}")
                return jsonify({"success": False, "message": "User not found"}), 404
            try:
                deposited_cash = float(user.deposited_cash)
                order_total = float(total_price)
            except Exception as e:
                print(f"[ORDERS] Error converting deposited_cash or total_price: {e}")
                return jsonify({"success": False, "message": "Invalid deposited_cash or total_price value"}), 400
            if deposited_cash < order_total:
                print(f"[ORDERS] Insufficient deposited cash: {deposited_cash} < {order_total}")
                # Increment warning_count for insufficient balance
                user.warning_count = (user.warning_count or 0) + 1
                db.session.add(user)
                db.session.commit()
                print(f"[ORDERS] Incremented warning_count to: {user.warning_count}")
                return jsonify({"success": False, "message": "Insufficient deposited cash balance"}), 400
            # Deduct order total and increment order_count
            user.deposited_cash = deposited_cash - order_total
            user.order_count = (user.order_count or 0) + 1
            db.session.add(user)
            db.session.commit()
            print(f"[ORDERS] New deposited_cash: {user.deposited_cash}, order_count: {user.order_count}")
        except Exception as e:
            print(f"Error incrementing order_count in /api/orders: {e}")
    # Mock order ID
    order_id = "ORD-" + str(datetime.now().timestamp())
    return jsonify({
        "success": True,
        "orderId": order_id,
        "message": "Order placed successfully",
        "estimatedDelivery": "30-45 minutes"
    }), 201

# Get user orders
@app.route('/api/orders', methods=['GET'])
def get_orders():
    # TODO: Get orders from database
    # For now, return empty list
    return jsonify([])


# Delivery API endpoints

# Get available orders for delivery bidding
@app.route('/api/delivery/available-orders', methods=['GET'])
@require_role('Delivery')
def get_available_orders():
    try:
        # Get orders that are ready for delivery and not yet assigned
        # For now, return mock data
        orders = [
            {
                "order_id": 1,
                "customer_id": 1,
                "status": "Ready for Delivery",
                "total_price": 25.99,
                "order_time": "2025-12-07T14:30:00Z",
                "customer_name": "John Doe",
                "customer_address": "123 Main St, City, State"
            },
            {
                "order_id": 2,
                "customer_id": 2,
                "status": "Ready for Delivery",
                "total_price": 18.50,
                "order_time": "2025-12-07T15:00:00Z",
                "customer_name": "Jane Smith",
                "customer_address": "456 Oak Ave, City, State"
            }
        ]
        return jsonify({"success": True, "orders": orders}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to fetch available orders"}), 500


# Place a bid on an order
@app.route('/api/delivery/bid', methods=['POST'])
@require_role('Delivery')
def place_delivery_bid():
    try:
        data = request.get_json()
        order_id = data.get('order_id')
        bid_amount = data.get('bid_amount')

        if not order_id or not bid_amount:
            return jsonify({"success": False, "message": "Order ID and bid amount are required"}), 400

        # Get delivery person ID from token
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        email = payload.get('email')
        delivery_person = Employees.query.filter_by(email=email).first()

        if not delivery_person or delivery_person.role != 'Delivery':
            return jsonify({"success": False, "message": "Unauthorized"}), 403

        # TODO: Save bid to database
        # For now, just return success
        return jsonify({"success": True, "message": "Bid placed successfully"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to place bid"}), 500


# Get delivery person's bids
@app.route('/api/delivery/my-bids', methods=['GET'])
@require_role('Delivery')
def get_delivery_bids():
    try:
        # Get delivery person ID from token
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        email = payload.get('email')
        delivery_person = Employees.query.filter_by(email=email).first()

        if not delivery_person or delivery_person.role != 'Delivery':
            return jsonify({"success": False, "message": "Unauthorized"}), 403

        # TODO: Get bids from database
        # For now, return mock data
        bids = [
            {
                "bid_id": 1,
                "order_id": 1,
                "bid_amount": 3.50,
                "bid_time": "2025-12-07T14:35:00Z",
                "is_winning_bid": False
            },
            {
                "bid_id": 2,
                "order_id": 2,
                "bid_amount": 2.75,
                "bid_time": "2025-12-07T15:05:00Z",
                "is_winning_bid": True
            }
        ]
        return jsonify({"success": True, "bids": bids}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to fetch bids"}), 500


# Get delivery person's active deliveries
@app.route('/api/delivery/my-deliveries', methods=['GET'])
@require_role('Delivery')
def get_delivery_deliveries():
    try:
        # Get delivery person ID from token
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        email = payload.get('email')
        delivery_person = Employees.query.filter_by(email=email).first()

        if not delivery_person or delivery_person.role != 'Delivery':
            return jsonify({"success": False, "message": "Unauthorized"}), 403

        # TODO: Get active deliveries from database
        # For now, return mock data
        deliveries = [
            {
                "order_id": 3,
                "customer_id": 3,
                "status": "In Transit",
                "total_price": 32.75,
                "order_time": "2025-12-07T13:15:00Z",
                "customer_name": "Bob Johnson",
                "customer_address": "789 Pine Rd, City, State"
            }
        ]
        return jsonify({"success": True, "deliveries": deliveries}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to fetch deliveries"}), 500


# Update delivery status
@app.route('/api/delivery/update-status', methods=['POST'])
@require_role('Delivery')
def update_delivery_status():
    try:
        data = request.get_json()
        order_id = data.get('order_id')
        new_status = data.get('status')

        if not order_id or not new_status:
            return jsonify({"success": False, "message": "Order ID and status are required"}), 400

        # Get delivery person ID from token
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(' ')[1] if ' ' in auth_header else auth_header
        payload = jwt.decode(token, app.secret_key, algorithms=['HS256'])
        email = payload.get('email')
        delivery_person = Employees.query.filter_by(email=email).first()

        if not delivery_person or delivery_person.role != 'Delivery':
            return jsonify({"success": False, "message": "Unauthorized"}), 403

        # TODO: Update delivery status in database
        # For now, just return success
        return jsonify({"success": True, "message": f"Delivery status updated to {new_status}"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": "Failed to update delivery status"}), 500


if __name__ == "__main__":
    app.run(debug=True)