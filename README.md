SpendGuard — Financial Audit Platform

Developer: Shraya Rajkarnikar & Mario Akhnoukh | UNC Pembroke — Senior Design (ITC 4940), Spring 2026

Stack: Node.js · Express · MySQL · PDF.js · HTML/CSS/JavaScript

Overview
SpendGuard is a full-stack financial auditing web application that automatically detects financial irregularities in uploaded payment and contract data. It replaces manual audit workflows with automated detection engines for three categories of financial risk:

Duplicate Payments — same vendor, same amount paid more than once
Duplicate Subscriptions — recurring charges identified via date-gap analysis
Contract Compliance Violations — PDF contract terms cross-referenced against actual payment records

Features

Upload PDF invoices and contracts — parsed client-side via PDF.js
Automated duplicate payment detection with flagged report output
Subscription identification engine using date-gap interval analysis
Contract compliance comparison: extracts clause data from original vs. amended contracts and flags discrepancies
Audit-ready report generation for each detection category
My Files page for managing uploaded documents
Mark Resolved workflow — track remediated findings
Full user authentication (login/signup)
MySQL database with referential integrity across all tables

Three core tables:
users — authentication and session management
payments — vendor, amount, date per user (foreign key → users)
contracts — extracted contract terms: salary, PTO, overtime rate, notice period, vacation days, health bonus (foreign key → users)

/
├── server.js                      # Express backend — API routes, DB connection, auth
├── schema.sql                     # Full MySQL schema
├── package.json
├── styles.css
├── index.html                     # Landing page
├── login.html / signup.html       # Authentication
├── dashboard.html                 # Main audit dashboard
├── duplicate-payments.html        # Duplicate payment detection view
├── duplicate-subscriptions.html   # Subscription detection view
├── contracts.html                 # Contract compliance comparison view
├── myfiles.html                   # File management
├── profile.html                   # User profile
└── sample-data/
    ├── INVOICE-1.pdf              # Sample invoice for testing
    ├── INVOICE-2.pdf              # Duplicate invoice for testing
    ├── JOB-CONTRACT-ORIGINAL.pdf  # Original contract
    └── JOB-CONTRACT-AMENDED.pdf   # Amended contract — compliance test

Setup & Installation
Requirements
  -Node.js (v18+)
  -MySQL (running locally)
  
Steps
# 1. Clone the repo
git clone https://github.com/Shraya-tech/SpendGuard.git
cd SpendGuard

# 2. Install dependencies
npm install

# 3. Set up the database
mysql -u root -p < schema.sql

# 4. Configure DB connection in server.js
# Update host, user, password, database to match your local MySQL

# 5. Run the server
node server.js

# 6. Open in browser
# http://localhost:3000

Testing
Sample PDFs are included in the repo for immediate testing:
FilePurposeINVOICE-1.pdf + INVOICE-2.pdfUpload both to trigger duplicate payment detection
JOB-CONTRACT-ORIGINAL.pdf + JOB-CONTRACT-AMENDED.pdfUpload both to trigger contract compliance comparison

