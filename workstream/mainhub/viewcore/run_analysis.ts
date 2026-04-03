"use strict";

/**
 * High-level analysis runner
 * - Validates inputs
 * - Adds timing, retries, and structured logging
 * - Produces a compact summary alongside raw outputs
 *
 * Dependencies expected in scope:
 *   TokenActivityAnalyzer, TokenDepthAnalyzer, ExecutionEngine, SigningEngine, detectVolumePatterns
 */

(function () {
  // --- Utility helpers -------------------------------------------------------

  /** Simple public key guard (base58-ish, 32–44 chars typical for Solana) */
  function isLikelyPubkey(v) {
    return typeof v === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(v);
  }

  /** Enforce presence of a function dependency */
  function requireFn(name, fn) {
    if (typeof fn !== "function") {
      throw new Error(`Missing required function: ${name}`);
    }
  }

  /** Retry wrapper for promise factories */
  async function withRetries(taskFactory, attempts = 2, delayMs = 250) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        return await taskFactory();
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) {
          await new Promise(res => setTimeout(res, delayMs));
        }
      }
    }
    throw lastErr;
  }

  /** Time a promise-returning function */
  async function timeIt(label, fn) {
    const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
    const result = await fn();
    const t1 = (typeof performance !== "undefined" ? performance.now() : Date.now());
    return { result, ms: Math.round(t1 - t0), label };
  }

  /** Safe number conversion */
  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  /** Structured section logger */
  function logSection(title, data) {
    try {
      console.log(`[${title}]`, JSON.parse(JSON.stringify(data)));
    } catch {
      console.log(`[${title}]`, data);
    }
  }

  // --- Input configuration ---------------------------------------------------

  const RPC_URL = "https://solana.rpc";          
  const DEX_API = "https://dex.api";             
  const MINT    = "MintPubkeyHere";              
  const MARKET  = "MarketPubkeyHere";            

  // --- Dependency checks -----------------------------------------------------

  requireFn("TokenActivityAnalyzer", (globalThis || window).TokenActivityAnalyzer);
  requireFn("TokenDepthAnalyzer",   (globalThis || window).TokenDepthAnalyzer);
  requireFn("ExecutionEngine",      (globalThis || window).ExecutionEngine);
  requireFn("SigningEngine",        (globalThis || window).SigningEngine);
  requireFn("detectVolumePatterns", (globalThis || window).detectVolumePatterns);

  /** @type {any} */
  const TokenActivityAnalyzer = (globalThis || window).TokenActivityAnalyzer;
  /** @type {any} */
  const TokenDepthAnalyzer = (globalThis || window).TokenDepthAnalyzer;
  /** @type {any} */
  const ExecutionEngine = (globalThis || window).ExecutionEngine;
  /** @type {any} */
  const SigningEngine = (globalThis || window).SigningEngine;
  /** @type {(arr:number[], windowSize:number, threshold:number)=>any[]} */
  const detectVolumePatterns = (globalThis || window).detectVolumePatterns;

  // --- Input validation ------------------------------------------------------

  if (!isLikelyPubkey(MINT)) {
    throw new Error("Invalid mint public key format");
  }
  if (!isLikelyPubkey(MARKET)) {
    console.warn("Warning: MARKET id does not look like a standard public key");
  }

  // --- Main orchestration ----------------------------------------------------

  (async () => {
    const activityAnalyzer = new TokenActivityAnalyzer(RPC_URL);
    const depthAnalyzer    = new TokenDepthAnalyzer(DEX_API, MARKET);
    const engine           = new ExecutionEngine();
    const signer           = new SigningEngine();

    // 1) Analyze activity (with retries + timing)
    const activityTimed = await timeIt("analyzeActivity", () =>
      withRetries(() => activityAnalyzer.analyzeActivity(MINT, 20), 3, 300)
    );
    const records = Array.isArray(activityTimed.result) ? activityTimed.result : [];
    logSection("activity", { count: records.length, ms: activityTimed.ms });

    // 2) Analyze depth (with retries + timing)
    const depthTimed = await timeIt("analyzeDepth", () =>
      withRetries(() => depthAnalyzer.analyze(30), 2, 300)
    );
    const depthMetrics = depthTimed.result || {};
    logSection("depth", { ms: depthTimed.ms });

    // 3) Detect patterns
    const volumes = records.map(r => num(r.amount));
    const patterns = detectVolumePatterns(volumes, 5, 100) || [];
    logSection("patterns", { count: Array.isArray(patterns) ? patterns.length : 0 });

    // 3b) Quick stats on volumes
    const totalVolume = volumes.reduce((a, b) => a + num(b), 0);
    const avgVolume = volumes.length ? totalVolume / volumes.length : 0;

    // 4) Custom task via ExecutionEngine
    engine.register("report", async (params) => ({
      records: Array.isArray(params.records) ? params.records.length : 0,
      totalVolume,
      avgVolume
    }));
    engine.enqueue("task1", "report", { records });
    const taskResults = await engine.runAll();

    // 5) Sign & verify
    const payload = JSON.stringify({
      depthMetrics,
      patterns,
      taskResults,
      meta: {
        rpc: RPC_URL,
        dexApi: DEX_API,
        analyzedAt: new Date().toISOString(),
        timingsMs: {
          activity: activityTimed.ms,
          depth: depthTimed.ms
        }
      }
    });
    const signature = await signer.sign(payload);
    const signatureValid = await signer.verify(payload, signature);

    // 6) Final structured output
    const summary = {
      activityCount: records.length,
      totalVolume,
      avgVolume,
      depthAvailable: Boolean(depthMetrics && Object.keys(depthMetrics).length),
      patternsFound: Array.isArray(patterns) ? patterns.length : 0,
      signatureValid
    };

    logSection("summary", summary);
    console.log({ records, depthMetrics, patterns, taskResults, signature, signatureValid });
  })().catch(err => {
    console.error("Run failed:", err && err.message ? err.message : err);
  });
})();
