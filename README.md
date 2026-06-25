# Speedy Cafe – Venue & Cabin Management System

**Speedy Cafe** is a high-performance, beautiful, and comprehensive venue management system designed for gaming centers, internet cafes, coworking spaces, and PC cabins. 

This repository contains the complete frontend, database configuration, and backend sync-server to easily deploy the application locally or live.

---

## 🚀 Key Features

*   **Interactive Dashboard:** Monitor real-time status of 12 PC cabins with custom color status badges (Available, Occupied, On Hold, Maintenance, Out of Service).
*   **Session Management:** Start sessions, place on hold (pause time/charges), close sessions, and calculate accurate bill amounts instantly.
*   **Customer Directory:** Keep track of gamers/coworkers, total spent, remarks (VIP preferences), and outstanding balances.
*   **Finance & Cash Flow Logs:** Register payments, sell food/beverages, log company expenses, and view interactive financial analytics.
*   **Stock & Inventory Management:** Monitor mechanical keyboards, GPUs, food stock, etc., with automated usage lists.
*   **Repairs & Ticketing System:** Open maintenance logs for damaged screens, headphones, or chairs to automatically flag affected cabins.
*   **User Administration:** Multi-tier role-based security control (Admin and Staff/Operators).
*   **Comprehensive Audit Logs:** Trace every action, transaction, and cabin change to prevent fraud.
*   **Dual Storage Architecture (Offline-First):** High-reliability client-side state engine that seamlessly synchronizes with a central MySQL backend whenever online.

---

## 📂 Project Structure

```bash
├── App.tsx                     # Main application shell with navigation, routing, and sidebar
├── index.html                  # Main entry page with global script imports and import maps
├── index.tsx                   # React root launcher
├── store.tsx                   # State Management & Synced LocalStorage controller
├── types.ts                    # Core TypeScript definitions and schemas
├── vite.config.ts              # Vite server settings
├── database.sql                # Complete MySQL Schema to import in phpMyAdmin
├── /public
│   └── api.php                 # PHP Database Proxy Sync API
├── /components
│   ├── ActionModals.tsx        # Session modals (Start, Pause, Checkout, Billing, Repairs)
│   ├── AdminUsers.tsx          # System Admin user management panel
│   ├── AuditLogs.tsx           # Database audit tracking viewer
│   ├── CabinCard.tsx           # Live PC Cabin UI with timer, hold status, and actions
│   ├── Customers.tsx           # Customer directory with add/edit and ledger features
│   ├── Dashboard.tsx           # Main active grid & cabin statuses
│   ├── Expenses.tsx            # Expense registration panel
│   ├── Inventory.tsx           # IT hardware & snack stock management panel
│   ├── Login.tsx               # Beautiful authentication gate
│   ├── Profile.tsx             # Active operator profile view
│   ├── Reports.tsx             # Beautiful Recharts analytics dashboards
│   └── Settings.tsx            # App-wide parameter panel (offline, API URLs, rates, reset)
```

---

## 🛠️ Step-by-Step Local Setup Guide (VS Code, Vite, & XAMPP)

Follow these steps to run the complete system locally with a real database.

### Prerequisites
1.  **Node.js** (v18 or higher)
2.  **XAMPP** or **WampServer** (for MySQL & PHP)
3.  **VS Code** (or any code editor)

---

### Step 1: Set Up the MySQL Database (Local Server)
1.  Open the **XAMPP Control Panel** and start **Apache** and **MySQL**.
2.  Open your browser and navigate to `http://localhost/phpmyadmin/`.
3.  Click on the **SQL** tab.
4.  Open the `database.sql` file in this project, copy the entire SQL script, paste it into the phpMyAdmin SQL text box, and click **Go**.
5.  This will instantly create the `speedy_cafe` database and seed it with standard test cabins, default users, inventory, sessions, and historic transactions.

---

### Step 2: Configure the Backend PHP Sync API
1.  Inside your XAMPP installation folder, go to the folder named `htdocs`.
2.  Create a new folder called `speedy_cafe`.
3.  Copy the `api.php` file from the `/public` folder of this project into the newly created `htdocs/speedy_cafe/` directory.
4.  *(Optional)* If you have configured a custom username or password for your local database, edit the following lines at the top of `api.php` to match your credentials:
    ```php
    // --- DATABASE CONFIGURATION ---
    $host = 'localhost';
    $db   = 'speedy_cafe';
    $user = 'root';      // Default XAMPP user
    $pass = '';          // Default XAMPP password is empty
    ```

---

### Step 3: Launch the Frontend Application (Vite)
1.  Open your project directory in **VS Code**.
2.  Open your terminal (`Ctrl + ~`) and install all package dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite local development server:
    ```bash
    npm run dev
    ```
4.  Open the local address printed in the terminal (usually `http://localhost:3000` or `http://localhost:5173`) in your browser.

---

## 🔑 Login Credentials (Admin & Operator Staff)

Once the application is running, use these default credentials to log in:

### **1. Administrator Account** (Full Access)
*   **Username:** `admin`
*   **Password:** `123`

### **2. Operator Staff Account** (Restricted Views)
*   **Username:** `staff`
*   **Password:** `123`

---

## 🔄 How Syncing & Offline Mode Works

Speedy Cafe has a bulletproof hybrid system:
1.  **Sync Offline Mode:** Go to the **Settings** menu. You can toggle **"Sync to MySQL Server"** on/off.
2.  **When Toggle is OFF:** The app runs entirely offline, utilizing **LocalStorage** with mock datasets so you don't even need a database server to test features!
3.  **When Toggle is ON:** Every action (checking in a customer, logging an expense, adding inventory, pausing a cabin) is written instantly to LocalStorage *and* pushed in real-time to your PHP API server (`http://localhost/speedy_cafe/api.php` or a custom live URL). If database connections fail, it will switch to local caching automatically.

---

## 🌐 Moving to Live Production

To host this application live on the web:
1.  **Build Static Assets:** Compile the React app:
    ```bash
    npm run build
    ```
    This generates a `/dist` folder with production-ready HTML, JS, and CSS.
2.  **Upload to PHP/MySQL Web Host:**
    *   Upload `/public/api.php` to your web server (e.g., Hostinger, GoDaddy, or Bluehost).
    *   Import `database.sql` into your live phpMyAdmin instance.
    *   Update database credentials in the production `api.php` file.
    *   Inside the application **Settings** screen, change the **MySQL Server API URL** text field to point to your live URL (e.g., `https://yourdomain.com/api.php`).
3.  **Host Frontend:** Upload the `/dist` files to any static host (such as GitHub Pages, Vercel, Netlify, or your own live domain server).

Enjoy running your cyber cafe business with **Speedy Cafe**!
