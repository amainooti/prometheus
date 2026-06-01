// Email format patterns and utilities

export const emailFormats = [
  '{first}.{last}@{domain}',
  '{first}{last}@{domain}',
  '{first}@{domain}',
  '{last}.{first}@{domain}',
  'f.{last}@{domain}',
  '{first}.{l}@{domain}',
]

export function generateEmailVariations(first: string, last: string, domain: string): string[] {
  return emailFormats.map(format =>
    format
      .replace('{first}', first.toLowerCase())
      .replace('{last}', last.toLowerCase())
      .replace('{domain}', domain.toLowerCase())
      .replace('{l}', last[0].toLowerCase())
  )
}
