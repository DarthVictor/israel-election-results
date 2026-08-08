import { MANIFEST_SCHEMA_VERSION } from "../../domain/contracts";
import type { ElectionManifest, ElectionResultsFile } from "../../domain/contracts";

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Could not load data (${response.status}).`);
  return (await response.json()) as T;
}

/**
 * Result files are generated with a content hash in their URL. Keeping successful
 * responses by URL makes switching between elections instantaneous without ever
 * serving data for a different revision of that file.
 */
const successfulElectionLoads = new Map<string, ElectionResultsFile>();
const pendingElectionLoads = new Map<string, Promise<ElectionResultsFile>>();

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("The result request was aborted.", "AbortError");
}

async function awaitWithSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  throwIfAborted(signal);
  if (!signal) return promise;

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException("The result request was aborted.", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    void promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

export async function loadManifest(signal?: AbortSignal): Promise<ElectionManifest> {
  const manifest = await getJson<ElectionManifest>("/data/generated/manifest.json", signal);
  if (manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION || manifest.elections.length === 0)
    throw new Error("The election manifest is invalid.");
  return manifest;
}

export async function loadElection(
  url: string,
  signal?: AbortSignal,
): Promise<ElectionResultsFile> {
  const cached = successfulElectionLoads.get(url);
  if (cached) return awaitWithSignal(Promise.resolve(cached), signal);

  let pending = pendingElectionLoads.get(url);
  if (!pending) {
    pending = getJson<ElectionResultsFile>(url)
      .then((data) => {
        if (data.schemaVersion !== MANIFEST_SCHEMA_VERSION || !Array.isArray(data.localities)) {
          throw new Error("The election result file is invalid.");
        }
        successfulElectionLoads.set(url, data);
        return data;
      })
      .finally(() => pendingElectionLoads.delete(url));
    pendingElectionLoads.set(url, pending);
  }

  return awaitWithSignal(pending, signal);
}

export async function loadGeometry(url: string, signal?: AbortSignal): Promise<unknown> {
  return getJson<unknown>(url, signal);
}
