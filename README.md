# AgriMitra (KrishiSeva) 🌾
### Digital Agriculture Intelligence Platform & Comprehensive Indian Agronomy Case Study

AgriMitra is a comprehensive, production-grade agricultural intelligence application and case study engineered for India's 140+ million farmers. It features hyper-localized agronomic advisory covering **all 28 Indian States and 8 Union Territories**, cultivation practices for **all major crop categories**, an interactive **Crop Doctor problem diagnostic solver**, a multi-intent **Krishi AI Q&A Advisor**, and an **agronomic fertilizer calculator**.

---

## 🌟 Key Application Features

1. **Interactive Case Study**: Publication-grade executive case study document outlining agrarian challenges, multi-tier architecture, user personas, and economic impact metrics.
2. **Krishi AI Q&A Advisor**: Natural-language agricultural question-and-answer assistant powered by ICAR guidelines. Features speech synthesis audio readout, prompt suggestions, and state/crop context filtering.
3. **India State & Area Explorer**: Complete database of all 28 States & 8 Union Territories detailing agro-climatic zones, soil composition, rainfall, major districts, Kharif/Rabi/Zaid crop schedules, and state-specific agricultural advisories.
4. **Comprehensive Crop Encyclopedia**: Covers Cereals, Pulses, Oilseeds, Commercial/Cash crops, Vegetables, Fruits, Spices, and Plantation crops with optimal soil pH, climate, seed rates, spatial geometry, N-P-K schedules, critical irrigation milestones, and harvest indicators.
5. **Crop Doctor (Diagnostic Problem Solver)**: Step-by-step symptom diagnostics covering 40+ crop pests, fungal/bacterial/viral diseases, and nutrient deficiencies. Delivers dual solutions: **precision chemical treatments** (with exact dosages) and **eco-friendly organic remedies** (Neem, Jeevamrut, bio-control agents).
6. **Government Schemes & Subsidies**: Clear guides for PM-KISAN, PMFBY crop insurance, PM-KUSUM solar pumps, Kisan Credit Card (KCC), Soil Health Cards, PKVY, and e-NAM with eligibility criteria and direct helplines.
7. **Fertilizer & Seed Rate Calculator**: Interactive tool computing exact commercial bag requirements (Urea, DAP, MOP, Zinc) and application schedules based on farm acreage.

---

## 📁 Project Directory Structure

```
Agriculture/
├── CASE_STUDY.md                 # 3,500+ Word Comprehensive Agricultural Case Study
├── README.md                     # Documentation & Quick Start Guide
├── start.bat                     # 1-Click Windows Launcher (Starts Backend & Browser)
├── start.ps1                     # PowerShell Launch Script
├── backend/
│   ├── server.ps1                # Native Windows PowerShell HTTP REST Server (Zero deps)
│   ├── server.py                 # Python 3 Standard Library REST Server (Zero deps)
│   ├── server.js                 # Node.js REST Server (Zero deps)
│   └── data/
│       ├── states.json           # All 28 Indian States + 8 Union Territories
│       ├── crops.json            # 30+ Crops with Cultivation Packages
│       ├── problems.json         # 40+ Pests, Pathologies & Nutrient Remedies
│       ├── schemes.json          # Central & State Agricultural Schemes
│       ├── qa_knowledge.json     # Multi-Intent Q&A Repository
│       └── case_study.json       # Case Study Data & Architecture Schema
└── frontend/
    ├── index.html                # Responsive Single-Page Application (7 Full Modules)
    ├── css/
    │   └── styles.css            # Modern AgriTech Design System & Responsive Grids
    ├── js/
    │   ├── data.js               # Embedded 135 KB Knowledge Engine (Offline Fallback)
    │   ├── api.js                # Dynamic REST API Client with Automatic Failover
    │   └── app.js                # UI Controller, Voice Readout, Reactive State
    └── assets/
        └── favicon.svg           # High-resolution Agriculture Sheaf & Leaf Icon
```

---

## 🚀 How to Run the Application

The platform is designed with a **zero-dependency, hybrid offline-first architecture**. You can launch it using any of the following methods:

### Method 1: 1-Click Windows Batch Launcher (Recommended)
Simply double-click the **`start.bat`** file in the root folder:
- It launches the native PowerShell REST server on port `8080`.
- It automatically opens `http://127.0.0.1:8080/` in your default browser.

### Method 2: Direct Browser Launch (100% Offline / Standalone)
No server required! Simply double-click **`frontend/index.html`** in Windows Explorer:
- The application automatically detects offline/local file mode.
- The embedded 135 KB knowledge repository (`js/data.js`) powers all features (search, AI Q&A, diagnostics, state profiles, crop packages, and calculators) directly inside your web browser.

### Method 3: Using PowerShell Server
Open PowerShell in the project directory and run:
```powershell
powershell -ExecutionPolicy Bypass -File backend\server.ps1 -Port 8080
```
Then navigate to `http://127.0.0.1:8080/` in your web browser.

### Method 4: Using Python 3 (If Python is installed)
```bash
python backend/server.py
```
Then navigate to `http://127.0.0.1:8080/`.

### Method 5: Using Node.js (If Node is installed)
```bash
node backend/server.js
```
Then navigate to `http://127.0.0.1:8080/`.

---

## 📡 REST API Reference

When running the backend server, the following REST endpoints are available:

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Server health check and timestamp |
| `/api/case-study` | `GET` | Case study structure, challenges, and impact metrics |
| `/api/states` | `GET` | List all 28 States and 8 Union Territories |
| `/api/states/:id` | `GET` | Get detailed state profile, soils, rainfall, districts, and advisory |
| `/api/crops` | `GET` | List all crops across 8 categories |
| `/api/crops/:id` | `GET` | Get comprehensive cultivation package, spacing, NPK, and yield |
| `/api/problems` | `GET` | Full directory of crop diseases, pests, and deficiencies |
| `/api/problems/diagnose` | `POST` | Diagnose problem based on `{ crop, part, symptom }` |
| `/api/chat` | `POST` | Agricultural AI Advisor answering `{ question, state, crop }` |
| `/api/schemes` | `GET` | List government schemes (PM-KISAN, PMFBY, PM-KUSUM, KCC) |
| `/api/calculator/fertilizer` | `POST` | Calculate fertilizer requirements for `{ crop, acres }` |

---

## 🛡️ Agronomic Guidelines & Emergency Helplines

- **National Kisan Call Centre**: 📞 **1800-180-1551** (Toll-Free, 6:00 AM to 10:00 PM, 22 Indian languages)
- **PMFBY Crop Insurance**: 📞 **14447** (Report localized crop damage within 72 hours)
- **PM-KISAN Helpline**: 📞 **155261 / 1800-115-526**
- **e-NAM Online Mandi Support**: 📞 **1800-270-0224**
- **Soil Health Card Portal**: 🌐 [soilhealth.dac.gov.in](https://soilhealth.dac.gov.in)

---

## 📜 License
Developed for Indian Agricultural Development & Open Digital Agronomy.
