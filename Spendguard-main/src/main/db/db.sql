CREATE DATABASE IF NOT EXISTS spendguard_db;
USE spendguard_db;

-- 1. Master Contracts (The Audit Rules)
CREATE TABLE Contracts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vendor_name VARCHAR(100),
    budget_limit DECIMAL(10, 2),
    expiry_date DATE
);

-- 2. Audit Findings (To store what the Java code discovers)
CREATE TABLE Audit_Findings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    issue_type VARCHAR(50), -- e.g., 'Duplicate' or 'Over Budget'
    vendor VARCHAR(100),
    amount_flagged DECIMAL(10, 2),
    flag_reason TEXT,
    scan_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Seed Data (Crucial for the demo!)
INSERT INTO Contracts (vendor_name, budget_limit, expiry_date) 
VALUES ('Adobe', 500.00, '2026-12-31');