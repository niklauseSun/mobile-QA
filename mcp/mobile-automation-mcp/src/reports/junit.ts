export interface JUnitTestCase {
  name: string;
  timeMs: number;
  failureMessage?: string;
}

export interface JUnitReport {
  suiteName: string;
  testCases: JUnitTestCase[];
}

export function createJUnitReport(report: JUnitReport): string {
  const failures = report.testCases.filter((testCase) => testCase.failureMessage);
  const totalTimeSeconds = report.testCases.reduce(
    (total, testCase) => total + msToSeconds(testCase.timeMs),
    0
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<testsuite name="${escapeXml(report.suiteName)}" tests="${report.testCases.length}" failures="${failures.length}" time="${formatSeconds(totalTimeSeconds)}">`,
    ...report.testCases.map(createTestCaseXml),
    `</testsuite>`,
    ``
  ].join("\n");
}

function createTestCaseXml(testCase: JUnitTestCase): string {
  const attrs = `name="${escapeXml(testCase.name)}" time="${formatSeconds(
    msToSeconds(testCase.timeMs)
  )}"`;

  if (!testCase.failureMessage) {
    return `  <testcase ${attrs}/>`;
  }

  const message = escapeXml(testCase.failureMessage);

  return [
    `  <testcase ${attrs}>`,
    `    <failure message="${message}">${message}</failure>`,
    `  </testcase>`
  ].join("\n");
}

function msToSeconds(ms: number): number {
  return Math.max(ms, 0) / 1000;
}

function formatSeconds(seconds: number): string {
  return seconds.toFixed(3);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
