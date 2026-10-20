# CYMYSTIC — Cyber-Physical Threat Detection & Financial Loss Assessment in Industrial Automation

**CYMYSTIC** is an industrial cybersecurity simulation and supervisory analytics platform. It correlates simulated malicious Programmable Logic Controller (PLC) setpoint modifications with measured physical sensor anomalies, calculates real-time financial downtime losses in Indian Rupees (INR ₹), and provides automated operator guidance adhering to NIST SP 800-82 / IEC 62443 principles.

---

## 1. Problem Statement

In industrial automation and critical infrastructure (SCADA / ICS), cyber threats often target machine control parameters rather than IT data. A compromised control loop can silently overheat a reactor or boiler, causing:
- Physical machine damage and catastrophic pressure breaches.
- Severe batches of chemical or material scrap.
- Emergency shutdown and prolonged line lockout.

Traditional IT intrusion detection systems monitor network packets but fail to understand physical thermodynamics, while SCADA alarm consoles see physical thermal spikes but cannot tell whether they stem from mechanical wear or an unauthorized remote setpoint modification.

**CYMYSTIC bridges this gap** by fusing cyber command audit trails with real-time physical sensor telemetry within a deterministic correlation engine.

---

## 2. Architecture & Four-Screen Application Structure

CYMYSTIC operates as a unified full-stack application featuring four primary dashboard routes:

1. **/dashboard — Operations Overview (Laptop / Desktop Console)**
   - Monitored Asset: `MACHINE-01` (Industrial Thermal Reactor 01).
   - Real-time measured core temperature vs. target setpoint (nominal: 180°C, certified range: 175°C - 185°C).
   - Core thermal profile chart showing live telemetry and baseline envelopes.
   - High-level operating state indicator (`NORMAL`, `WARNING`, `CRITICAL INCIDENT`, `PROTECTED`).
   - Potential financial loss summary in INR (₹).
   - Prominent CSV Upload Bar for loading industrial log datasets.

2. **/data-analysis — Data & Loss Analysis**
   - Prominent CSV Upload & Dataset Parser.
   - Interactive Financial Calculator & Loss Exposure Clock.
   - In-page **Gemini AI Dataset Investigation** analyzing uploaded CSV telemetry records.

3. **/incidents — Incident Response & Evidence**
   - **Section A (Summary):** Unique incident tracking ID, severity tier, classification, and safety interlock state.
   - **Section B (Cyber Evidence):** Temperature setpoint override (`180°C → 220°C`), command ID, trigger source, and forensic explanation.
   - **Section C (Physical Evidence):** Core thermocouple excursion readout (`> 185°C`), peak temperature observed, threshold delta, and physical consequence analysis.
   - **Section D (Correlation Reasoning):** Deterministic temporal correlation logic explaining the alignment between control command tampering and thermal runaway.
   - **Section E (Financial Loss Assessment in INR ₹):**
     $$\text{Estimated Loss} = (\text{Downtime Minutes} \times \text{Loss/Min}) + \text{Wasted Material} + \text{Recovery Costs}$$
     Includes interactive assumption sliders allowing operators to evaluate varying line lockout durations or chemical scrap costs.
   - **Section F (Recommended Incident Response):** Actionable containment guidance and operator-approved protection controls.

4. **/ai-analyst — Dedicated AI Security Intelligence**
   - Standalone **CYMYSTIC AI** investigation console powered by Gemini 3.1 Flash.
   - Provides Executive Synthesis, Correlated Evidence Points, and Contextual Q&A ("Ask CYMYSTIC").

5. **/attacker — Phone Attack Simulator (Mobile Viewport 390x844)**
   - Dedicated mobile UI for triggering simulated cyber attacks from an operator smartphone.
   - Large touch controls for:
     - `⚡ SIMULATE ATTACK` (Overwrites target to 220°C).
     - `RESTORE NORMAL OPERATION (180°C)`.
     - `RESET SIMULATION TO NOMINAL`.
   - Real-time command dispatch log showing timestamp and connection status.

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Google Fonts (`Outfit`, `JetBrains Mono`, `Noto Sans`).
- **Backend:** Node 22, Express 4, Vercel Serverless Functions (`/api/index.ts`), Server-Sent Events (SSE) `/api/simulation/stream` for low-latency live cross-device synchronization, REST endpoints.
- **AI Integration:** `@google/genai` TypeScript SDK (server-side calls with `gemini-3.1-flash-lite`).
- **Testing:** Native Node.js test runner (`node:test`, `node:assert/strict`).
- **Design System:** Industrial Brutalism + Minimalist Engineering Console (deep graphite `#0c0e12`, 1px hairlines, tabular numerals, muted semantic alerts).

---

## 4. Threat Modeling Summary

