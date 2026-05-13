/**
 * Wraps a script handler with unextension boilerplate:
 * reads `UNEXTENSION_PAYLOAD` from the environment, calls your handler,
 * and writes the result as JSON to stdout.
 *
 * @example
 * import { createScript } from '@unextension/bridge/script'
 *
 * createScript(async (payload: { name: string }) => {
 *   return { greeting: `Hello, ${payload.name}!` }
 * })
 */
export async function createScript<TPayload = unknown, TResult = unknown>(
  handler: (payload: TPayload) => TResult | Promise<TResult>,
): Promise<void> {
  try {
    const payload = JSON.parse(process.env['UNEXTENSION_PAYLOAD'] ?? 'null') as TPayload
    const result = await handler(payload)
    process.stdout.write(JSON.stringify(result ?? null))
  } catch (err) {
    process.stderr.write(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
