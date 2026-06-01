export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingId?: string
  existingName?: string
  existingCompany?: string | null
}

export async function checkDuplicate(
  name: string,
  company: string
): Promise<DuplicateCheckResult> {
  if (!name.trim()) return { isDuplicate: false }

  const params = new URLSearchParams({ search: name.trim() })
  const res    = await fetch(`/api/leads?${params}&limit=10`)
  if (!res.ok) return { isDuplicate: false }

  const { leads } = await res.json()

  const match = leads.find((l: any) =>
    l.name.toLowerCase() === name.trim().toLowerCase() &&
    (l.company ?? '').toLowerCase() === (company ?? '').trim().toLowerCase()
  )

  if (match) {
    return {
      isDuplicate:     true,
      existingId:      match.id,
      existingName:    match.name,
      existingCompany: match.company,
    }
  }

  return { isDuplicate: false }
}