| Threat Zone | Threat / Failure Scenario | Risk | Severity | Mitigation in CYMYSTIC |
|---|---|---|---|---|
| **Input Surfaces** | Malicious/out-of-range PLC setpoint input (< 0°C or > 350°C, string injection) | Simulation crashes or displays corrupted telemetry | Medium | Strict schema validation: parse numbers, reject non-numeric inputs, enforce valid range [0°C, 350°C], sanitize machine IDs to regex `^[a-zA-Z0-9_\-]+$`. |
| **Decision & Detection Logic** | Classifying any random temperature spike as a cyber incident (false positives) | Alert fatigue, misdiagnosed mechanical failures | High | Correlation engine requires BOTH a suspicious command event (`previous !== new && new > 185°C`) AND a temporal physical response within correlation window ($\Delta t \le 120\text{s}$) to flag cyber-physical attack. Isolated physical anomaly flags `ISOLATED_PHYSICAL_ANOMALY`, NOT a cyberattack. |
| **Application Execution** | Unsanitized external payloads, prototype pollution | Client-side DOM XSS, corrupted state | High | Typed data structures, zero dynamic code execution, strict React component escaping, OWASP input validation. |
| **Memory & State** | Stale async timers overwriting reset state; racing simulation events | Zombie attack states after reset, incoherent financial loss calculations | High | Monotonic simulation run IDs / session tokens; reset action increments simulation cycle ID, cancelling any pending timeout ticks or delayed sensor feeds. |
| **Inter-System Communication** | Cross-device desync between phone and laptop dashboard; network failure | Phone triggers attack but laptop shows normal state; silent write drops | High | Dual synchronization architecture: High-speed server sync route (`/api/simulation`) + Server-Sent Events / polling fallback; explicit connection status badge (Connected / Disconnected / Local Mode) and error feedback. |

---

## 5. Quickstart & Demonstration Walkthrough

### Starting the Application Locally

```bash
# 1. Install dependencies
npm install

# 2. Run unit tests
npm test

# 3. Type checking & linter
npm run lint

# 4. Start local development server (hosts on http://0.0.0.0:3000)
npm run dev

# 5. Production build test
npm run build
```

---

## 6. Sample Financial Loss Calculation

- **Downtime Duration:** 45 minutes
- **Production Margin at Risk:** ₹8,500 per minute
  $$\text{Downtime Loss} = 45 \times ₹8,500 = ₹3,82,500$$
- **Wasted Material Scrap:** ₹2,45,000 (thermally degraded chemical batch)
- **Recovery & Sensor Recalibration:** ₹65,000
- **Total Estimated Potential Loss:**
  $$₹3,82,500 + ₹2,45,000 + ₹65,000 = ₹6,92,500\text{ INR}$$

---

## 7. Deploying on Vercel via GitHub

CYMYSTIC is fully pre-configured for one-click deployment on **Vercel** using **GitHub**.

### Step 1: Push Project to GitHub
1. In Google AI Studio, click **Sync with GitHub** or push your local repository to a new GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Prepare CYMYSTIC for Vercel deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cymystic.git
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Select your `cymystic` GitHub repository and click **Import**.

### Step 3: Configure Project Build Settings
- **Framework Preset:** `Vite` (Vercel auto-detects this).
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Root Directory:** `./`

### Step 4: Configure Environment Variables
In the **Environment Variables** section on Vercel, add:

| Environment Variable | Description | Example / Location |
|---|---|---|
| `GEMINI_API_KEY` | Required for Gemini AI Investigation server-side calls. | Obtain from [Google AI Studio Secrets](https://aistudio.google.com/app/apikey). |

> **CRITICAL SECURITY NOTE:** `GEMINI_API_KEY` is strictly server-side. It is accessed by Vercel Serverless Functions in `api/index.ts` and is **never** bundled or exposed to client-side browser code.

### Step 5: Deploy & Test
1. Click **Deploy**. Vercel will run `npm run build` and provision the frontend static assets and serverless API functions (`/api/*`).
2. Once deployment completes, test:
   - Dashboard Overview: `<YOUR_VERCEL_URL>/dashboard`
   - CSV Analysis: `<YOUR_VERCEL_URL>/data-analysis`
   - Incident Response: `<YOUR_VERCEL_URL>/incidents`
   - AI Investigator: `<YOUR_VERCEL_URL>/ai-analyst`
   - Phone Simulator: `<YOUR_VERCEL_URL>/attacker`

---

## 8. Safety Boundary Disclaimer

All control commands, PLC setpoints, and sensor readings in CYMYSTIC are software simulations executing within isolated web containers and serverless environments. The application does not connect to, communicate with, or command real-world physical machinery or live PLC hardware.
