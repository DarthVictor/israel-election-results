/**
 * Build-time invariant. Narrows the checked condition, so callers do not need a
 * non-null assertion afterwards, and fails the pipeline rather than emitting
 * partially valid generated data.
 */
export function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
