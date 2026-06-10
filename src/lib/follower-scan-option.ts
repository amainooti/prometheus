/**
 * Generates a list of "round number" follower scan options up to a given max.
 *
 * Steps are human-friendly:
 *   100, 200, 500 → 1k, 2k, 5k → 10k, 25k, 50k → 100k, 250k, 500k
 *   → 1M, 2.5M, 5M, 10M, 25M, 50M, 100M
 *
 * Always includes at least the FALLBACK_OPTIONS so the UI is never empty,
 * even if the follower-count endpoint fails.
 */

export const FALLBACK_SCAN_OPTIONS = [100, 200, 500, 1_000] as const

const STEPS = [
  100, 200, 500,
  1_000, 2_000, 5_000,
  10_000, 25_000, 50_000,
  100_000, 250_000, 500_000,
  1_000_000, 2_500_000, 5_000_000,
  10_000_000, 25_000_000, 50_000_000,
  100_000_000,
]

/**
 * Returns all STEPS that are ≤ `followerCount`, with a minimum of the
 * FALLBACK_OPTIONS so there are always choices even for tiny accounts.
 */
export function getScanOptions(followerCount: number): number[] {
  const capped = STEPS.filter(s => s <= followerCount)
  // Always show at least the first 4 fallback steps
  const base   = STEPS.slice(0, FALLBACK_SCAN_OPTIONS.length)
  const merged = Array.from(new Set([...base, ...capped])).sort((a, b) => a - b)
  return merged
}

/** Pretty-prints a follower scan option, e.g. 1_000_000 → "1M" */
export function formatScanOption(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M followers`
  if (n >= 1_000)     return `${n / 1_000}k followers`
  return `${n} followers`
}