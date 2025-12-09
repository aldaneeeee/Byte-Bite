-- 1. Users & Actors
CREATE TABLE Customers (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    deposited_cash DECIMAL(10, 2) DEFAULT 0.00,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    warning_count INTEGER DEFAULT 0,
    phone_number VARCHAR(20),
    order_count INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
); -- [cite: 312, 313, 319]

CREATE TABLE VIP_Customers (
    customer_id INTEGER PRIMARY KEY,
    vip_start_date DATE DEFAULT CURRENT_DATE,
    free_deliveries_remaining INTEGER DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id) ON DELETE CASCADE
); -- [cite: 335, 329, 330]

CREATE TABLE Employees (
    employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('Manager', 'Chef', 'Delivery')),
    status VARCHAR(20) DEFAULT 'Active',
    reputation_score DECIMAL(3, 2) DEFAULT 5.00 CHECK (reputation_score >= 0 AND reputation_score <= 5),
    profile_image_url VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP --sample:2024-01-15 14:30:25
); -- [cite: 297, 308, 375]

-- 2. Menu & Food
CREATE TABLE Dishes (
    dish_id INTEGER PRIMARY KEY AUTOINCREMENT,
    chef_id INTEGER,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(255),
    is_vip BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (chef_id) REFERENCES Employees(employee_id)
); -- [cite: 546, 549, 553]

-- 3. Order System
CREATE TABLE Orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    chef_id INTEGER,
    delivery_person_id INTEGER,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Cooking, Ready, Delivering, Completed, Cancelled
    total_price DECIMAL(10, 2) NOT NULL,
    vip_discount DECIMAL(10, 2) DEFAULT 0.00,
    order_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    completion_time DATETIME,
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id),
    FOREIGN KEY (chef_id) REFERENCES Employees(employee_id),
    FOREIGN KEY (delivery_person_id) REFERENCES Employees(employee_id)
); -- [cite: 583, 584, 585, 586]

CREATE TABLE Order_Items (
    order_id INTEGER,
    dish_id INTEGER,
    quantity INTEGER DEFAULT 1,
    PRIMARY KEY (order_id, dish_id),
    FOREIGN KEY (order_id) REFERENCES Orders(order_id),
    FOREIGN KEY (dish_id) REFERENCES Dishes(dish_id)
); -- [cite: 343, 344, 345]

-- 4. Delivery Bidding System
CREATE TABLE Delivery_Bids (
    bidding_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    memo TEXT, -- Justification if manager picks higher bid
    status VARCHAR(20) DEFAULT 'created', -- created, bidding, selected, completed, cancelled
    FOREIGN KEY (order_id) REFERENCES Orders(order_id),
); 

CREATE TABLE Bid (
    bid_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bidding_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL, -- The delivery person bidding
    bid_amount DECIMAL(10, 2) NOT NULL,
    bid_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_winning_bid BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (bidding_id) REFERENCES Delivery_Bids(bidding_id),
    FOREIGN KEY (employee_id) REFERENCES Employees(employee_id)
);

-- 5. Feedback & Discipline
CREATE TABLE Reviews (
    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL, -- Links review to specific transaction
    customer_id INTEGER NOT NULL,
    chef_id INTEGER,
    delivery_person_id INTEGER,
    chef_rating INTEGER CHECK (chef_rating BETWEEN 1 AND 5),
    delivery_rating INTEGER CHECK (delivery_rating BETWEEN 1 AND 5),
    dish_rating INTEGER CHECK (dish_rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id),
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id),
    FOREIGN KEY (chef_id) REFERENCES Employees(employee_id),
    FOREIGN KEY (delivery_person_id) REFERENCES Employees(employee_id)
); -- [cite: 350, 355, 561]

CREATE TABLE Warnings (
    warning_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
); -- [cite: 377, 378, 380]

CREATE TABLE Blacklist (
    blacklist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER UNIQUE,
    email VARCHAR(100) UNIQUE,
    reason TEXT,
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
); -- [cite: 336, 337]

-- sample blacklisted email
INSERT INTO Blacklist (email, reason) VALUES ('blocked@example.com', 'spam account');

-- 6. AI Features (Knowledge Base)
CREATE TABLE AI_Knowledge_Base (
    kb_id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER, -- Author of the answer
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES Employees(employee_id)
); -- [cite: 496, 500, 501]

CREATE TABLE AI_Ratings (
    rating_id INTEGER PRIMARY KEY AUTOINCREMENT,
    kb_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 0 AND 5),
    helpful_score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kb_id) REFERENCES AI_Knowledge_Base(kb_id),
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
); -- [cite: 518, 509, 510]

-- 7. Financial Logging
CREATE TABLE Financial_Log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    order_id INTEGER, -- Nullable if it's just a deposit
    type VARCHAR(20) NOT NULL, -- 'Deposit', 'Payment', 'Refund'
    amount DECIMAL(10, 2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id),
    FOREIGN KEY (order_id) REFERENCES Orders(order_id)
); -- [cite: 290, 286, 288]