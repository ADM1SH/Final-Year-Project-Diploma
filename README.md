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

## 🛠️ Major Project Enhancements

The following professional upgrades have been implemented for this final version:

1.  **ABI Trust Model:** Fully automated algorithm calculating seller reputation based on **Integrity** (Verification), **Ability** (Completed Sales), and **Benevolence** (Buyer Ratings).
2.  **Scientific Eco-Logic:** Transitioned from price-based estimation to **Weight-Based Carbon Calculation** (Weight × 2.5kg CO2 saved), requiring physical weight input for all listings.
3.  **Real-Time Architecture:** Integrated **Django Signals** and **Frontend Polling** for instant notifications, chat updates, and red tab-bar badges.
4.  **UI/UX Standardization:** Synchronized item grid layouts across all screens, implemented high-contrast "Negotiable" indicators, and added Grade-specific color branding (A-D).
5.  **Performance Optimization:** Implemented **FlatList Windowing** and **Hardware Acceleration** to ensure smooth scrolling even with 1,000+ items.

---

## 🚀 Presentation Setup (Bulletproof Connection)

Follow these steps exactly on your presentation day to ensure your phone can talk to your laptop, regardless of the Wi-Fi network.

### 1. Start the Backend
In your terminal, navigate to the project root and run:
```bash
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000
```

### 2. Start the Ngrok Tunnel
In a **new terminal**, run:
```bash
ngrok http 8000
```
- Copy the **Forwarding** URL (e.g., `https://abcd-123.ngrok-free.app`).

### 3. Update the App Code
Open `mobile/src/utils/constants.js` and paste your URL into the `NGROK_URL` variable:
```javascript
const NGROK_URL = 'https://abcd-123.ngrok-free.app'; // <--- PASTE YOUR URL HERE
```

### 4. Start the Mobile Client
In another terminal, run:
```bash
cd mobile
npx expo start
```
- Scan the QR code with your phone. **Success!** Your app is now connected via a secure internet tunnel.

---

## 🔑 Demo Credentials

Use these accounts to explore the prototype features.

### 🛡️ Admin Account
| Username | Password | Role |
| :--- | :--- | :--- |
| **`superadmin`** | `password123` | Platform Superuser (Access to Control Center) |

### 👥 User Personas
| Username | Password | Role / Seller Focus |
| :--- | :--- | :--- |
| **`adamanwar`** | `password123` | Primary User (Buyer/Seller) |
| **`ahmadzaki`** | `password123` | Seller (Vintage Satchels) |
| **`farhanrosli`** | `password123` | Seller (Tech & Cameras) |
| **`sitiaminah`** | `password123` | Seller (Luxury & Designer) |
| **`nurulizzah`** | `password123` | Seller (Fashion & Denim) |
| **`adamali`** | `password123` | Seller (General Items) |

---

## 🚀 Quick Start Checklist
1. **Start Backend:** `python manage.py runserver 0.0.0.0:8000`
2. **Start Mobile:** `npx expo start`
3. **Reset Data:** Run `python seed.py` to restore categories and default admin if needed.

---

## 📱 Mobile Client Setup (Expo Go)

The mobile application is built with React Native and Expo. Follow these steps to run it on your physical device.

### 1. Prerequisites
- **Node.js (LTS)** installed on your computer.
- **Expo Go** app installed on your [iOS](https://apps.apple.com/app/expo-go/id982107779) or [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) device.

### 2. Configure Backend IP
Ensure the mobile app can reach your backend. Open `mobile/src/utils/constants.js` and update `BASE_URL` with your computer's local IP address:
```javascript
export const API_CONFIG = {
  BASE_URL: 'http://<YOUR_LOCAL_IP>:8000/api/',
};
```

### 3. Install Dependencies
```bash
cd mobile
npm install
```

### 4. Start Expo Server
```bash
npx expo start
```

### 5. Launch on Device
1. Connect your phone to the **same Wi-Fi network** as your computer.
2. Scan the QR code displayed in the terminal:
   - **Android:** Use the "Scan QR Code" feature in the Expo Go app.
   - **iOS:** Use the system Camera app.

---

## 🛠️ Core Features & Optimizations (Developer Notes)

### 1. Robust Relational Database & Logic
*   **Indexing:** Frequent search fields (`name`, `calculated_grade`, `is_sold`) are indexed for O(1) or O(log n) lookup speeds.
*   **Grading Calculator:** Implemented an objective, point-based system that auto-assigns Grades A-D based on a condition survey (Functionality, Cosmetic, Completeness).
*   **Gallery Support:** Implemented `ItemImage` model allowing multiple high-resolution photos per listing.
*   **Data Integrity:** Uses Django `TextChoices` for Grading (A-D) and auto-calculates grades on every save.

### 2. Security & Trust (ABI Model)
*   **Token Authentication:** Full `/api/register/` and `/api/login/` flow implemented for secure mobile session management.
*   **ABI Trust Algorithm:** Implemented automated `trust_score` calculation using Django Signals.
    *   **Ability:** Score increases with every completed sale.
    *   **Benevolence:** Score scales with the average rating from buyer reviews.
    *   **Integrity:** Verified status provides an immediate trust boost.
*   **Profile Extension:** Links strictly to Django's Auth system. Tracks verification status and trust scores.
*   **Transaction-Locked Reviews:** Reviews are 1-to-1 with Items, meaning a user can only leave a review after a specific transaction is recognized.

### 3. API Performance & Discovery
*   **Query Optimization:** All endpoints use `.select_related()` and `.prefetch_related()` (for images) to fetch all required data in a single SQL query, completely eliminating N+1 performance bottlenecks.
*   **Advanced Filtering:** Integrated `django-filter` to allow the mobile app to query items by `category`, `price`, and `calculated_grade`.
*   **Search & Ordering:** Full-text search on item names/descriptions and flexible ordering by price or date.
*   **CORS Support:** Pre-configured to allow Android Studio emulators and physical devices to connect seamlessly.

---

## 📡 API Documentation (Available Endpoints)
Base URL: `http://127.0.0.1:8000/api/`

*   **`POST /register/`**: Create a new account and receive an auth token.
*   **`POST /login/`**: Authenticate and receive an auth token.
*   **`GET, POST /categories/`**: List and create item categories.
*   **`GET, PUT /profiles/`**: User trust scores and verification statuses.
*   **`GET, POST, PUT /items/`**: Marketplace listings with gallery support.
    *   *Filters available:* `?category=1`, `?calculated_grade=A`, `?min_price=10`, `?search=phone`
*   **`GET, POST, PATCH /transactions/`**: Track sales between buyers and sellers.
*   **`GET, POST /messages/`**: Secure in-app chat between buyers and sellers.
*   **`GET, POST /scam-reports/`**: Flag suspicious listings or fraudulent behavior.
*   **`GET, POST /reviews/`**: Transaction-based feedback.

*Project submitted to the Faculty of Computing and Informatics, Multimedia University (CPT4212).*
