# Implementation and Execution Plan

Follow these steps exactly to complete the CarbonOracle India prototype:

## 1. Project Initialization
- Create a `frontend` folder using `npx create-vite@latest frontend --template react-ts`.
- Create a `backend` folder and initialize with `npm init -y` and Typescript (`npm i -D typescript ts-node`).
- Configure a top-level `package.json` with scripts for running both concurrently.

## 2. Database Setup
- In `backend`, run `npm i prisma --save-dev` and `npx prisma init`.
- Update `.env` with the PostgreSQL connection string.
- Create the schema (`Plot`, `Species`, `TreeRecord`, `UploadBatch`) in `schema.prisma`.
- Create `seed.ts` with the 2 plots, 8 species, and 20 sample tree records.
- Run `npx prisma migrate dev --name init` and seed the database.

## 3. Backend Development
- Set up an Express server (`npm i express cors dotenv`).
- Create `src/services/calculationService.ts`: Implement equations for AGB, AGC, BGB, BGC, and CO2e. Note config options like default carbon fraction = 0.47.
- Create `src/services/parserService.ts`: Function to normalize incoming CSV headers and map to fields.
- Create API routes in `src/controllers`:
  - `GET /plots`, `GET /plots/:id`
  - `GET /species`, `POST /species/upload`
  - `GET /trees`, `POST /trees/manual`, `POST /trees/csv`
  - `GET /analytics/dashboard`

## 4. Frontend Foundation
- In `frontend`, install dependencies: `npm i tailwindcss postcss autoprefixer recharts @tanstack/react-table papaparse zod react-hook-form jspdf jspdf-autotable lucide-react react-router-dom axios`.
- Initialize Tailwind CSS and set up the color palette (white, green, charcoal) in `tailwind.config.js`.
- Create a Layout component with a Sidebar and Header.

## 5. Frontend Pages
- **Dashboard**: Fetch KPI data from backend. Use Recharts for the bar charts (AGC vs BGC) and pie charts (Species distribution). Add a Leaflet map placeholder or basic component.
- **Upload CSV**: Create a drag-and-drop zone. Use PapaParse. Add preview, column mapping (handle 'dbh' vs 'diameter_cm'), select Plot, and hit import.
- **Manual Input**: Form with Zod validation showing instant warnings (e.g. DBH > 300) but allowing submission. Real-time preview card for calculated carbon stats.
- **Tree Records Table**: Implement Tanstack Table with filtering/sorting capabilities. Actions for Edit/Delete/Export.
- **Plot Details & Species Master Pages**: Tables and simple CRUD overlays.

## 6. Extras & Demo Readiness
- Create the "How Carbon is Calculated" side panel accessible across the app.
- Ensure the app explicitly badges outputs as "estimated carbon stock and estimated CO₂e".
- Export CSV/PDF buttons on table pages.

Once this is complete, the application will be pitch-ready.
