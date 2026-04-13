---
trigger: always_on
---

MANDATORY RULE — ACTIVE THROUGHOUT THE ENTIRE SESSION:

You are maintaining a living project documentation file called `PROJECT_CONTEXT.md`
located at the root of the project.

This is a FULL-STACK AI Proctoring Platform with:
- Frontend: React (or Next.js)
- Backend: FastAPI
- Database: MongoDB
- Realtime + Detection: WebRTC + Browser APIs
- Storage: Local / Cloud (recordings)
- Goal: Secure AI-powered interview monitoring system

Every time you CREATE, MODIFY, or DELETE ANY file,
you MUST update PROJECT_CONTEXT.md BEFORE proceeding.

DO NOT skip this under any circumstance.

If something is unclear → ASK QUESTIONS before proceeding.
DO NOT assume.

=======================================================
PROJECT_CONTEXT.md STRUCTURE (INITIALIZE FIRST)
=======================================================

# AI Proctoring Platform — Project Context & Change Log

## Project Overview
- Name: AI Proctoring Platform
- Type: Secure Interview Monitoring System
- Frontend: React / Next.js
- Backend: FastAPI
- Database: MongoDB
- Realtime: WebRTC
- Started: [current date]

---

## Architecture Summary
- Backend Structure:
  - app/
    - api/
    - services/
    - models/
    - core/
    - utils/
- Frontend Structure:
  - components/
  - pages/
  - hooks/
  - services/
- Database: MongoDB (proctoring_db)
- Recording Format: WebM
- Detection System:
  - Tab switch detection
  - Face absence detection
  - Multiple display detection
  - Network anomaly detection

---

## Modules

| Module | Description |
|--------|------------|
| Auth | Login / Session management |
| Interview Session | Start/Stop interview |
| Proctoring Engine | Detect violations |
| Recording | Video/audio recording |
| Recruiter Dashboard | Review candidates |
| Logs & Violations | Store suspicious activity |

---

## File Registry

| # | File Path | Type | Status | Description |
|---|-----------|------|--------|-------------|

---

## API Endpoint Registry

| Method | Endpoint | File | Description | Status |
|--------|----------|------|-------------|--------|

---

## Database Schema

| Collection | Fields | Description | Status |
|------------|--------|-------------|--------|

---

## Detection Rules Registry

| Rule Name | Trigger | Action | Status |
|-----------|--------|--------|--------|

---

## Service Registry

| Service | Methods | Description | Status |
|---------|--------|-------------|--------|

---

## Environment Variables

| Key | Purpose |
|-----|--------|

---

## Change Log

| Step | Action | File | Details |
|------|--------|------|---------|

---

## Known Issues / TODOs

| # | Issue | Priority |
|---|------|----------|

---

## Integration Notes

### MongoDB
- Connection URI must be configured
- Database: proctoring_db

### Media Storage
- Store recordings in `/recordings/` or cloud

### Browser Permissions Required
- Camera
- Microphone
- Screen Capture

---

=======================================================
STRICT WORKING RULES
=======================================================

RULE 1 — FILE CREATION
- Add entry in File Registry (✅ Created)
- Add Change Log entry (Step-N)
- If API → update API registry
- If DB schema → update Database Schema
- If detection logic → update Detection Rules

RULE 2 — FILE MODIFICATION
- Update status to ✏️ Modified
- Log exact change in Change Log

RULE 3 — FILE DELETION
- Mark ❌ Deleted
- Log in Change Log

RULE 4 — STEP TRACKING
Use:
Step-1, Step-2, Step-3...

RULE 5 — NO ASSUMPTIONS
If unclear:
→ STOP
→ ASK USER

RULE 6 — CONTEXT MEMORY
- Always maintain system-wide understanding
- Never overwrite logic blindly
- Maintain compatibility with existing modules

RULE 7 — CODE QUALITY
- Follow clean architecture
- Use modular structure
- Avoid duplication
- Use meaningful naming

RULE 8 — SECURITY (CRITICAL)
- Never expose sensitive data
- Validate all APIs
- Handle cheating attempts strictly

RULE 9 — BEFORE WRITING CODE
ALWAYS CONFIRM:
- Feature scope
- Affected modules
- DB changes required

=======================================================
FINAL SUMMARY (ONLY AFTER FULL BUILD)
=======================================================

## Final Summary
- Total Files Created: X
- Total APIs: X
- Total DB Collections: X
- Total Detection Rules: X
- Run Backend: uvicorn app.main:app --reload
- Run Frontend: npm run dev

