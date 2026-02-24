USE spendguard_db;

CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(100) NOT NULL UNIQUE,
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    vendor       VARCHAR(255) NOT NULL,
    amount       DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    source       VARCHAR(50) DEFAULT 'pdf',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    vendor       VARCHAR(255),
    cost         DECIMAL(10,2) NOT NULL,
    start_date   DATE,
    end_date     DATE,
    status       VARCHAR(50) DEFAULT 'active',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contracts (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    vendor_name  VARCHAR(255) NOT NULL,
    budget_limit DECIMAL(10,2) NOT NULL,
    start_date   DATE,
    end_date     DATE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_findings (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    issue_type     VARCHAR(100) NOT NULL,
    vendor         VARCHAR(255) NOT NULL,
    amount_flagged DECIMAL(10,2),
    severity       ENUM('low','medium','high') DEFAULT 'medium',
    notes          TEXT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO users (username, email, password)
VALUES ('admin', 'admin@spendguard.com', 'admin123')
ON DUPLICATE KEY UPDATE username = username;