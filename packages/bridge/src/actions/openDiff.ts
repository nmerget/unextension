import { bridge } from '../index.js'

export interface HunkDecision {
  /** Zero-based index of the hunk in the diff */
  index: number
  /** Whether this hunk was accepted */
  accepted: boolean
}

export interface OpenDiffPayload {
  /** Path to the original file on disk (used to read content if originalContent is not provided) */
  filePath?: string
  /** Original content as a string (takes precedence over filePath for content) */
  originalContent?: string
  /** The proposed modified content */
  modifiedContent: string
  /** Title for the diff editor tab */
  title?: string
  /** Whether to auto-write accepted changes to disk (default: true) */
  autoApply?: boolean
}

export interface OpenDiffResult {
  /** true if user accepted (whole or partial), false if rejected */
  accepted: boolean
  /** null for whole-file accept/reject, array of HunkDecision for partial */
  hunks: HunkDecision[] | null
  /** Accepted content string, present when autoApply is true but no filePath is available */
  content?: string
}

export async function openDiff(payload: OpenDiffPayload): Promise<OpenDiffResult> {
  if (!payload.filePath && !payload.originalContent) {
    throw new Error('openDiff requires either filePath or originalContent')
  }
  return bridge.request<OpenDiffResult>('open-diff', payload)
}
