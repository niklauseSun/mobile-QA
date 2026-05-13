import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  createArtifactResourceUri,
  listArtifactResources,
  readArtifactResource
} from "../src/evidence/resources.js";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mobile-artifacts-"));
const artifactsDir = path.join(tempRoot, "artifacts");

await fs.mkdir(path.join(artifactsDir, "screenshots"), { recursive: true });
await fs.mkdir(path.join(artifactsDir, "page-source"), { recursive: true });
await fs.mkdir(path.join(artifactsDir, "runs", "run-1", "screenshots"), {
  recursive: true
});
await fs.mkdir(path.join(artifactsDir, "runs", "run-1", "page-source"), {
  recursive: true
});
await fs.mkdir(path.join(artifactsDir, "logs"), { recursive: true });

const screenshotPath = path.join(artifactsDir, "screenshots", "home.png");
const pageSourcePath = path.join(artifactsDir, "page-source", "source.xml");
const reportPath = path.join(artifactsDir, "runs", "run-1", "report.md");
const junitPath = path.join(artifactsDir, "runs", "run-1", "junit.xml");
const logPath = path.join(artifactsDir, "logs", "logcat.log");
const runScreenshotPath = path.join(
  artifactsDir,
  "runs",
  "run-1",
  "screenshots",
  "001-home.png"
);
const runSourcePath = path.join(
  artifactsDir,
  "runs",
  "run-1",
  "page-source",
  "001-source.xml"
);

await fs.writeFile(screenshotPath, Buffer.from([1, 2, 3]));
await fs.writeFile(pageSourcePath, "<App><Text>Home</Text></App>", "utf-8");
await fs.writeFile(reportPath, "# Mobile Flow Report\n\n- Result: PASSED\n", "utf-8");
await fs.writeFile(junitPath, "<testsuite></testsuite>", "utf-8");
await fs.writeFile(logPath, "logcat line\n", "utf-8");
await fs.writeFile(runScreenshotPath, Buffer.from([4, 5, 6]));
await fs.writeFile(runSourcePath, "<App><Text>Failure</Text></App>", "utf-8");

const resources = await listArtifactResources({ baseDir: artifactsDir });
const uris = resources.map((resource) => resource.uri).sort();

assert.equal(resources.length, 7);
assert.ok(uris.includes(createArtifactResourceUri(screenshotPath, { baseDir: artifactsDir })));
assert.ok(uris.includes(createArtifactResourceUri(pageSourcePath, { baseDir: artifactsDir })));
assert.ok(uris.includes(createArtifactResourceUri(reportPath, { baseDir: artifactsDir })));
assert.ok(uris.includes(createArtifactResourceUri(junitPath, { baseDir: artifactsDir })));
assert.ok(uris.includes(createArtifactResourceUri(logPath, { baseDir: artifactsDir })));

const screenshot = await readArtifactResource(
  createArtifactResourceUri(screenshotPath, { baseDir: artifactsDir }),
  { baseDir: artifactsDir }
);
assert.equal(screenshot.contents[0].mimeType, "image/png");
assert.equal("blob" in screenshot.contents[0], true);

const report = await readArtifactResource(
  createArtifactResourceUri(reportPath, { baseDir: artifactsDir }),
  { baseDir: artifactsDir }
);
assert.equal(report.contents[0].mimeType, "text/markdown");
assert.match("text" in report.contents[0] ? report.contents[0].text : "", /PASSED/);

const pageSource = await readArtifactResource(
  createArtifactResourceUri(pageSourcePath, { baseDir: artifactsDir }),
  { baseDir: artifactsDir }
);
assert.equal(pageSource.contents[0].mimeType, "application/xml");
assert.match("text" in pageSource.contents[0] ? pageSource.contents[0].text : "", /Home/);

const log = await readArtifactResource(
  createArtifactResourceUri(logPath, { baseDir: artifactsDir }),
  { baseDir: artifactsDir }
);
assert.equal(log.contents[0].mimeType, "text/plain");
assert.match("text" in log.contents[0] ? log.contents[0].text : "", /logcat/);

await assert.rejects(
  () =>
    readArtifactResource(
      "mobile-artifact://artifact/report/..%2Fsecret.txt",
      { baseDir: artifactsDir }
    ),
  /Invalid artifact path/
);

await fs.rm(tempRoot, { recursive: true, force: true });

console.log("artifact resources test passed.");
