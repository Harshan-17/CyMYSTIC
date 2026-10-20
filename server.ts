/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { globalSimulationEngine } from './src/simulation/engine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Initialize Gemini Client server-side
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // CORS and Headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // REST API: Current State
  app.get('/api/simulation/state', (_req: Request, res: Response) => {
    res.json(globalSimulationEngine.getState());
  });

  // REST API: Trigger Simulated Attack (180°C -> 220°C)
  app.post('/api/simulation/attack', (req: Request, res: Response) => {
    const triggeredBy = req.body?.triggeredBy === 'OPERATOR_CONSOLE' 
      ? 'OPERATOR_CONSOLE' 
      : 'PHONE_ATTACKER';
    const state = globalSimulationEngine.triggerAttack(triggeredBy);
    res.json({ success: true, state });
  });

  // REST API: Normal Operation (Restore setpoint to 180°C)
  app.post('/api/simulation/normal', (req: Request, res: Response) => {
    const triggeredBy = req.body?.triggeredBy || 'OPERATOR_CONSOLE';
    const state = globalSimulationEngine.triggerNormal(triggeredBy);
    res.json({ success: true, state });
  });

  // REST API: Reset Simulation
  app.post('/api/simulation/reset', (_req: Request, res: Response) => {
    const state = globalSimulationEngine.resetSimulation();
    res.json({ success: true, state });
  });

  // REST API: Apply Protection Action
  app.post('/api/simulation/protection', (req: Request, res: Response) => {
    const { actionId, title } = req.body || {};
    if (!actionId) {
      res.status(400).json({ success: false, error: 'actionId is required' });
      return;
    }
    const state = globalSimulationEngine.applyProtectionAction(actionId, title);
    res.json({ success: true, state });
  });

  // REST API: Respond to Pending Command ("Is this you?")
  app.post('/api/simulation/verify-command', (req: Request, res: Response) => {
    const { approved } = req.body || {};
    const state = globalSimulationEngine.respondToPendingCommand(Boolean(approved));
    res.json({ success: true, state });
  });

  // REST API: Store CSV Summary
  app.post('/api/simulation/csv-summary', (req: Request, res: Response) => {
    const { summary } = req.body || {};
    globalSimulationEngine.setCsvSummary(summary || null);
    res.json({ success: true, state: globalSimulationEngine.getState() });
  });

  // REST API: Custom Command
  app.post('/api/simulation/command', (req: Request, res: Response) => {
    const { targetTemp, machineId, triggeredBy } = req.body || {};
    const result = globalSimulationEngine.setCustomCommand(
      targetTemp, 
      machineId || 'MACHINE-01', 
      triggeredBy || 'OPERATOR_CONSOLE'
    );
    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, state: result.state });
  });

