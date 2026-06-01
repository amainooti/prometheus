export interface EmailFormat {
  format: string
  example: string
  popularity: 'Very Common' | 'Common' | 'Less Common'
}

export function generateEmailFormats(
  firstName: string,
  lastName: string,
  domain: string
): EmailFormat[] {
  if (!firstName || !domain) return []

  const f = firstName.toLowerCase().replace(/[^a-z]/g, '')
  const l = lastName.toLowerCase().replace(/[^a-z]/g, '')
  const fi = f[0] ?? ''
  const li = l[0] ?? ''

  if (!f) return []

  const formats = [
    {
      format: '{first}@{domain}',
      example: `${f}@${domain}`,
      popularity: 'Very Common',
    },
    {
      format: '{first}.{last}@{domain}',
      example: `${f}.${l}@${domain}`,
      popularity: 'Very Common',
    },
    {
      format: '{first}{last}@{domain}',
      example: `${f}${l}@${domain}`,
      popularity: 'Common',
    },
    {
      format: '{fi}{last}@{domain}',
      example: `${fi}${l}@${domain}`,
      popularity: 'Common',
    },
    {
      format: '{first}.{li}@{domain}',
      example: `${f}.${li}@${domain}`,
      popularity: 'Common',
    },
    {
      format: '{first}_{last}@{domain}',
      example: `${f}_${l}@${domain}`,
      popularity: 'Less Common',
    },
    {
      format: '{last}.{first}@{domain}',
      example: `${l}.${f}@${domain}`,
      popularity: 'Less Common',
    },
    {
      format: '{last}{fi}@{domain}',
      example: `${l}${fi}@${domain}`,
      popularity: 'Less Common',
    },
  ] satisfies EmailFormat[]

  return formats.filter(
    fmt =>
      !fmt.example.includes('undefined') &&
      !fmt.example.startsWith('.') &&
      !fmt.example.startsWith('@') &&
      !fmt.example.includes('..') &&
      !fmt.example.includes('_@') &&
      !fmt.example.includes('.@')
  )
}

export function generateEmailSearchStrings(
  name: string,
  company: string
): string[] {
  if (!name) return []

  const parts = name.trim().split(/\s+/)
  const first = parts[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1] : ''
  const queries: string[] = []

  if (company) {
    const companyDomainGuess = company
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')

    queries.push(`"${name}" "${company}" email`)
    queries.push(`"${name}" "${company}" contact`)

    if (first && last && companyDomainGuess) {
      queries.push(`"${first} ${last}" site:${companyDomainGuess}.com`)
    }
  }

  queries.push(`"${name}" email contact`)
  queries.push(`"${name}" "@" site:linkedin.com`)

  if (first && last) {
    queries.push(`"${first} ${last}" email -site:linkedin.com`)
  }

  return queries
}