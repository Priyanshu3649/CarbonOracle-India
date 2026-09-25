# 🌿 CarbonOracle India

> **A full-stack MRV (Monitoring, Reporting & Verification) platform for forest carbon estimation — powered by allometric science and anchored on-chain.**

CarbonOracle India is a decision-support tool for estimating forest carbon stocks using scientifically validated allometric biomass equations. It supports field data ingestion via CSV uploads or manual entry, provides rich analytics dashboards, and records verified carbon reports immutably on the **Polygon Amoy blockchain**.

> ⚠️ **Disclaimer**: This is a prototype estimation and decision-support tool. It is **not** a formal carbon credit issuance engine.

---

## 📸 Features at a Glance

| Feature | Description |
|---|---|
| 🖥️ **Dashboard** | KPI cards (Total Carbon, CO₂e), species & location breakdown charts |
| 📤 **CSV Bulk Upload** | Drag-and-drop rover telemetry ingestion via PapaParse with column mapping |
| ✍️ **Manual Entry** | Real-time carbon preview form with Zod validation |
| 📋 **Tree Records** | TanStack-powered table with filtering, sorting, and PDF/CSV export |
| 🗺️ **Plot Management** | Geo-referenced plots with interactive Leaflet maps |
| 🔬 **Species Master** | Species database with wood density lookup from the GWDDA dataset |
| 🔗 **Blockchain Reports** | Immutable on-chain carbon reports anchored to Polygon Amoy via Ethers.js |
| 🛒 **Carbon Marketplace** | Browse and retire tokenised carbon credits |
| 🔐 **Authentication** | JWT-based login with bcrypt password hashing |
| 📡 **WebSocket** | Real-time calculation updates streamed to the frontend |

---

## 🏗️ Architecture

```
CarbonOracle-main/
├── frontend/              # React 19 + TypeScript + Vite + Tailwind CSS
│   └── src/
│       ├── pages/         # Dashboard, ManualEntry, UploadCsv, TreeRecords,
│       │                  # Marketplace, MyCredits, MyProjects, BlockchainReports…
│       ├── components/    # Shared UI components
│       └── lib/           # API client, calculation helpers
│
├── backend/               # Express 5 + Node.js + Prisma ORM + TypeScript
│   ├── src/
│   │   ├── routes/        # analytics, auth, blockchain, marketplace,
│   │   │                  # plots, species, trees
│   │   ├── services/      # Calculation & parser services
│   │   ├── websocket.ts   # WS server for real-time updates
│   │   └── index.ts       # App entry point
│   ├── prisma/            # Schema & migrations
│   └── blockchain/        # Hardhat project + Solidity smart contracts
│       └── contracts/
│           └── CarbonOracleRegistry.sol
│
├── docker-compose.yml     # PostgreSQL 15 database
└── gwddagg_v2.2_species.csv  # Global Wood Density Database (GWDDA v2.2)
```

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

### Frontend
| Technology | Purpose |
|---|---|
| React 19 + TypeScript | UI framework |
| Vite 5 | Build tool & dev server |
| Tailwind CSS 3 | Utility-first styling |
| Recharts | Data visualisation charts |
| TanStack Table v8 | Advanced data tables |
| React Leaflet | Interactive maps |
| PapaParse | CSV parsing in-browser |
| React Hook Form + Zod | Form management & validation |
| jsPDF + jspdf-autotable | PDF export |
| Lucide React | Icon library |
| Axios | HTTP client |
| Vite PWA | Progressive Web App support |

### Backend
| Technology | Purpose |
|---|---|
| Express 5 + Node.js | REST API server |
| Prisma ORM 6 | Database access layer |
| MySQL / PostgreSQL | Relational database |
| JWT + bcryptjs | Authentication |
| ws | WebSocket server |
| Ethers.js v6 | Blockchain interaction |
| Hardhat 3 | Smart contract toolchain |
| TypeScript 5 | Type safety |

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- Docker & Docker Compose (for PostgreSQL)
- An [Alchemy](https://dashboard.alchemy.com) API key (for blockchain features)

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

This starts a **PostgreSQL 15** instance on port `5432`.

---

### 3. Configure the Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/carbonoracle"
JWT_SECRET=your_strong_jwt_secret

# Blockchain (optional — required for on-chain reports)
POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
BLOCKCHAIN_PRIVATE_KEY=0x_YOUR_PRIVATE_KEY
CARBON_ORACLE_CONTRACT_ADDRESS=0x_DEPLOYED_CONTRACT_ADDRESS
```

---

### 4. Install & Migrate Backend

```bash
npm install
npx prisma migrate dev
npx prisma db seed     # Seeds plots, species, and sample tree records
npm run dev            # Starts API server on http://localhost:5010
```

---

### 5. Install & Start Frontend

Open a new terminal:

```bash
cd frontend
npm install
npm run dev            # Starts Vite dev server on http://localhost:5173
```

Visit **[http://localhost:5173](http://localhost:5173)** in your browser.

---

### 6. (Optional) Deploy the Smart Contract

```bash
cd backend
npm run compile:contract    # Compile Solidity
npm run deploy:contract     # Deploy to Polygon Amoy
```

After deployment, copy the contract address into your `.env`:
```env
CARBON_ORACLE_CONTRACT_ADDRESS=0x_YOUR_DEPLOYED_ADDRESS
```

---

## 🌐 API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/login` | Authenticate user, returns JWT |
| `GET` | `/plots` | List all monitored plots |
| `GET` | `/plots/:id` | Get single plot details |
| `GET` | `/species` | List species master data |
| `GET` | `/trees` | List all tree records |
| `POST` | `/trees/manual` | Add a single tree record |
| `POST` | `/trees/csv` | Bulk upload tree records from CSV |
| `GET` | `/analytics/dashboard` | Aggregated KPIs for dashboard |
| `GET` | `/blockchain` | Fetch on-chain carbon reports |
| `POST` | `/blockchain/anchor` | Anchor a carbon report on-chain |
| `GET` | `/marketplace` | Browse available carbon credits |

---

## 📂 Data

The repository includes **`gwddagg_v2.2_species.csv`** — the Global Wood Density Database (GWDDA v2.2) — used to look up wood density (WD) values for species not manually configured, enabling more accurate AGB estimates.

---

## 🗺️ Roadmap

- [ ] Production PostgreSQL deployment guide
- [ ] Role-based access control (Admin / Researcher / Auditor)
- [ ] Satellite imagery integration for automated canopy estimation
- [ ] IPFS-pinned PDF reports linked to on-chain records
- [ ] Multi-project portfolio dashboard
- [ ] Export reports in Gold Standard / Verra VCS format

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 👤 Author

**Priyanshu Pandey**  
[GitHub @Priyanshu3649](https://github.com/Priyanshu3649)
