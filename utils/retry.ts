export const MAX_RETRIES = 3
export const RETRY_DELAY = 2000

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function retryAsync<T>(
  fn: () => Promise<T>,
  operation: string,
  attempt = 1,
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      console.log(`⚠️  ${operation} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY}ms...`)
      await sleep(RETRY_DELAY)
      return retryAsync(fn, operation, attempt + 1)
    }
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`${operation} failed after ${MAX_RETRIES} attempts: ${errorMessage}`)
  }
}
