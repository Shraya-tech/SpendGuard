-- ============================================
-- SpendGuard Database Schema
-- ITC 4940 - Senior Design, Spring 2026
-- Team: Shraya Rajkarnikar & Mario Akhnoukh 
-- ============================================
 
CREATE DATABASE IF NOT EXISTS spendguard_db;
USE spendguard_db;
 
-- ── USERS TABLE ──
CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(100) NOT NULL UNIQUE,
    email      VARCHAR(255),
    password   VARCHAR(255) NOT NULL
);
 
-- ── PAYMENTS TABLE ──
CREATE TABLE IF NOT EXISTS payments (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    vendor       VARCHAR(255),
    amount       DECIMAL(10,2),
    payment_date VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
 
-- ── CONTRACTS TABLE ──
CREATE TABLE IF NOT EXISTS contracts (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT,
    vendor         VARCHAR(255),
    days_worked    INT NULL,
    pto_hours      DECIMAL(10,2) NULL,
    yearly_salary  DECIMAL(10,2) NULL,
    overtime_rate  DECIMAL(10,2) NULL,
    health_bonus   DECIMAL(10,2) NULL,
    vacation_days  INT NULL,
    notice_period  INT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);