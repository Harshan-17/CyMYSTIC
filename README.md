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

## 2. Architecture & Three-Screen Application Structure

CYMYSTIC operates as a unified full-stack application featuring three primary views:

1. **/dashboard — Operations Overview (Laptop / Desktop Console)**
   - Monitored Asset: `MACHINE-01` (Industrial Thermal Reactor 01).
   - Real-time measured core temperature vs. target setpoint (nominal: 180°C, certified range: 175°C - 185°C).
   - Core thermal profile SVG chart showing live telemetry, sampling frequency (1.0s), and baseline envelopes.
   - High-level operating state indicator (`NORMAL`, `WARNING`, `CRITICAL INCIDENT`).
   - Potential financial loss summary in INR (₹).
   - Latest control bus command card (`PLC-BUS-RX`).

2. **/incidents — Incident Investigation & Financial Assessment**
   - **Section A (Summary):** Unique incident tracking ID, severity tier, classification, and safety interlock state.
   - **Section B (Cyber Evidence):** Unauthorized setpoint modification (`180°C → 220°C`), command ID, trigger source, and forensic explanation of why this step change violates normal operating tolerances.
   - **Section C (Physical Evidence):** Core thermocouple excursion readout (`> 185°C`), peak temperature observed, threshold delta, and physical consequence analysis.
   - **Section D (Correlation Reasoning):** Deterministic temporal correlation logic explaining the alignment between control command tampering and thermal runaway ($\Delta t \le 120\text{s}$).
   - **Section E (Financial Loss Assessment in INR ₹):**
     $$\text{Estimated Loss} = (\text{Downtime Minutes} \times \text{Loss/Min}) + \text{Wasted Material} + \text{Recovery Costs}$$
     Includes interactive assumption sliders allowing judges to test varying line lockout durations or chemical scrap costs.
   - **Section F (Recommended Incident Response):** Actionable containment guidance (Isolate Command Bus $\rightarrow$ Emergency Cooling Jacket $\rightarrow$ Purge & Recalibrate).

3. **/attacker — Phone Attack Simulator (Mobile Viewport 390x844)**
   - Dedicated mobile UI for triggering simulated cyber attacks from an operator smartphone.
   - Large touch controls for:
     - `⚡ SIMULATE ATTACK` (Overwrites target to 220°C).
     - `RESTORE NORMAL OPERATION (180°C)`.
     - `RESET SIMULATION TO NOMINAL`.
   - Real-time command dispatch log showing timestamp and network status.
   - Safety harness disclaimer confirming all operations run in a software-isolated testbed.

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Google Fonts (`Outfit`, `JetBrains Mono`, `Noto Sans`).
- **Backend:** Node 22, Express 4, Server-Sent Events (SSE) `/api/simulation/stream` for low-latency live cross-device synchronization, REST endpoints.
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
| **Inter-System Communication** | Cross-device desync between phone and laptop dashboard; network failure | Phone triggers attack but laptop shows normal state; silent write drops | High | Dual synchronization architecture: High-speed server sync route (`/api/simulation`) + Firestore real-time sync with graceful offline fallback; explicit connection status badge (Connected / Disconnected / Local Mode) and error feedback. |

---

## 5. Quickstart & Demonstration Walkthrough

### Starting the Application
```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Start local server (hosts on http://0.0.0.0:3000)
npm run dev
```

### Performing the 2-Device Demonstration
1. Open the laptop browser to:
   ```
   https://<your-app-url>/#dashboard
   ```
   Notice that `MACHINE-01` is operating nominally at **180.0°C**, status is `NORMAL`, and potential loss is **₹0**.

2. On a smartphone (or mobile-sized browser window), navigate to:
   ```
   https://<your-app-url>/#attacker
   ```

3. Tap **⚡ SIMULATE ATTACK**:
   - The phone interface dispatches a command changing target setpoint from **180°C → 220°C**.
   - The laptop dashboard instantly registers the incoming control command via the real-time stream.
   - The simulated physical temperature begins rising past the safe operating limit (**185°C**).
   - Once the threshold is crossed, the machine state switches to **CRITICAL INCIDENT**.
   - Estimated potential financial loss calculates to **₹6,92,500**.

4. On the laptop, click **Investigate Incident →**:
   - Inspect the forensic evidence chain comparing the cyber setpoint override and physical thermocouple telemetry.
   - Review the deterministic correlation explanation.
   - Adjust the financial loss sliders (e.g. changing downtime from 45 min to 60 min) to evaluate impact dynamically.

5. Click **Reset Simulation to Nominal (180°C)** on either device to clear the incident and return the reactor to its certified baseline.

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

## 7. Safety Boundary Disclaimer

All control commands, PLC setpoints, and sensor readings in CYMYSTIC are software simulations executing within isolated web containers. The application does not connect to, communicate with, or command real-world physical machinery or live PLC hardware.
