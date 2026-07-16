// Pure classification of an OpenAI chat-completions response. No Deno, no
// network — so it is unit-testable from Node (vitest) exactly like the Truth
// Lock validator. This is the single source of truth for turning a provider
// response into a retry/fatal decision and a safe error category.

export type ProviderErrorCode =
  | 'timeout'
  | 'rate_limited'
  | 'truncated'
  | 'invalid_response'
  | 'quota'
  | 'error'

export interface ResponseFacts {
  /** HTTP status of the OpenAI call. */
  httpStatus: number
  /** response.ok */
  ok: boolean
  /** choices[0].finish_reason, if present. */
  finishReason?: string | null
  /** choices[0].message.content, if present. */
  content?: unknown
  /** OpenAI error.code (e.g. 'insufficient_quota') — a SAFE field only. */
  bodyErrorCode?: string | null
}

export interface Classification {
  /** success: caller may parse content. retryable: try again (bounded).
   *  fatal: stop immediately, no retry. */
  outcome: 'success' | 'retryable' | 'fatal'
  code?: ProviderErrorCode
}

/**
 * Decide what a provider response means. The critical case this project hit:
 * a reasoning model (gpt-5-mini) that spends its entire max_completion_tokens
 * budget on reasoning returns finish_reason='length' with an EMPTY string
 * content. That is a deterministic truncation — retrying with the same budget
 * truncates again — so it is fatal, not retryable, and must be reported as its
 * own 'truncated' category rather than a generic error.
 */
export function classifyOpenAiResponse(facts: ResponseFacts): Classification {
  if (facts.httpStatus === 429) {
    // Quota exhaustion is permanent for this key; a plain rate limit is transient.
    if (facts.bodyErrorCode === 'insufficient_quota') return { outcome: 'fatal', code: 'quota' }
    return { outcome: 'retryable', code: 'rate_limited' }
  }
  if (!facts.ok) {
    // 5xx may be a transient provider blip; 4xx is a request-level problem.
    if (facts.httpStatus >= 500) return { outcome: 'retryable', code: 'error' }
    return { outcome: 'fatal', code: 'error' }
  }
  // 2xx — inspect the actual completion.
  if (facts.finishReason === 'length') return { outcome: 'fatal', code: 'truncated' }
  if (typeof facts.content !== 'string' || facts.content.length === 0) {
    return { outcome: 'fatal', code: 'invalid_response' }
  }
  return { outcome: 'success' }
}
