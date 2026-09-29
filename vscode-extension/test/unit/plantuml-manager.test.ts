import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  type DownloadProgress,
  downloadPlantUmlJar,
  getManagedJarPath,
  resolvePlantUmlJar,
} from '../../src/environment/plantuml-manager.js';

const FAKE_JAR = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64 * 1024, 1)]);

describe('plantuml-manager', () => {
  describe('getManagedJarPath', () => {
    it('should place the jar under bin/ in the global storage directory', () => {
      assert.strictEqual(
        getManagedJarPath('/storage'),
        path.join('/storage', 'bin', 'plantuml.jar')
      );
    });
  });

  describe('resolvePlantUmlJar', () => {
    const managed = getManagedJarPath('/storage');

    it('should prefer the configured jar path', () => {
      assert.deepStrictEqual(
        resolvePlantUmlJar('/custom/plantuml.jar', '/storage', { exists: () => true }),
        { path: '/custom/plantuml.jar', source: 'setting' }
      );
    });

    it('should fall back to the downloaded jar when the setting is empty', () => {
      assert.deepStrictEqual(
        resolvePlantUmlJar(undefined, '/storage', { exists: (p) => p === managed }),
        { path: managed, source: 'managed' }
      );
    });

    it('should fall back to Core well-known locations when nothing is downloaded', () => {
      assert.deepStrictEqual(
        resolvePlantUmlJar(undefined, '/storage', {
          exists: () => false,
          resolveCoreDefault: () => '/usr/share/plantuml/plantuml.jar',
        }),
        { path: '/usr/share/plantuml/plantuml.jar', source: 'auto' }
      );
    });

    it('should return undefined when no jar is available', () => {
      assert.strictEqual(
        resolvePlantUmlJar(undefined, '/storage', { exists: () => false }),
        undefined
      );
    });
  });

  describe('downloadPlantUmlJar', () => {
    let server: http.Server;
    let baseUrl: string;
    let tmpDir: string;

    before(async () => {
      server = http.createServer((req, res) => {
        if (req.url === '/redirect') {
          res.writeHead(302, { Location: '/plantuml.jar' });
          res.end();
        } else if (req.url === '/loop') {
          res.writeHead(302, { Location: '/loop' });
          res.end();
        } else if (req.url === '/plantuml.jar') {
          res.writeHead(200, { 'Content-Length': FAKE_JAR.length });
          res.end(FAKE_JAR);
        } else if (req.url === '/not-a-jar') {
          res.writeHead(200);
          res.end('<html>error page</html>');
        } else if (req.url === '/slow') {
          res.writeHead(200, { 'Content-Length': FAKE_JAR.length * 2 });
          res.write(FAKE_JAR);
        } else {
          res.writeHead(404);
          res.end();
        }
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    after(async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    beforeEach(async () => {
      tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'md-tech-pdf-jar-test-'));
    });

    afterEach(async () => {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    });

    it('should follow redirects, report progress, and save the jar', async () => {
      const dest = path.join(tmpDir, 'bin', 'plantuml.jar');
      const progress: DownloadProgress[] = [];
      await downloadPlantUmlJar(dest, {
        url: `${baseUrl}/redirect`,
        httpGet: http.get,
        onProgress: (p) => progress.push(p),
      });

      assert.deepStrictEqual(await fs.promises.readFile(dest), FAKE_JAR);
      assert.ok(progress.length > 0);
      assert.deepStrictEqual(progress[progress.length - 1], {
        receivedBytes: FAKE_JAR.length,
        totalBytes: FAKE_JAR.length,
      });
      assert.strictEqual(fs.existsSync(`${dest}.part`), false);
    });

    it('should reject HTTP errors without leaving files behind', async () => {
      const dest = path.join(tmpDir, 'plantuml.jar');
      await assert.rejects(
        downloadPlantUmlJar(dest, { url: `${baseUrl}/missing`, httpGet: http.get }),
        /HTTP status 404/
      );
      assert.deepStrictEqual(await fs.promises.readdir(tmpDir), []);
    });

    it('should stop after too many redirects', async () => {
      await assert.rejects(
        downloadPlantUmlJar(path.join(tmpDir, 'plantuml.jar'), {
          url: `${baseUrl}/loop`,
          httpGet: http.get,
        }),
        /Too many redirects/
      );
    });

    it('should reject a response that is not a jar archive and keep the previous jar', async () => {
      const dest = path.join(tmpDir, 'plantuml.jar');
      await fs.promises.writeFile(dest, 'previous');
      await assert.rejects(
        downloadPlantUmlJar(dest, { url: `${baseUrl}/not-a-jar`, httpGet: http.get }),
        /not a valid jar/
      );
      assert.strictEqual(await fs.promises.readFile(dest, 'utf-8'), 'previous');
      assert.strictEqual(fs.existsSync(`${dest}.part`), false);
    });

    it('should abort a download in progress and remove the partial file', async () => {
      const dest = path.join(tmpDir, 'plantuml.jar');
      const controller = new AbortController();
      await assert.rejects(
        downloadPlantUmlJar(dest, {
          url: `${baseUrl}/slow`,
          httpGet: http.get,
          signal: controller.signal,
          onProgress: () => controller.abort(),
        })
      );
      assert.strictEqual(controller.signal.aborted, true);
      assert.deepStrictEqual(await fs.promises.readdir(tmpDir), []);
    });
  });
});
