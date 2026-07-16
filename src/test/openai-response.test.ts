// Regression tests for the extract-profile 502. The production failure was a
// reasoning model (gpt-5-mini) exhausting its max_completion_tokens budget on
// reasoning, returning finish_reason='length' with EMPTY content — which the
// old adapter mislabelled as a generic error after a pointless retry. These
// tests pin the exact classification of that response, plus the other
// provider outcomes, using the pure (Deno-free) classifier.
import { describe, expect, it } from 'vitest'
import { classifyOpenAiResponse } from '../../supabase/functions/_shared/openai-response'

describe('classifyOpenAiResponse', () => {
  it('REGRESSION: finish_reason=length with empty content is a FATAL truncation (no retry)', () => {
    const d = classifyOpenAiResponse({
      httpStatus: 200,
      ok: true,
      finishReason: 'length',
      content: '', // reasoning consumed the whole budget
    })
    expect(d).toEqual({ outcome: 'fatal', code: 'truncated' })
  })

  it('treats a truncated response with partial content as truncated too', () => {
    const d = classifyOpenAiResponse({
      httpStatus: 200,
      ok: true,
      finishReason: 'length',
      content: '{"personal":', // cut off mid-JSON
    })
    expect(d).toEqual({ outcome: 'fatal', code: 'truncated' })
  })

  it('classifies insufficient_quota (429) as a fatal quota error, not a retry', () => {
    const d = classifyOpenAiResponse({
      httpStatus: 429,
      ok: false,
      bodyErrorCode: 'insufficient_quota',
    })
    expect(d).toEqual({ outcome: 'fatal', code: 'quota' })
  })

  it('classifies a plain 429 rate limit as retryable', () => {
    const d = classifyOpenAiResponse({
      httpStatus: 429,
      ok: false,
      bodyErrorCode: 'rate_limit_exceeded',
    })
    expect(d).toEqual({ outcome: 'retryable', code: 'rate_limited' })
  })

  it('classifies 5xx as retryable and 4xx as fatal', () => {
    expect(classifyOpenAiResponse({ httpStatus: 503, ok: false })).toEqual({
      outcome: 'retryable',
      code: 'error',
    })
    expect(classifyOpenAiResponse({ httpStatus: 400, ok: false })).toEqual({
      outcome: 'fatal',
      code: 'error',
    })
  })

  it('treats empty content with a normal finish as an invalid response', () => {
    const d = classifyOpenAiResponse({
      httpStatus: 200,
      ok: true,
      finishReason: 'stop',
      content: '',
    })
    expect(d).toEqual({ outcome: 'fatal', code: 'invalid_response' })
  })

  it('passes a well-formed completion through as success', () => {
    const d = classifyOpenAiResponse({
      httpStatus: 200,
      ok: true,
      finishReason: 'stop',
      content: '{"personal":{}}',
    })
    expect(d).toEqual({ outcome: 'success' })
  })
})