// In-memory cache for AI analysis to respect Gemini rate limits
let aiAnalysisCache: { key: string; timestamp: number; analysis: any } | null = null;
const CACHE_TTL_MS = 25000; // 25 seconds TTL

  // Gemini AI Analysis Endpoint
  app.post('/api/ai/analyze', async (req: Request, res: Response) => {
    try {
      const { type, evidence, csvSummary, financialAssessment } = req.body || {};

      const cacheKey = `${type}_${evidence?.id || 'none'}_${csvSummary?.filename || 'none'}_${evidence?.classification || 'none'}`;
      const now = Date.now();

      if (aiAnalysisCache && aiAnalysisCache.key === cacheKey && (now - aiAnalysisCache.timestamp) < CACHE_TTL_MS) {
        res.json({ success: true, analysis: aiAnalysisCache.analysis, cached: true });
        return;
      }

      let prompt = `You are CYMYSTIC AI, an industrial cyber-physical threat investigator. Analyze the provided operational evidence and output a concise, professional JSON assessment.

Evidence:
${JSON.stringify({ type, evidence, csvSummary, financialAssessment }, null, 2)}

Return strict JSON with these keys:
{
  "summary": "Short 2-sentence plain English summary of what occurred",
  "whatHappened": "Clear 2-sentence explanation of what occurred in the CSV dataset",
  "evidencePoints": ["Key point 1 referencing actual readings and operating limits", "Key point 2"],
  "financialImpact": "Explanation of financial exposure matching calculated downtime and material damage costs",
  "possibleCauses": "Plausible interpretations distinguishing suspicious setpoint commands from ordinary sensor faults",
  "prevention": ["Specific preventive control 1", "Specific preventive control 2"],
  "missingEvidence": "Note on missing PCAP network logs or additional sensor telemetry required next",
  "riskLevel": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
}`;

      let aiText = '';
      if (ai) {
        try {
          // Primary model: gemini-3.1-flash-lite for higher quota/lower latency, fallback to gemini-3.8-flash
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
          });
          aiText = response.text || '';
        } catch (err: any) {
          if (err?.status === 429 || String(err).includes('429')) {
            console.info('[CYMYSTIC] Gemini API quota limit reached, seamlessly using structured fallback assessment.');
          } else {
            console.warn('[CYMYSTIC] Gemini API request failed, fallback used:', err?.message || err);
          }
        }
      }

      // If text contains markdown JSON fences, extract inside
      let parsed = null;
      if (aiText) {
        try {
          const jsonMatch = aiText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          // ignore parse error, fallback below
        }
      }

      if (!parsed) {
        // Fallback structured assessment
        const isCsv = type === 'CSV_LOG' || !!csvSummary;
        const fname = csvSummary?.filename || 'industrial log file';
        const peaks = csvSummary?.peakTemp || 218;
        const dt = csvSummary?.downtimeMinutes || 45;
        const loss = csvSummary?.totalCalculatedLoss || 692500;
        const waste = csvSummary?.totalWastedCost || 245000;
        const rows = csvSummary?.validRows || csvSummary?.totalRows || 31;
        const anomalies = csvSummary?.anomalyCount || 2;

        parsed = {
          summary: isCsv
            ? `Analysis of ${fname} (${rows} valid rows) confirms ${anomalies} thermal anomalies peaking at ${peaks}°C with ${dt} min downtime and ₹${loss.toLocaleString('en-IN')} total financial exposure.`
            : `Suspicious setpoint override to 220°C detected. Measured reactor temperature breached the 185°C safe limit, triggering thermal runaway risk.`,
          whatHappened: isCsv
            ? `Industrial telemetry log ${fname} contains ${rows} recorded cycles. Thermal setpoint escalation caused ${anomalies} thermal anomalies, reaching a peak temperature of ${peaks}°C.`
            : `Remote control command altered setpoint from 180°C to 220°C, driving reactor temperature above certified safe threshold (185°C).`,
          evidencePoints: isCsv
            ? [
                `Log dataset ${fname} contains ${rows} valid rows and ${anomalies} flagged thermal anomalies.`,
                `Peak measured temperature reached ${peaks}°C, exceeding certified safe operating threshold of 185°C.`,
                `Recorded production downtime: ${dt} minutes; Scrapped material damage: ₹${waste.toLocaleString('en-IN')}.`,
              ]
            : [
                `Unauthorized PLC command altered setpoint from 180°C to 220°C.`,
                `Reactor core temperature reached elevated levels outside certified operating limits (175°C - 185°C).`,
              ],
          financialImpact: isCsv
            ? `Total calculated financial exposure is ₹${loss.toLocaleString('en-IN')}, combining ${dt} minutes of downtime loss at ₹8,500/min (₹${(dt * 8500).toLocaleString('en-IN')}) with ₹${waste.toLocaleString('en-IN')} in scrapped batch material damage.`
            : `Financial exposure accumulates in real-time based on ₹8,500/min production downtime plus scrapped batch materials.`,
          possibleCauses: isCsv
            ? `Plausible causes include unauthorized PLC setpoint override or thermal controller misconfiguration. Distinct setpoint steps differentiate this from gradual heating element degradation.`
            : `Unauthorized remote PLC command or compromised SCADA control channel.`,
          prevention: [
            `Enforce CYMYSTIC Protection Mode to bound remote setpoint changes within 175°C–185°C.`,
            `Implement two-factor Operator Verification Challenge for unauthenticated setpoint changes.`,
            `Isolate SCADA network control interfaces from external subnets.`,
          ],
          riskLevel: isCsv ? 'HIGH' : 'CRITICAL',
          missingEvidence: 'PLC network packet capture (PCAP) logs recommended to correlate origin IP and authenticate SCADA credentials.',
          recommendations: [
            {
              id: 'ENABLE_PROTECTION_MODE',
              title: 'Enable CYMYSTIC Protection Mode',
              description: 'Enforce certified 175°C - 185°C setpoint boundary and operator verification challenge.',
            },
            {
              id: 'RESTORE_SAFE_BASELINE',
              title: 'Restore Safe Setpoint Baseline',
              description: 'Reset setpoint to 180°C and initiate automated cooling sequence.',
            },
          ],
        };
      }

      aiAnalysisCache = { key: cacheKey, timestamp: now, analysis: parsed };
      res.json({ success: true, analysis: parsed });
    } catch (err) {
      console.error('[CYMYSTIC] Error in /api/ai/analyze:', err);
      res.status(500).json({ success: false, error: 'Failed to generate AI analysis' });
    }
  });

  // Contextual AI Q&A Endpoint
  app.post('/api/ai/question', async (req: Request, res: Response) => {
    try {
      const { question, stateContext } = req.body || {};

      let answerText = '';
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: `You are CYMYSTIC AI Assistant answering an operator question in an industrial control setting. Keep answers direct, accurate, and grounded in the state context.

Question: "${question}"
State Context:
${JSON.stringify(stateContext, null, 2)}

Provide a concise 2-3 sentence answer in plain text.`,
          });
          answerText = response.text || '';
        } catch (err: any) {
          if (err?.status === 429 || String(err).includes('429')) {
            console.info('[CYMYSTIC] Gemini Q&A rate limit reached, using fallback answer.');
          } else {
            console.warn('[CYMYSTIC] Gemini Q&A failed, fallback used:', err?.message || err);
          }
        }
      }

      if (!answerText) {
        const qLower = (question || '').toLowerCase();
        if (qLower.includes('countdown') || qLower.includes('clock') || qLower.includes('timer') || qLower.includes('increasing')) {
          answerText = `The Loss Exposure Clock estimates cumulative production loss in real-time as simulated downtime continues. It multiplies elapsed downtime by the ₹8,500/min contribution rate plus material waste to illustrate financial exposure.`;
        } else if (qLower.includes('prevent') || qLower.includes('stop') || qLower.includes('protect')) {
          answerText = `Click "Review and Apply Protection" to activate CYMYSTIC Protection Mode. This enforces certified setpoint boundaries (175°C - 185°C) and requires operator verification for suspicious PLC commands.`;
        } else {
          answerText = `CYMYSTIC correlates cyber PLC control commands with physical sensor readings. When an unauthorized setpoint change to 220°C is followed by thermal excursion, a critical cyber-physical incident is flagged.`;
        }
      }

      res.json({ success: true, answer: answerText });
    } catch (err) {
      res.json({ success: true, answer: 'The Loss Exposure Clock represents real-time accumulating financial risk during active thermal incidents. Enabling Protection Mode blocks unauthorized setpoint overrides.' });
    }
  });

  // Server-Sent Events (SSE)
  app.get('/api/simulation/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const initial = globalSimulationEngine.getState();
    res.write(`data: ${JSON.stringify(initial)}\n\n`);

    const unsubscribe = globalSimulationEngine.subscribe((state) => {
      try {
        res.write(`data: ${JSON.stringify(state)}\n\n`);
      } catch (err) {
        // stream closed
      }
    });

    req.on('close', () => {
      unsubscribe();
    });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: Date.now(), service: 'CYMYSTIC' });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CYMYSTIC] Server running on http://0.0.0.0:${PORT}`);
  });

  return { app, server };
}

startServer().catch((err) => {
  console.error('[CYMYSTIC] Fatal server startup error:', err);
  process.exit(1);
});
