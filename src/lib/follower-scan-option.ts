/**
 * src/lib/follower-scan-options.ts
 *
 * Generates human-friendly "max followers to scan" options up to a given
 * account's real follower count. Covers accounts from 100 to 100 M+.
 *
 * Always includes FALLBACK_SCAN_OPTIONS so the UI is never empty even when
 * the follower-count endpoint fails.
 */

export const FALLBACK_SCAN_OPTIONS = [100, 200, 500, 1_000] as const

// Every "round" step we ever want to offer, up to 100 M
const ALL_STEPS = [
  100, 200, 500,
  1_000, 2_000, 5_000,
  10_000, 25_000, 50_000,
  100_000, 250_000, 500_000,
  1_000_000, 2_500_000, 5_000_000,
  10_000_000, 25_000_000, 50_000_000,
  100_000_000,
]

/**
 * Returns all steps <= followerCount, always including at least
 * the first 4 fallback steps so tiny accounts still have options.
 */
export function getScanOptions(followerCount: number): number[] {
  const capped = ALL_STEPS.filter(s => s <= followerCount)
  const base   = ALL_STEPS.slice(0, FALLBACK_SCAN_OPTIONS.length)
  return Array.from(new Set([...base, ...capped])).sort((a, b) => a - b)
}

/**
 * Pretty label for a scan option:
 *   100        -> "100 followers"
 *   1_000      -> "1k followers"
 *   1_000_000  -> "1M followers"
 *   25_000_000 -> "25M followers"
 */
export function formatScanOption(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `${m % 1 === 0 ? m : m.toFixed(1)}M followers`
  }
  if (n >= 1_000) {
    const k = n / 1_000
    return `${k % 1 === 0 ? k : k.toFixed(1)}k followers`
  }
  return `${n} followers`
}