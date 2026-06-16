export function buildExtractMemoryPrompt(
  input: string,
  userContext: string,
  currentTime: string,
  timezone: string = 'UTC',
  recentMemories: string[] = [],
): string {
  const recentMemoriesSection = recentMemories.length > 0
    ? `\nRecent memories already stored about this user (verbatim):\n${recentMemories.map(m => `- "${m}"`).join('\n')}`
    : ''

  return `You are a memory extraction AI for a personal AI assistant. Your job is to analyze what the user said and decide if it should be stored as a memory, and if so, extract it in structured form.

Current time (UTC): ${currentTime}
User's timezone: ${timezone}
User context: ${userContext || 'No prior context available'}${recentMemoriesSection}

User said: "${input}"

Analyze this and return a JSON object with exactly these fields:
{
  "should_store": boolean (false if this is just casual chat or a question, true if it's a fact/reminder/goal/person info worth storing),
  "summary": string (clean, concise third-person summary: "User wants to call dentist next Tuesday at 2pm" — empty string if should_store is false),
  "type": "note" | "reminder" | "person" | "habit" | "decision" | "insight",
  "tags": string[] (2-5 lowercase relevant tags, e.g. ["health", "appointments"]),
  "entities": array of { "name": string, "type": "person" | "place" | "project" | "habit" | "topic" } (only real people, places, or projects mentioned by name — e.g. [{"name": "John", "type": "person"}, {"name": "Project Alpha", "type": "project"}]; do NOT include generic nouns like "dentist" or "gym" unless they are a proper name),
  "remind_at": string | null (ISO 8601 datetime IN UTC if a specific time was mentioned, null otherwise — interpret any clock time the user gives as being in their timezone shown above, then convert it to UTC before writing the ISO string),
  "remind_repeat": "daily" | "weekly" | "monthly" | "yearly" | null (null if not recurring),
  "importance": 1 | 2 | 3 | 4 | 5 (5 = life-changing decision, 1 = trivial note),
  "supersedes_summaries": string[] (list EVERY memory from "Recent memories already stored" above that this new statement makes outdated — copy each one's text EXACTLY as shown, with quotes removed. This applies to TWO different situations, both equally important:
    1. Cancellations/contradictions: e.g. an earlier "call mom every Sunday" memory is contradicted by a new "stop calling mom" statement.
    2. Plain value updates to the same fact, even with no cancellation language: e.g. an earlier "User's safe pin is 0030" memory is superseded by a new "my safe pin changed to 6578" statement — both describe the SAME fact (the safe's pin) but with a different value, so the old one must be listed here. The same applies to addresses, phone numbers, passwords, job titles, statuses, or any other fact that simply changed to a new value.
    Think transitively across multiple hops if needed. Empty array if nothing is superseded.)
}

Rules:
- type "reminder" = something with a time/deadline
- type "person" = information about another person
- type "habit" = recurring behavior or goal
- type "decision" = a choice made or being considered
- type "insight" = a reflection or realization
- type "note" = everything else worth storing
- importance 5: medical, legal, financial decisions; 4: important work/relationship matters; 3: normal life events; 2: minor notes; 1: trivial
- Return ONLY valid JSON, no markdown, no explanation`
}

export function buildChatResponsePrompt(
  input: string,
  extractedMemory: { should_store: boolean; summary: string; type: string } | null,
  recentMemories: string[],
  userContext: string,
  currentTime: string,
  supersededSummaries: string[] = [],
): string {
  const memorySection = recentMemories.length > 0
    ? `\nRelevant memories I found:\n${recentMemories.map(m => `- ${m}`).join('\n')}`
    : ''

  const storedSection = extractedMemory?.should_store
    ? `\nI just stored this memory: "${extractedMemory.summary}" (type: ${extractedMemory.type})`
    : ''

  const supersededSection = supersededSummaries.length > 0
    ? `\nThis update replaces ${supersededSummaries.length > 1 ? 'these older memories' : 'an older memory'}: ${supersededSummaries.map(s => `"${s}"`).join(', ')} — I've archived ${supersededSummaries.length > 1 ? 'them' : 'it'}. Briefly acknowledge the change (e.g. confirm what changed) in your response.`
    : ''

  return `You are MemoryAI, a warm and intelligent personal assistant that helps people remember things, stay organized, and make better decisions.

Current date and time: ${currentTime}
User context: ${userContext || 'New user'}${memorySection}${storedSection}${supersededSection}

User message: "${input}"

Respond naturally and helpfully. If you stored a memory, confirm it briefly. If you found relevant memories, use them to give a more informed response. Keep responses concise (2-4 sentences max) unless the user asks for detail. Be warm, smart, and proactive — if you notice something important the user might have forgotten, mention it. Never state or imply a current date other than the one given above.`
}
