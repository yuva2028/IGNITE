# CycloneGuard AI 🌪️🛡️
### Track 5: Cyclone Impact & Infrastructure Vulnerability Forecaster

> **An advanced, AI-driven disaster intelligence and vulnerability forecasting platform designed to anticipate cyclone landfalls, quantify cascading critical infrastructure vulnerabilities, optimize multi-agency evacuations, and provide scientifically validated crisis intelligence.**

---

## 🌟 Key Capabilities & Modules

1. **Interactive Geospatial Cyclone Tracking & Leaflet GIS**
   - High-fidelity geospatial map displaying active cyclone tracks, forecasted cone of uncertainty, wind radii (34kt / 50kt / 64kt), and dynamic precipitation swaths.
   - Real-time layer switching between satellite, topographic, and street terrain with critical infrastructure overlays.

2. **Critical Infrastructure Vulnerability Forecaster**
   - Multi-sector vulnerability quantification across:
     - **Healthcare**: Hospital capacity, generator flood risks, ICU contingency.
     - **Energy & Power**: Substations, transmission corridors, backup power grids.
     - **Telecommunications**: Cellular towers, fiber hubs, backup satellite terminals.
     - **Transportation**: Evacuation highways, railway lines, bridges susceptible to storm surge.
     - **Water & Sanitation**: Treatment plants, drainage pumps, and potable supply networks.

3. **Physics-Informed Real-Time Simulation Engine**
   - Interactive cyclone scenario modeling adjusting landfall coordinates, forward speed, central pressure, and storm surge height.
   - Real-time cascading failure simulation predicting compound disruption across power, road, and healthcare systems.

4. **Intelligent Evacuation Planning & Safe Routing**
   - Hazard-aware routing algorithms calculating safest transit corridors avoiding submerged roads.
   - Shelter capacity optimization, demographic exposure assessment, and emergency resource dispatching.

5. **Multi-Agency Coordination & Incident Dispatch**
   - Role-tailored dashboards for NDRF, District Disaster Management Authorities (DDMA), Emergency Medical Services, and Power Grid operators.
   - Incident lifecycle tracking, resource allocation tables, and priority dispatch queues.

6. **AI Emergency Decision Copilot**
   - Conversational AI assistant trained on disaster management protocols (NDMA, IMD, WMO).
   - Generates instant situational reports, resource demand projections, and tactical recommendations for crisis commanders.

7. **Scientific & Historical Model Validation**
   - Empirical validation pipeline testing model predictions against historical cyclone records (e.g., Cyclone Fani 2019, Cyclone Amphan 2020, Cyclone Biparjoy 2023, Cyclone Michaung 2023).
   - Real, un-fabricated quantitative validation metrics: Precision, Recall, F1 Score, ROC-AUC, Spatial IoU, and MAE/RMSE.
   - Full methodology disclosure, limitation transparency, and exportable verification reports.

---

## 🏗️ System Architecture

```
CycloneGuard AI
├── Frontend (React 19 + TypeScript + Vite)
│   ├── src/components/map/        # Leaflet GIS, Layers, Hazard Overlays
│   ├── src/components/analytics/  # Vulnerability & Exposure Charts (Recharts)
│   ├── src/components/simulation/ # Interactive Storm Surge & Wind Simulators
│   ├── src/pages/                 # Full-featured Operations & Validation Views
│   └── src/services/              # API Clients & Real-Time Data Handlers
│
├── Backend (FastAPI + Python 3)
│   ├── backend/app/api/           # REST Endpoints (Risk, Infra, Simulation)
│   ├── backend/app/services/      # Cascading Failure & Geo-processing logic
│   └── backend/app/schemas/       # Pydantic Schemas & DTOs
│
└── Machine Learning Engine (scikit-learn)
    ├── ml/preprocessing/          # Meteorological & Elevation Feature Pipelines
    ├── ml/training/               # Model Training & Cross-Validation
    ├── ml/evaluation/             # Precision, Recall, ROC-AUC, IoU Metrics
    └── ml/models/                 # Serialized Artifacts (.joblib & metadata)
```

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Leaflet, React-Leaflet, Lucide React, Recharts
- **Backend**: Python 3.13, FastAPI, Uvicorn, Pydantic
- **Machine Learning**: Scikit-Learn, Pandas, NumPy, Joblib
- **Data & GIS**: GeoJSON, OpenStreetMap, CartoDB Dark Matter, IMD Historical Cyclone Trajectories

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- **Node.js** (v18+ or v20+)
- **Python** (3.10+)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/cycloneguard-ai.git
cd cycloneguard-ai
```

### 2. Frontend Setup (React + Vite)
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```
The application will launch at `http://localhost:5173`.

### 3. Backend & ML Setup (Optional for Full API Mode)
```bash
# Navigate to backend
cd backend

# Install dependencies (or run in your virtual environment)
pip install fastapi uvicorn pydantic scikit-learn pandas numpy joblib

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
API Documentation will be accessible at `http://localhost:8000/docs`.

---

## 📊 Scientific Methodology & Evaluation

CycloneGuard AI's vulnerability engine adheres to strict data integrity standards:
- **Baseline Models**: Random Forest Classifiers and Multi-output Regressors trained on simulated and historical coastal vulnerability matrices.
- **Metrics Computation**: Precision, Recall, and Spatial IoU computed directly from ground-truth observed impact maps without fabricating synthetic performance figures.
- **Auditable Metrics**: Complete transparent validation results can be audited and exported directly in the **Historical Analysis** dashboard within the web platform.

---

## 👥 Submission Information
- **Track**: Track 5 — Cyclone Impact & Infrastructure Vulnerability Forecaster
- **Project**: CycloneGuard AI
