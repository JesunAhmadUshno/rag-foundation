// Uncertainty for small paired samples, computed in the browser from per-question records.

// mulberry32: small seeded PRNG so every bootstrap is reproducible.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const quantile = (sorted, q) => {
  const i = (sorted.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

// Percentile bootstrap 95% CI of the mean of xs (e.g. 0/1 top-1 hits, or reciprocal ranks).
export function bootstrapCI(xs, { reps = 4000, seed = 20261104 } = {}) {
  const n = xs.length, r = rng(seed), means = new Float64Array(reps);
  for (let b = 0; b < reps; b++) { let s = 0; for (let i = 0; i < n; i++) s += xs[(r() * n) | 0]; means[b] = s / n; }
  means.sort();
  return { mean: xs.reduce((s, x) => s + x, 0) / n, lo: quantile(means, 0.025), hi: quantile(means, 0.975), n };
}

// Paired bootstrap 95% CI of mean(a - b), resampling questions.
export function pairedBootstrap(a, b, opts) {
  return bootstrapCI(a.map((x, i) => x - b[i]), opts);
}

const logChoose = (n, k) => { let s = 0; for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i); return s; };

// Exact two-sided McNemar test on paired 0/1 outcomes: binomial(discordant, 0.5).
export function mcnemarExact(a, b) {
  let onlyA = 0, onlyB = 0;
  a.forEach((x, i) => { if (x && !b[i]) onlyA++; if (!x && b[i]) onlyB++; });
  const n = onlyA + onlyB, k = Math.min(onlyA, onlyB);
  let p = 0;
  for (let i = 0; i <= k; i++) p += Math.exp(logChoose(n, i) - n * Math.LN2);
  return { onlyA, onlyB, p: n ? Math.min(1, 2 * p) : 1 };
}
