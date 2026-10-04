/** Exact alias matching, ignoring typography; never guess by substring or edit distance. */
export const normalizeRushAnswer = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl')
    .replace(/ł/g, 'l')
    .replace(/[\s\p{Pd}'’]/gu, '')

export function matchRushAnswer<T extends { answer: string; aliases: string[] }>(
  input: string,
  answers: T[],
): T | undefined {
  const normalized = normalizeRushAnswer(input)
  if (!normalized) return undefined
  const matches = answers.filter((candidate) =>
    [candidate.answer, ...candidate.aliases].some((value) => normalizeRushAnswer(value) === normalized),
  )
  // An ambiguous shorthand must not silently select the first answer.
  return matches.length === 1 ? matches[0] : undefined
}
