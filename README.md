# 🌿 CarbonOracle India

> **A full-stack MRV (Monitoring, Reporting & Verification) platform for forest carbon estimation — powered by allometric science, on-device Edge Computer Vision (VisionTrack), and anchored on-chain.**

CarbonOracle India is a decision-support platform for estimating forest carbon stocks using scientifically validated allometric biomass equations. It supports field data ingestion via Edge AI mobile telemetry (**VisionTrack**), CSV bulk uploads, or manual entry, provides rich analytics dashboards, and records verified carbon reports immutably on the **Polygon Amoy blockchain**.

> ⚠️ **Disclaimer**: This is a prototype estimation and decision-support tool. It is **not** a formal carbon credit issuance engine.

---

## 📸 Features at a Glance

| Feature | Description |
|---|---|
| 🎯 **Edge AI VisionTrack** | On-device Android computer vision app powered by YOLOv8 TFLite & CameraX for live detection & measurement |
| 🖥️ **Dashboard** | KPI cards (Total Carbon, CO₂e), species & location breakdown charts |
| 📤 **CSV Bulk Upload** | Drag-and-drop rover & drone telemetry ingestion via PapaParse with automatic column mapping |
| ✍️ **Manual Entry** | Real-time carbon calculation preview form with Zod validation |
| 📋 **Tree Records** | TanStack-powered table with search, sorting, and PDF/CSV export |
| 🗺️ **Plot Management** | Geo-referenced plots with interactive Leaflet maps |
| 🔬 **Species Master** | 17,260+ tree species database with wood density lookup from GWDDA v2.2 |
| 🔗 **Blockchain Reports** | Immutable on-chain carbon reports anchored to Polygon Amoy via Ethers.js |
| 🛒 **Carbon Marketplace** | Browse and retire tokenised carbon credits |
| 🔐 **Authentication** | JWT-based login with bcrypt password hashing |
| 📡 **WebSocket** | Real-time calculation updates & live rover streaming to the frontend |

---

## 🏗️ Architecture

```
CarbonOracle-main/
├── VisionTrack/           # Mobile Edge AI App (Android, Kotlin, YOLOv8 TFLite, CameraX)
│   ├── app/               # Jetpack Compose UI, Room DB, Hilt DI, ML Analyzer
│   ├── ml_pipeline/       # YOLOv8 export & quantization scripts
│   └── datasets/          # COCO dataset & bounding box training samples
│
├── frontend/              # Web App (React 19 + TypeScript + Vite + Tailwind CSS)
│   └── src/
│       ├── pages/         # Dashboard, ManualEntry, UploadCsv, TreeRecords,
│       │                  # Marketplace, MyCredits, MyProjects, BlockchainReports…
│       ├── components/    # Shared UI components & SearchableSelect
│       └── lib/           # API client, calculation helpers
│
├── backend/               # Express 5 + Node.js + Prisma ORM + TypeScript
│   ├── src/
│   │   ├── routes/        # analytics, auth, blockchain, marketplace,
│   │   │                  # plots, species (17k+ GWDDA dataset search), trees
│   │   ├── services/      # Allometric calculation & parser services
│   │   ├── websocket.ts   # WS server for real-time edge telemetry
│   │   └── index.ts       # App entry point
│   ├── prisma/            # Schema, migrations & GWDDA 17,260-species seed scripts
│   └── blockchain/        # Hardhat project + Solidity smart contracts
│       └── contracts/
│           └── CarbonOracleRegistry.sol
│
├── docker-compose.yml     # PostgreSQL 15 database
└── gwddagg_v2.2_species.csv  # Global Wood Density Database (GWDDA v2.2)
```

---

## 🎯 VisionTrack (Mobile Edge AI Engine)

**VisionTrack** is the mobile computer vision capture module for CarbonOracle India:

