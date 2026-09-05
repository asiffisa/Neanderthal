export class RequestError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** 499 when the client left, 504 when our own deadline fired, otherwise the error's own status. */
export function abortStatus(signal: AbortSignal, request: Request, error?: unknown): number {
  if (signal.aborted) return request.signal.aborted ? 499 : 504;
  return error instanceof RequestError ? error.status : 502;
}

/** Also bounds work (DNS/body reads) that does not itself accept an AbortSignal. */
export async function abortable<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    void work.catch(() => {});
    throw signal.reason;
  }
  let onAbort: () => void = () => {};
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        onAbort = () => reject(signal.reason);
        signal.addEventListener('abort', onAbort, { once: true });
      }),
    ]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

export async function readBoundedBody(
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    void response.body?.cancel().catch(() => {});
    throw new RequestError('Response exceeds the byte limit', 413);
  }
  if (signal.aborted) {
    void response.body?.cancel(signal.reason).catch(() => {});
    throw signal.reason;
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await abortable(reader.read(), signal);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new RequestError('Response exceeds the byte limit', 413);
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } catch (error) {
    void reader.cancel(error).catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

/** For small provider metadata, not streaming AI answers or arbitrary URLs. */
export async function fetchWithLimits(
  url: string,
  options: RequestInit = {},
  timeoutMs = 3500,
  maxBytes = 1024 * 1024,
): Promise<Response> {
  const signal = AbortSignal.any([
    ...(options.signal ? [options.signal] : []),
    AbortSignal.timeout(timeoutMs),
  ]);
  signal.throwIfAborted();
  const response = await fetch(url, { ...options, signal, redirect: 'error', cache: 'no-store' });
  const bytes = await readBoundedBody(response, maxBytes, signal);
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  return new Response(response.body === null ? null : bytes, {
    status: response.status,
    headers,
  });
}

export async function readJsonObject(request: Request, signal: AbortSignal): Promise<Record<string, unknown>> {
  const bytes = await readBoundedBody(new Response(request.body, { headers: request.headers }), 32 * 1024, signal);
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new RequestError('Request must contain a JSON object', 400);
  }
}

/** Keep the deadline and byte limit active while streaming to a slow consumer. */
export function streamWithLimits(body: ReadableStream<Uint8Array>, signal: AbortSignal, maxBytes: number): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let size = 0;
  let finished = false;
  let onAbort: () => void = () => {};
  const finish = () => { finished = true; signal.removeEventListener('abort', onAbort); };
  return new ReadableStream({
    start(controller) {
      onAbort = () => {
        if (finished) return;
        finish();
        void reader.cancel(signal.reason).catch(() => {});
        controller.error(signal.reason);
      };
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) onAbort();
    },
    async pull(controller) {
      if (finished) return;
      try {
        const { done, value } = await reader.read();
        if (finished) return;
        if (done) { finish(); reader.releaseLock(); controller.close(); return; }
        size += value.byteLength;
        if (size > maxBytes) throw new RequestError('Stream exceeds the byte limit', 502);
        controller.enqueue(value);
      } catch (error) {
        if (finished) return;
        finish();
        void reader.cancel(error).catch(() => {});
        controller.error(error);
      }
    },
    cancel(reason) {
      finish();
      void reader.cancel(reason).catch(() => {});
    },
  });
}
