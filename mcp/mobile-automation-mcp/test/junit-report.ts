import assert from "node:assert/strict";
import { createJUnitReport } from "../src/reports/junit.js";

const xml = createJUnitReport({
  suiteName: "订单详情返回",
  testCases: [
    {
      name: "[1] tap home.orderEntry",
      timeMs: 125
    },
    {
      name: "[2] assertText 订单",
      timeMs: 300,
      failureMessage: "Element <订单> not displayed"
    }
  ]
});

assert.match(xml, /<testsuite name="订单详情返回" tests="2" failures="1" time="0.425">/);
assert.match(xml, /<testcase name="\[1\] tap home\.orderEntry" time="0.125"\/>/);
assert.match(xml, /<failure message="Element &lt;订单&gt; not displayed">/);

console.log("junit report test passed.");
