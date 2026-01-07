# Admin Rent2Reuse Website

## 📌 Project Overview

The **Admin Rent2Reuse Website** is a web-based admin dashboard designed to manage and monitor the Rent2Reuse platform. It provides administrators with tools to handle users, subscriptions, transactions, vouchers, announcements, and support tickets in a centralized system.

This project is built with **Next.js**, **TypeScript**, and **Firebase**, with **EmailJS** used for email notifications. The system focuses on real-time data handling, role-based admin control, and a clean, modern UI suitable for an academic thesis or real-world SaaS admin panel.

---

## 🛠️ Tech Stack

### Frontend

* **Next.js** – React framework for routing, SSR, and performance
* **TypeScript** – Type-safe development
* **Tailwind CSS** – UI styling and responsive layout

### Backend / Services

* **Firebase Authentication** – Admin login and role-based access
* **Cloud Firestore** – Real-time database for all system data
* **Firebase Storage** – Optional image/file uploads
* **EmailJS** – Email notifications (support tickets, updates)

---

## 🔐 Authentication & Roles

### Admin Authentication

* Firebase Authentication (Email/Password)
* Secured admin-only routes
* Environment variables for Firebase config

### Admin Roles Implemented

* **Super Admin** – Full system access
* **Admin** – General management
* **Financial Viewer** – Read-only access to transactions and revenue
* **Content Manager** – Manages announcements and content
* **User Manager** – Handles user accounts
* **Support Admin** – Manages support tickets and messages

Each role limits access to specific pages and actions in the dashboard.

---

## 📊 Dashboard Features

### Overview Dashboard

* Total Users
* Total Revenue
* Conversion Rate
* Active Subscriptions
* Recent Activity Logs

All statistics are fetched dynamically from Firestore.

---

## 👥 User Management

* View registered users
* Display user subscription status
* Track account activity
* Read-only or editable access depending on admin role

---

## 📦 Subscription System

* Firebase-powered subscription plans
* Add, edit, and delete plans
* Auto-generated descriptions based on pricing
* Expiration and status checking
* Subscription usage tracking

---

## 🎟️ Voucher System

* Create and manage discount vouchers
* Voucher expiration logic
* Auto-disable vouchers when fully used
* Voucher selection during checkout (user-side logic ready)

---

## 💳 Transactions

* View all rental transactions
* Display:

  * Item rented
  * Rent price
  * Subscription plan used
  * Transaction date
* Designed for financial transparency

---

## 📢 Announcements

* Admin-created announcements
* Color-coded announcement types
* Create, edit, and delete announcements
* Displayed dynamically in the dashboard

---

## 🎫 Support Ticket System

* Users can submit support tickets
* Admins can:

  * Reply to tickets
  * Track unread tickets
  * Attach images/files
* Email notifications via **EmailJS**

---

## 🧩 Profile Management

* Admin profile page
* Update:

  * Username
  * Password
  * Profile image (local storage based)
* Profile image displayed in sidebar

---

## 📂 Firestore Structure (Simplified)

* `admins`
* `users`
* `subscriptions`
* `transactions`
* `vouchers`
* `announcements`
* `supportTickets`
* `messages`
* `userlog`

Structured for scalability and real-time updates.

---

## ⚙️ Environment Setup

Create a `.env.local` file:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_service_id
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_template_id
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_public_key
```

---

## 🚀 Running the Project

```bash
npm install
npm run dev
```

Access the app at:

```
http://localhost:3000
```

---

## 🎓 Purpose of the System

This system was built as:

* A **capstone/thesis-level admin dashboard**
* A demonstration of **Firebase-integrated SaaS management**
* A scalable admin architecture for a rental platform

---

## 🧠 Future Improvements

* Advanced analytics and charts
* Audit logs per admin action
* Two-factor authentication
* Improved role permission matrix
* Exportable financial reports

---

## 👤 Author

Michael James Labitad

---

## 📄 License

This project is for educational and demonstration purposes.
