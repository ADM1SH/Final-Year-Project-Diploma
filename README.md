# MyPreLove: Secondhand Marketplace Backend API

## Project Overview
**MyPreLove** is a secure, trust-focused secondhand marketplace designed for mobile users (Android). The project aims to eliminate fraud and subjective condition grading that are prevalent in current platforms like Carousell and Facebook Marketplace.

This repository holds the **Django 6 REST API Backend** serving the mobile client. It has been built with optimized, professional-grade Python code adhering to strict relational database design and API standards.

---

## 💻 Local Setup & Installation Instructions

Follow these steps to set up the environment on your local machine.

### 1. Prerequisites
Ensure you have the following installed:
- **Python 3.10 or higher** (Download from [python.org](https://www.python.org/downloads/))
- **Git**

### 2. Clone the Repository
```bash
git clone <your-repo-link>
cd Final-Year-Project-Diploma
```

### 3. Create a Virtual Environment
This keeps the project dependencies isolated from your system.

**For macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**For Windows (PowerShell):**
```bash
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**For Windows (Command Prompt):**
```bash
python -m venv venv
venv\Scripts\activate
```

### 4. Install Required Packages
Run this command to install all necessary libraries (Django, REST Framework, Pillow for images, etc.):
```bash
pip install -r requirements.txt
```

### 5. Database Setup (Migrations)
Apply the database schema to your local SQLite database:
```bash
python manage.py migrate
```

### 6. Create an Admin Account
Create a "Superuser" to access the web-based management dashboard:
```bash
python manage.py createsuperuser
```

### 7. Start the Development Server
```bash
python manage.py runserver
```
The API will be live at: `http://127.0.0.1:8000/api/`  
The Admin Dashboard will be at: `http://127.0.0.1:8000/admin/`

---

## 🛠️ Core Features & Optimizations (Developer Notes)

### 1. Robust Relational Database & Logic
*   **Indexing:** Frequent search fields (`name`, `calculated_grade`, `is_sold`) are indexed for O(1) or O(log n) lookup speeds.
*   **Grading Calculator:** Implemented an objective, point-based system that auto-assigns Grades A-D based on a condition survey (Functionality, Cosmetic, Completeness).
*   **Gallery Support:** Implemented `ItemImage` model allowing multiple high-resolution photos per listing.
*   **Data Integrity:** Uses Django `TextChoices` for Grading (A-D) and auto-calculates grades on every save.

### 2. Security & Trust (ABI Model)
*   **Token Authentication:** Full `/api/register/` and `/api/login/` flow implemented for secure mobile session management.
*   **Profile Extension:** Links strictly to Django's Auth system. Tracks verification status and trust scores.
*   **Transaction-Locked Reviews:** Reviews are 1-to-1 with Items, meaning a user can only leave a review after a specific transaction is recognized.

### 3. API Performance
*   **Query Optimization:** All endpoints use `.select_related()` and `.prefetch_related()` (for images) to fetch all required data in a single SQL query, completely eliminating N+1 performance bottlenecks.
*   **CORS Support:** Pre-configured to allow Android Studio emulators and physical devices to connect seamlessly.

---

## 📡 API Documentation (Available Endpoints)
Base URL: `http://127.0.0.1:8000/api/`

*   **`POST /register/`**: Create a new account and receive an auth token.
*   **`POST /login/`**: Authenticate and receive an auth token.
*   **`GET, POST /categories/`**: List and create item categories.
*   **`GET, PUT /profiles/`**: User trust scores and verification statuses.
*   **`GET, POST, PUT /items/`**: Marketplace listings with gallery support.
*   **`GET, POST /reviews/`**: Transaction-based feedback.

*Project submitted to the Faculty of Computing and Informatics, Multimedia University (CPT4212).*