* **Framework**: Android 13+ (Kotlin 2.0, Jetpack Compose, Material 3)
* **ML Model**: **YOLOv8n TensorFlow Lite** (INT8 quantized, ~25ms inference latency on ARM64)
* **Camera Input**: CameraX `ImageAnalysis` (RGBA_8888, zero-allocation frame buffer)
* **Local Persistence**: Room DB session logging with rolling FPS/Latency HUD
* **Telemetry Streaming**: Real-time DBH & height measurement payload delivery to backend WebSockets

---

## 🧮 Carbon Calculation Science

All biomass estimates use the **Chave et al. pantropical allometric equation**:

| Variable | Formula |
|---|---|
| **Above-Ground Biomass (AGB)** | `exp(−2.409 + 0.9522 × ln(DBH² × H × WD))` kg |
| **Above-Ground Carbon (AGC)** | `AGB × 0.47` |
| **Below-Ground Biomass (BGB)** | `AGB × 0.26` (root-to-shoot ratio) |
| **Below-Ground Carbon (BGC)** | `BGB × 0.47` |
| **Total Carbon** | `AGC + BGC` |
| **CO₂ Equivalent (CO₂e)** | `Total Carbon × 3.667` |

> Carbon fraction: **0.47** (IPCC Tier 1 default)  
> All outputs are labelled as **estimated** carbon stock and CO₂e.

---

## 🔗 Blockchain Layer

- **Network**: Polygon Amoy Testnet (`chainId: 80002`)
- **Smart Contract**: `CarbonOracleRegistry.sol` — records plot ID, tree count, carbon totals, methodology version, and calculation version hash
- **Framework**: Hardhat 3 + Ethers.js v6
- **Explorer**: [amoy.polygonscan.com](https://amoy.polygonscan.com)

---

## 🛠️ Tech Stack

### Web & Mobile Stack
| Layer | Technology | Purpose |
|---|---|---|
| **Mobile AI** | Android + Kotlin + YOLOv8 TFLite | Real-time camera object detection & telemetry |
| **Frontend** | React 19 + TypeScript + Vite | Web dashboard UI |
| **Styling** | Tailwind CSS 3 | Modern glassmorphic styling |
| **Visualisation** | Recharts + Leaflet | Analytics & geo-referenced plot mapping |
| **Backend API** | Express 5 + Node.js + TypeScript | REST & WebSocket server |
| **Database** | PostgreSQL 15 + Prisma ORM 6 | Relational database & seed pipeline |
| **Dataset** | GWDDA v2.2 (17,260 species) | Wood density reference dataset |
| **Blockchain** | Solidity + Hardhat 3 + Ethers.js v6 | Polygon Amoy proof-of-integrity ledger |

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- Docker & Docker Compose (for PostgreSQL)
- Android Studio Ladybug / Koala (for VisionTrack app compilation)

---

### 1. Clone the Repository

```bash
git clone https://github.com/Priyanshu3649/CarbonOracle-India.git
cd CarbonOracle-India
```

---

### 2. Start the Database

```bash
docker-compose up -d
```

---

### 3. Configure & Seed the Backend

```bash
cd backend
cp .env.example .env

npm install
npx prisma migrate dev
npx prisma db seed           # Seeds plots, default species, and sample tree records
npx ts-node prisma/seed-gwdd.ts  # Seeds all 17,260 GWDDA species
npm run dev                  # Starts server on http://localhost:5010
```

---

### 4. Install & Start Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev                  # Starts Vite dev server on http://localhost:5173 (or 5174)
```

Visit **[http://localhost:5174](http://localhost:5174)** in your browser.

---

### 5. (Optional) Run VisionTrack Mobile App

Open the `VisionTrack` directory in **Android Studio**:

```bash
# Open VisionTrack folder in Android Studio and run on an Android Device / Emulator (API 26+)
```

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 👤 Author

**Priyanshu Pandey**  
[GitHub @Priyanshu3649](https://github.com/Priyanshu3649)
