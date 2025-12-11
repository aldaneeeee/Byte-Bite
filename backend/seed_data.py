#!/usr/bin/env python3
"""
Seed data script for Byte&Bite database.
Run this script to populate the database with initial data.
"""

import os
import sys
from datetime import datetime
from werkzeug.security import generate_password_hash

# Add the current directory to the path so we can import app
sys.path.insert(0, os.path.dirname(__file__))

from app import app, db, Customers, Employees, Dishes

def seed_employees():
    """Seed initial employees (chefs, delivery, manager)"""
    print("Seeding employees...")

    employees_data = [
        {'name': 'John Manager', 'email': 'manager@bytebite.com', 'password_hash': generate_password_hash('manager123'), 'role': 'Manager', 'profile_image_url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW5hZ2VyJTIwcHJvZmlsZXxlbnwxfHx8fDE3NjM0ODQwODN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
        {'name': 'Chef Mario', 'email': 'chef1@bytebite.com', 'password_hash': generate_password_hash('chef123'), 'role': 'Chef', 'profile_image_url': 'https://mario.wiki.gallery/images/thumb/9/96/Mario_and_mushroom_SMB1_artwork.png/110px-Mario_and_mushroom_SMB1_artwork.png'},
        {'name': 'Chef Luigi', 'email': 'chef2@bytebite.com', 'password_hash': generate_password_hash('chef123'), 'role': 'Chef', 'profile_image_url': 'https://mario.wiki.gallery/images/thumb/b/b4/Luigi_NES.png/62px-Luigi_NES.png'},
        {'name': 'Delivery Dave', 'email': 'delivery1@bytebite.com', 'password_hash': generate_password_hash('delivery123'), 'role': 'Delivery', 'profile_image_url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWxpdmVyeSUyMGRyaXZlcnxlbnwxfHx8fDE3NjM0ODQwODYgfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
        {'name': 'Delivery Sarah', 'email': 'delivery2@bytebite.com', 'password_hash': generate_password_hash('delivery123'), 'role': 'Delivery', 'profile_image_url': 'https://images.unsplash.com/photo-1494790108755-2616b612b786?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmZW1hbGUlMjBkZWxpdmVyeSUyMGRyaXZlcnxlbnwxfHx8fDE3NjM0ODQwODd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'},
    ]

    for data in employees_data:
        # Check if employee already exists
        if not Employees.query.filter_by(email=data['email']).first():
            employee = Employees(**data)
            db.session.add(employee)
            print(f"  Added employee: {data['name']} ({data['role']})")

    db.session.commit()
    print("Employees seeded successfully!")

def seed_dishes():
    """Seed initial dishes"""
    print("Seeding dishes...")

    # Get chef IDs for assignment
    chef_mario = Employees.query.filter_by(email='chef1@bytebite.com').first()
    chef_luigi = Employees.query.filter_by(email='chef2@bytebite.com').first()

    if not chef_mario or not chef_luigi:
        print("ERROR: Chefs not found! Run seed_employees() first.")
        return

    dishes_data = [
        {'name': 'Loaded Street Burger', 'price': 12.99, 'description': 'Double patty with special sauce, pickles, and crispy fries', 'image_url': 'https://images.unsplash.com/photo-1687937139478-1743eb2de051?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXJnZXIlMjBzdHJlZXQlMjBmb29kfGVufDF8fHx8MTc2MzQ4NDA4MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'chef_id': chef_mario.employee_id},
        {'name': 'Bao Buns', 'price': 10.99, 'description': 'Soft steamed buns with your choice of filling', 'image_url': 'https://images.unsplash.com/photo-1675096000167-4b8a276b6187?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYW8lMjBidW5zfGVufDF8fHx8MTc2MzQ4NDA4Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'chef_id': chef_luigi.employee_id},
        {'name': 'Fusion Ramen Bowl', 'price': 14.99, 'description': 'Rich broth with handmade noodles, egg, and fresh toppings', 'image_url': 'https://images.unsplash.com/photo-1697652974652-a2336106043b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYW1lbiUyMGJvd2x8ZW58MXx8fHwxNzYzNDU2NTY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'chef_id': chef_mario.employee_id},
        {'name': 'Korean Fried Chicken', 'price': 16.99, 'description': 'Crispy chicken with sweet and spicy glaze', 'image_url': 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllZCUyMGNoaWNrZW58ZW58MXx8fHwxNzYzNDQ1Mjc5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'chef_id': chef_luigi.employee_id},
        {'name': 'Street Tacos (3)', 'price': 13.99, 'description': 'Authentic street-style tacos with fresh cilantro and lime', 'image_url': 'https://images.unsplash.com/photo-1648437595587-e6a8b0cdf1f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjB0YWNvc3xlbnwxfHx8fDE3NjM0ODQwODF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'chef_id': chef_mario.employee_id},
        {'name': 'Truffle Wagyu Burger', 'price': 29.99, 'description': 'Premium wagyu beef with black truffle aioli and gold leaf garnish', 'image_url': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cnVmZmxlJTIwYnVyZ2VyfGVufDF8fHx8MTc2MzQ4NDA4M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'is_vip': True, 'chef_id': chef_mario.employee_id},
        {'name': 'Golden Foie Gras', 'price': 45.99, 'description': 'Pan-seared foie gras with edible gold dust and aged balsamic reduction', 'image_url': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb2llJTIwZ3Jhc3xlbnwxfHx8fDE3NjM0ODQwODR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', 'is_vip': True, 'chef_id': chef_luigi.employee_id},
    ]

    for data in dishes_data:
        # Check if dish already exists
        if not Dishes.query.filter_by(name=data['name']).first():
            dish = Dishes(**data)
            db.session.add(dish)
            print(f"  Added dish: {data['name']} (${data['price']})")

    db.session.commit()
    print("Dishes seeded successfully!")

def seed_customers():
    """Seed some test customers"""
    print("Seeding test customers...")

    customers_data = [
        {'username': 'testuser', 'email': 'test@example.com', 'password_hash': generate_password_hash('test123'), 'phone_number': '555-0123', 'deposited_cash': 100.00},
        {'username': 'vipuser', 'email': 'vip@example.com', 'password_hash': generate_password_hash('vip123'), 'phone_number': '555-0456', 'deposited_cash': 500.00},
    ]

    for data in customers_data:
        # Check if customer already exists
        if not Customers.query.filter_by(email=data['email']).first():
            customer = Customers(**data)
            db.session.add(customer)
            print(f"  Added customer: {data['username']} ({data['email']})")

    db.session.commit()
    print("Customers seeded successfully!")

def main():
    """Main seeding function"""
    print("Starting database seeding...")

    with app.app_context():
        # Create all tables if they don't exist
        db.create_all()
        print("Database tables created/verified.")

        # Seed data in order
        seed_employees()
        seed_dishes()
        seed_customers()

    print("Database seeding completed successfully!")

if __name__ == "__main__":
    main()