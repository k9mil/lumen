# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lumen is a property intelligence and risk assessment system for insurance companies. It analyzes commercial buildings to detect misuse, regulatory violations, and risk factors through computer vision (Gemini), external data APIs, and weighted risk scoring.

## Tech Stack

- **Backend:** Python 3.11, FastAPI (async), SQLAlchemy 2.0+ (async ORM), SQLite (aiosqlite), Pydantic 2.10+
- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 3.4, Mapbox GL
- **Package Managers:** uv (backend), npm (frontend)
- **External APIs:** Google Maps (Geocoding, Places, Street View), Google Gemini (vision analysis), UK Companies House

## Commands

### Backend (from `backend/`)

```bash
uv sync                                                    # Install dependencies (add --dev for test/lint tools)
uv run python -m uvicorn app.main:app --reload --port 8000 # Dev server
uv run pytest                                              # Run all tests
uv run pytest tests/test_foo.py::test_bar                  # Run a single test
uv run ruff check .                                        # Lint
```

### Frontend (from `frontend/`)

```bash
npm install       # Install dependencies
npm run dev       # Dev server (port 5173)
npm run build     # Type-check + production build (tsc -b && vite build)
npm run lint      # ESLint
```

## Architecture

### Backend (`backend/app/`)

- `main.py` — FastAPI app entry point, CORS config, DB init
- `config.py` — Pydantic settings (env vars prefixed `LUMEN_`)
- `database.py` — SQLAlchemy async engine setup
- `api/` — Route handlers: `buildings.py`, `insurers.py`, `reviews.py`
- `models/` — SQLAlchemy ORM: Building, Insurer, Snapshot, EvidenceItem, Review
- `schemas/` — Pydantic response schemas
- `services/` — Business logic (building queries, data operations)
- `pipeline/` — Data enrichment pipeline (see below)

### Pipeline (`backend/app/pipeline/`)

Sequential orchestration with semaphore (max 5 concurrent runs):

1. **Geocoding** → lat/lng from address (Google Geocoding API)
2. **Companies House** → Company info, SIC codes (UK API)
3. **Google Places** → Business details, reviews
4. **Street View** → 4-directional images → Gemini vision classification
5. **Licensing** → Nearby licensed premises (GeoJSON spatial lookup)
6. **Scoring** → Weighted evidence items → risk score (0-100) → tier (low/medium/high/critical)
7. **Change Detection** → Compare current vs previous snapshot

Evidence signal weights: CV_CLASSIFICATION (40), SIC_MISMATCH (25), LICENSING (20), KEYWORD_HIT (15).

### Frontend (`frontend/src/`)

Single-page React app, state via hooks (no external state manager). Key components: MapPanel (Mapbox GL), BuildingsTable, BuildingDrawer (detail panel), SearchFilterBar, PortfolioMetrics.

### Key Design Patterns

- All I/O is async/await (database, HTTP clients)
- Immutable snapshots: each pipeline run creates a historical record
- Pipeline runs are triggered asynchronously (202 responses)
- FastAPI dependency injection for DB sessions
- CORS: frontend on :5173, backend on :8000

## Environment Setup

Copy `.env.example` to `.env` and configure API keys (GOOGLE_API_KEY, COMPANIES_HOUSE_API_KEY). Database defaults to `sqlite+aiosqlite:///./lumen.db`.

## Linting Config

- Backend: Ruff (line-length: 100)
- Frontend: ESLint with typescript-eslint
- Backend tests: pytest with asyncio mode "auto"
