import * as fs from 'node:fs';
import type * as http from 'node:http';
import * as https from 'node:https';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';

export const PLANTUML_JAR_DOWNLOAD_URL =
  'https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar';

const MAX_REDIRECTS = 5;
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export type PlantUmlJarSource = 'setting' | 'managed' | 'auto';

export interface ResolvedPlantUmlJar {
  path: string;
  source: PlantUmlJarSource;
}

export interface DownloadProgress {
  receivedBytes: number;
  totalBytes?: number;
}

export type HttpGet = (
  url: string,
  options: https.RequestOptions,
  callback: (response: http.IncomingMessage) => void
) => http.ClientRequest;

export interface DownloadOptions {
  url?: string;
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
  httpGet?: HttpGet;
}

/**
 * Location of the jar downloaded by md-tech-pdf inside the extension global storage.
 */
export function getManagedJarPath(globalStorageDir: string): string {
  return path.join(globalStorageDir, 'bin', 'plantuml.jar');
}

/**
 * Resolves the PlantUML jar in priority order:
 * configured setting, jar downloaded by md-tech-pdf, then Core's well-known locations.
 */
export function resolvePlantUmlJar(
  configuredPath: string | undefined,
  globalStorageDir: string | undefined,
  options: {
    exists?: (filePath: string) => boolean;
    resolveCoreDefault?: () => string | undefined;
  } = {}
): ResolvedPlantUmlJar | undefined {
  if (configuredPath) {
    return { path: configuredPath, source: 'setting' };
  }

  const exists = options.exists ?? fs.existsSync;
  if (globalStorageDir) {
    const managedPath = getManagedJarPath(globalStorageDir);
    if (exists(managedPath)) {
      return { path: managedPath, source: 'managed' };
    }
  }

  const coreDefault = options.resolveCoreDefault?.();
  return coreDefault ? { path: coreDefault, source: 'auto' } : undefined;
}

function requestFollowingRedirects(
  url: string,
  httpGet: HttpGet,
  signal: AbortSignal | undefined,
  redirectsLeft: number
): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const request = httpGet(
      url,
      { signal, headers: { 'User-Agent': 'md-tech-pdf-vscode' } },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;

        if (status >= 300 && status < 400 && location) {
          response.resume();
          if (redirectsLeft <= 0) {
            reject(new Error(`Too many redirects while downloading ${url}`));
            return;
          }
          const nextUrl = new URL(location, url).toString();
          requestFollowingRedirects(nextUrl, httpGet, signal, redirectsLeft - 1).then(
            resolve,
            reject
          );
          return;
        }

        if (status !== 200) {
          response.resume();
          reject(new Error(`Download failed with HTTP status ${status}: ${url}`));
          return;
        }

        resolve(response);
      }
    );
    request.on('error', reject);
  });
}

async function assertZipArchive(filePath: string): Promise<void> {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const header = Buffer.alloc(ZIP_SIGNATURE.length);
    await handle.read(header, 0, header.length, 0);
    if (!header.equals(ZIP_SIGNATURE)) {
      throw new Error('Downloaded file is not a valid jar archive.');
    }
  } finally {
    await handle.close();
  }
}

/**
 * Streams the PlantUML jar to destPath.
 * Writes to a temporary `.part` file and only replaces destPath after a verified download.
 */
export async function downloadPlantUmlJar(
  destPath: string,
  options: DownloadOptions = {}
): Promise<void> {
  const httpGet = options.httpGet ?? https.get;
  const partPath = `${destPath}.part`;
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });

  try {
    const response = await requestFollowingRedirects(
      options.url ?? PLANTUML_JAR_DOWNLOAD_URL,
      httpGet,
      options.signal,
      MAX_REDIRECTS
    );

    const contentLength = Number(response.headers['content-length']);
    const totalBytes =
      Number.isFinite(contentLength) && contentLength > 0 ? contentLength : undefined;
    let receivedBytes = 0;
    response.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;
      options.onProgress?.({ receivedBytes, totalBytes });
    });

    await pipeline(response, fs.createWriteStream(partPath), { signal: options.signal });
    await assertZipArchive(partPath);
    await fs.promises.rename(partPath, destPath);
  } catch (err: unknown) {
    await fs.promises.rm(partPath, { force: true });
    throw err;
  }
}
