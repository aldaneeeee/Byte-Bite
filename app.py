# app.py
from flask import Flask, render_template, request, jsonify, redirect, url_for
#import DB language 

app = Flask(__name__)

# Database connection
"""
def get_db():
    conn = sqlite3.connect("database/bytebite.db")
    conn.row_factory = sqlite3.Row
    return conn
"""

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/menu")
def menu():
    return render_template("menu.html")

@app.route("/checkout", methods=["POST"])
def checkout():
    order_data = request.json
    # save to database later
    return jsonify({"status": "success", "message": "Order received"})

@app.route("/order/<int:order_id>")
def order_status(order_id):
    # fetch order from database
    return render_template("order_status.html", order_id=order_id)

if __name__ == "__main__":
    app.run(debug=True)


#Register User 



#login User 

#logout user

#reset password

#Get profile

#output profile 

#Update user profile 

#check Menu

#getItem

#createItem


#updateItem


#getInventory

#updateinventory 


#add to cart 

#remove from cart 

#total sum 

#return total sum 

#order management 