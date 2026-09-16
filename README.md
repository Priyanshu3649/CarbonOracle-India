# CarbonOracle India - Phase 1 Prototype

This is a prototype web application for carbon estimation based on standard allometric biomass equations. It allows users to ingest tree data natively via manual entry and CSV bulk upload (mimicking rover data). 

**It is a decision-support and estimation tool, not a formal carbon credit issuance engine.**

## Features
- **Dashboard**: High-level key performance indicators (Total Carbon, CO2e), visual breakdown by species and location.
- **CSV Data Ingest**: Processes rover telemetry natively using PapaParse, validating inputs and scaling for volume.
- **Manual Data Entry**: Intelligent form allowing researchers to see real-time carbon calculations.
- **Record Management**: A Tanstack-powered tabular view of all stored trees with PDF export capabilities.

## Tech Stack
- Frontend: React + TypeScript + Vite + Tailwind CSS + Recharts
- Backend: Express + Node.js + Prisma ORM + TypeScript
- Database: SQLite (for zero-configuration demo setup, easily upgradeable to Postgres)

## Science & Calculation Logic
- **Above-Ground Biomass (AGB)**: `exp(-2.409 + 0.9522 * ln(DBH² * H * WD))`
- **Above-Ground Carbon (AGC)**: `AGB * 0.47`
- **Below-Ground Biomass (BGB)**: `AGB * 0.26`
- **Below-Ground Carbon (BGC)**: `BGB * 0.47`
- **Total Carbon**: `AGC + BGC`
- **CO₂e**: `Total Carbon * 3.667`

## Setup Instructions

### 1. Start the Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### 2. Start the Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.
# CarbonOracle
# CarbonOracle-India
# CarbonOracle-India
# CarbonOracle-India
# CarbonOracle-India
