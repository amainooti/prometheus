// Search query logic for generating queries from keywords

export function generateSearchQuery(keywords: string[]): string {
  // Implement your search query generation logic
  return keywords.join(' OR ')
}

export function parseSearchQuery(query: string): string[] {
  return query.split(/\s+OR\s+/).filter(Boolean)
}
