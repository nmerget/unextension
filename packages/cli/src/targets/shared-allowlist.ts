/**
 * Shared allowlist matching logic for command execution.
 * Used by both VS Code and JetBrains handlers to determine
 * whether a command ID is permitted by the configured allowlist.
 */

/**
 * Checks whether a command ID is allowed by at least one pattern in the allowlist.
 * Returns true if the command matches any pattern (exact or glob).
 */
export function isCommandAllowed(command: string, allowlist: string[]): boolean {
  for (const pattern of allowlist) {
    if (matchCommandPattern(command, pattern)) return true
  }
  return false
}

/**
 * Matches a command ID against a single pattern.
 * Supports exact string matches and glob patterns where `*` matches
 * one or more characters within a single dot-separated segment (i.e., `[^.]+`).
 */
export function matchCommandPattern(command: string, pattern: string): boolean {
  if (!pattern.includes('*')) return command === pattern
  const regexStr = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+') + '$'
  return new RegExp(regexStr).test(command)
}
