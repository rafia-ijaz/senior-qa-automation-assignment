# Bonus — Performance Test Design (Demo Web Shop)

Target website: https://demowebshop.tricentis.com

## What to test (focus area)

**Primary focus: End-to-end purchase funnel (search → product → cart → checkout → order confirmation).**

Reason:

- It is the highest business-impact flow (directly tied to conversions/orders).
- It exercises the most critical dependencies: search/catalog data reads, session/cart state, pricing calculations, checkout orchestration, and order persistence.
- Failures here are highly visible to real users and typically generate support incidents.

## Objectives

- Validate user-facing responsiveness under expected and peak load.
- Confirm the funnel remains functionally correct under concurrency (cart updates and totals remain consistent; checkout completes).
- Identify breaking points (capacity limits) and bottlenecks (slow steps, error spikes).

## Key SLAs/SLOs (example targets)

Use whatever targets your org expects; below are reasonable starting points for a e-commerce site:

- **Error rate**: < 1% (excluding expected validation errors)
- **Homepage/category/product**: p95 < 2s
- **Search results**: p95 < 3s
- **Add-to-cart / update cart**: p95 < 2s
- **Checkout step transitions**: p95 < 3–5s
- **Confirm order**: p95 < 5–8s

## Workload model (how to load the system)

### User journey mix (recommended)

- 70% Browse/search (low-cost, high-volume)
- 20% Cart operations (stateful)
- 10% Checkout/confirm (stateful + complex)

### Ramp + duration

- Warm-up: 5–10 minutes
- Load: 30–60 minutes
- Stress: progressive ramp until SLA breach or errors spike
- Soak: 4–8 hours at steady expected load (stability)
- Spike: sudden jump (e.g., 2×–5× VUs) to simulate campaign traffic

### Think time / pacing

- Think time per step: 2–5 seconds
- Randomized pauses to mimic real browsing behavior
- Unique session per virtual user (cart correctness depends on it)

## Scenarios (test cases)

### PERF-01 — Browse landing and categories

- Steps: Home → Category → Product page
- Measures: page response times, asset load impact, server throughput
- Pass: meets p95 targets, low errors

### PERF-02 — Search and open product

- Steps: Search common terms (e.g., "computer", "jeans") → Open result → Product page
- Measures: search latency distribution, timeouts, error rates
- Pass: p95 search under target, no 5xx bursts

### PERF-03 — Add to cart

- Steps: Product page → Add to cart → Open cart
- Measures: session/cart update latency, consistency under concurrency
- Pass: cart count and line items correct; p95 under target

### PERF-04 — Update cart quantities + price recalculation

- Steps: Cart with 2+ products → modify quantities → Update cart
- Measures: latency of recalculation/refresh, correctness (subtotal matches lines)
- Pass: totals remain correct; no excessive retries/timeouts

### PERF-05 — Guest checkout (full order)

- Steps: Cart ready → accept terms → checkout as guest → billing → shipping → payment → confirm
- Measures: end-to-end transaction time, failure rate, step-by-step breakdown
- Pass: order confirmation reliably succeeds; confirm step meets p95 target

### PERF-06 — Hot product contention

- Steps: Many users add the same popular product simultaneously; update cart
- Measures: lock contention, degraded add-to-cart latency, error spikes
- Pass: graceful degradation and no systemic failure

### PERF-07 — Soak: mixed traffic over time

- Steps: run PERF-01..05 with the mix for 4–8 hours
- Measures: latency drift, memory growth, error creep
- Pass: stable latency (no drift), no resource exhaustion

## Test data strategy

- Rotate product selections (avoid unrealistic cache-only results).
- For checkout, use unique emails per run (avoid duplicate-user conflicts).
- Keep addresses realistic and consistent to reduce variance.

## Metrics to collect

- Response time percentiles (p50/p95/p99) per scenario step
- Throughput (requests/sec or transactions/sec)
- Error rate and error types (4xx vs 5xx)
- Server-side metrics if available: CPU, memory, DB connections, queue length, cache hit rate

## Reporting & analysis

- Produce a summary table per scenario with p50/p95/p99 and error %.
- Identify the slowest steps and correlate with infrastructure metrics.
- Re-run focused tests on bottleneck steps after optimizations.
