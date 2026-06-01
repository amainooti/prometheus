// Duplicate detection utilities

export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1
  
  const editDistance = getEditDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function getEditDistance(longer: string, shorter: string): number {
  const costs = []
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j
      } else if (j > 0) {
        let newValue = costs[j - 1]
        if (longer.charAt(j - 1) !== shorter.charAt(i - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
        }
        costs[j - 1] = lastValue
        lastValue = newValue
      }
    }
    if (i > 0) costs[shorter.length] = lastValue
  }
  return costs[shorter.length]
}

export function findDuplicates(items: { email: string }[], threshold = 0.8) {
  const duplicates = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const similarity = calculateSimilarity(items[i].email, items[j].email)
      if (similarity >= threshold) {
        duplicates.push({ item1: i, item2: j, similarity })
      }
    }
  }
  return duplicates
}
