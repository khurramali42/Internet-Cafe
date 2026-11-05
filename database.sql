-- COPY THIS CODE INTO YOUR PHPMYADMIN SQL TAB --
-- Database Name: speedy_cafe --

CREATE DATABASE IF NOT EXISTS speedy_cafe;
USE speedy_cafe;

-- 1. USERS TABLE (Admin & Staff)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    fullName VARCHAR(100),
    role ENUM('ADMIN', 'USER') DEFAULT 'USER',
    email VARCHAR(100),
    phone VARCHAR(20),
    isActive TINYINT(1) DEFAULT 1,
    lastLoginAt BIGINT
) ENGINE=InnoDB;

-- No default production passwords are seeded.
-- Create a strong administrator using: php scripts/bootstrap-admin.php
-- Existing installations must rotate their historical demo credentials.

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact VARCHAR(50),
    remarks TEXT,
    totalSpent DECIMAL(10, 2) DEFAULT 0,
    outstandingBalance DECIMAL(10, 2) DEFAULT 0,
    CONSTRAINT chk_customers_totalspent CHECK (totalSpent >= 0)
) ENGINE=InnoDB;

-- 3. CABINS TABLE
CREATE TABLE IF NOT EXISTS cabins (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    status ENUM('AVAILABLE', 'OCCUPIED', 'ON_HOLD', 'MAINTENANCE', 'OUT_OF_SERVICE') DEFAULT 'AVAILABLE',
    currentSessionId VARCHAR(50) NULL,
    location VARCHAR(100),
    statusReason TEXT,
    expectedFix VARCHAR(100)
) ENGINE=InnoDB;

-- Initialize 12 Cabins
INSERT IGNORE INTO cabins (id, name, status) VALUES 
('cab-1', 'Cabin 1', 'AVAILABLE'),
('cab-2', 'Cabin 2', 'AVAILABLE'),
('cab-3', 'Cabin 3', 'AVAILABLE'),
('cab-4', 'Cabin 4', 'AVAILABLE'),
('cab-5', 'Cabin 5', 'AVAILABLE'),
('cab-6', 'Cabin 6', 'AVAILABLE'),
('cab-7', 'Cabin 7', 'AVAILABLE'),
('cab-8', 'Cabin 8', 'AVAILABLE'),
('cab-9', 'Cabin 9', 'AVAILABLE'),
('cab-10', 'Cabin 10', 'AVAILABLE'),
('cab-11', 'Cabin 11', 'AVAILABLE'),
('cab-12', 'Cabin 12', 'AVAILABLE');

-- 4. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(50) PRIMARY KEY,
    cabinId VARCHAR(50),
    customerId VARCHAR(50),
    inTime BIGINT NOT NULL,
    outTime BIGINT,
    ratePerHour DECIMAL(10, 2),
    totalHoldMinutes INT DEFAULT 0,
    effectiveMinutes INT DEFAULT 0,
    amountDue DECIMAL(10, 2) DEFAULT 0,
    amountPaid DECIMAL(10, 2) DEFAULT 0,
    status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
    createdBy VARCHAR(50),
    isManual TINYINT(1) DEFAULT 0,
    manualReason TEXT,
    holdsJson JSON, -- Stores the array of Hold objects
    CONSTRAINT chk_sessions_money CHECK (ratePerHour >= 0 AND amountDue >= 0 AND amountPaid >= 0),
    CONSTRAINT chk_sessions_times CHECK (inTime > 0 AND (outTime IS NULL OR outTime >= inTime)),
    CONSTRAINT chk_sessions_duration CHECK (totalHoldMinutes >= 0 AND effectiveMinutes >= 0),
    INDEX idx_sessions_customer_time (customerId, inTime),
    INDEX idx_sessions_cabin_state (cabinId, status)
) ENGINE=InnoDB;

-- 5. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(50) PRIMARY KEY,
    type ENUM('PAYMENT', 'SALE', 'EXPENSE') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date BIGINT NOT NULL,
    description TEXT,
    category VARCHAR(50),
    relatedId VARCHAR(50), -- Session ID or Invoice ID
    customerId VARCHAR(50),
    isManual TINYINT(1) DEFAULT 0,
    CONSTRAINT chk_transactions_amount CHECK (amount >= 0),
    INDEX idx_transactions_customer_date (customerId, date),
    INDEX idx_transactions_related (relatedId)
) ENGINE=InnoDB;

-- 6. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS inventory (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    quantity INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'IN_USE',
    purchaseDate BIGINT,
    cost DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    remarks TEXT,
    CONSTRAINT chk_inventory_nonnegative CHECK (quantity >= 0 AND cost >= 0)
) ENGINE=InnoDB;

-- 7. REPAIR TICKETS TABLE
CREATE TABLE IF NOT EXISTS repairs (
    id VARCHAR(50) PRIMARY KEY,
    cabinId VARCHAR(50),
    reason TEXT,
    reportedBy VARCHAR(50),
    startTime BIGINT,
    expectedFix VARCHAR(100),
    status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
    closedAt BIGINT
) ENGINE=InnoDB;

-- 8. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    userId VARCHAR(50),
    username VARCHAR(50),
    action VARCHAR(50),
    details TEXT,
    timestamp BIGINT,
    ipAddress VARCHAR(50)
) ENGINE=InnoDB;

-- Rate-limit login attempts per account/IP fingerprint (no raw IP or password stored).
CREATE TABLE IF NOT EXISTS login_attempts (
    identityHash CHAR(64) PRIMARY KEY,
    failures INT NOT NULL DEFAULT 0,
    updatedAt BIGINT NOT NULL
) ENGINE=InnoDB;
