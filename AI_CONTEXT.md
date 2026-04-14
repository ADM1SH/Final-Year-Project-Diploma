# AI CONTEXT - PERSISTENT PROJECT DATABASE

> **IMPORTANT FOR AI AGENTS:** Read this file entirely before taking any action. This file serves as the primary source of truth for project state, architectural decisions, and conversation history. You are REQUIRED to update this file after every significant interaction or decision to ensure continuity across sessions.

---

## 1. Project Identity & Purpose
- **Project Name:** MyPreLove
- **Type:** Django Backend for an Android Marketplace App (FYP).
- **Goal:** Solve fraud and quality misrepresentation in secondhand markets using trust scores and standardized grading.

## 2. Conversation & Decision Log

### [2026-04-13] Interaction: API Implementation
- **Action:** Implemented full REST API using Django REST Framework (DRF).
- **Work Performed:**
  - Configured `corsheaders` for cross-platform (Android) access.
  - Created `api/serializers.py` for all models.
  - Implemented `api/views.py` using DRF `viewsets`.
  - Defined API routing in `api/urls.py` and `core/urls.py`.
- **Status:** All core CRUD endpoints are live. (Git: Models committed, API code pending commit/push).
- **Next Steps (Enhancements):**
  1. Add `image` field to `Item` model (Critical for marketplace).
  2. Implement Token Authentication for mobile login.
  3. Add Search/Filter capabilities.
  4. Build the "Grading Calculator" logic.

## 3. Current Project State
- **Backend:** Django 6.0.3 with Django REST Framework.
- **API Endpoints:**
  - `/api/categories/`
  - `/api/items/`
  - `/api/profiles/`
  - `/api/reviews/`
- **Features Implemented:**
  - User Profiles with Trust Scores.
  - Item Grading System (Grades A-D).
  - Full CRUD REST API for all models.

## 4. Proposed Next Steps (Awaiting Selection)
1. **API Development:** Implement Django REST Framework Serializers and Views for CRUD operations.
2. **Authentication:** Set up Token/JWT authentication for Android mobile access.
3. **Seed Data:** Create a migration or script to populate initial categories and items.

---
*Note: Always append new interactions to the "Conversation & Decision Log" section.*
