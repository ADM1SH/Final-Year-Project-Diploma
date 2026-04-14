# MyPreLove: Secondhand Marketplace App

## Project Overview
**MyPreLove** is a mobile application designed to create a more reliable and trusted secondhand marketplace. Developed as part of the **CPT4212 Final Year Project** at Multimedia University (MMU), the app focuses on solving common issues in existing platforms like fraud, scams, and the misrepresentation of item quality.

## Team Members
*   **Nur Izzah Zahirah Binti Ahmad Shahrizan** (242DC241W2)
*   **Adreana Safiah Binti Ahmad Shafar** (242DC2432A)
*   **Adam Bin Anwar** (243DC245L4)

**Supervisor:** Nashreen Binti Hilman

## Key Features & Objectives
*   **Fraud Prevention:** Prioritizing user safety through a verification system.
*   **Trust Score Mechanism:** Implementing a trust score to build confidence among users.
*   **Item Condition Grading:** A standardized grading system to prevent quality misrepresentation.
*   **User Verification:** Ensuring a secure environment for buyers and sellers.

## Project Scope
*   **Platform:** Mobile Application (Android).
*   **Communication:** Transactions are conducted within private chats.
*   **Language:** English interface.
*   **Timeline:** 6-week development cycle.
*   **Exclusions:** No native iOS version, no integrated payment processing system, and no administrative web dashboard/CMS.

## Problem Statement
Existing secondhand marketplaces in Malaysia (e.g., Carousell, Mudah.my, Facebook Marketplace) face three significant challenges:
1.  **Pervasive Scams:** Lack of reliable verification processes.
2.  **Quality Misrepresentation:** Ambiguous descriptions leading to buyer disappointment.
3.  **Irrelevant Listings:** Platforms are often cluttered with commercial sellers and dropshippers.

## Tech Stack
*   **Design:** Figma, Canva
*   **Development:** Android Studio, Visual Studio Code
*   **Version Control:** GitHub
*   **Hardware:** Android mobile devices

---
*This project is submitted to the Faculty of Computing and Informatics, Multimedia University.*
# Final-Year-Project-Diploma

## Local Setup and Run Instructions

To run this project locally, follow these steps:

### 1. Prerequisites
- Python 3.10 or higher installed on your system.
- `git` installed.

### 2. Clone the Repository
```bash
git clone https://github.com/adam-anwar/Final-Year-Project-Diploma.git
cd Final-Year-Project-Diploma
```

### 3. Set Up Virtual Environment
Create and activate a virtual environment to manage dependencies:
- **macOS/Linux:**
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```
- **Windows:**
  ```bash
  python -m venv venv
  venv\Scripts\activate
  ```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Run Migrations
Set up the database:
```bash
python manage.py migrate
```

### 6. Create Superuser (Optional)
If you need to access the Django admin panel:
```bash
python manage.py createsuperuser
```

### 7. Run the Development Server
```bash
python manage.py runserver
```
The server will be available at `http://127.0.0.1:8000/`.

### 8. Access Admin Panel
Visit `http://127.0.0.1:8000/admin/` and log in with your superuser credentials.
