import { sleep } from './sleep';

export async function retry<T>(
  operationName: string,
  operation: () => Promise<T>,
  maxAttempts: number = 5,
  retryDelay: number = 5
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const delayTime = retryDelay * (2 ** attempt);
      console.error(`Attempt #${attempt + 1}/${maxAttempts} to '${operationName}' failed:`, (error as Error).message);
      if (attempt < maxAttempts) {
        console.log(`Retrying in ${delayTime} ms...`);
        await sleep(delayTime);
      } else {
        console.error(`Max retries to ${operationName} reached. Failing...`);
        throw error;
      }
    }
  }
  throw new Error();
}