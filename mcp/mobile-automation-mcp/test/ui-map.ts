import assert from "node:assert/strict";
import { buildUiMap, findSelectors } from "../src/screen/uiMap.js";

const androidSource = `
<hierarchy>
  <node class="android.widget.FrameLayout" displayed="true" enabled="true" bounds="[0,0][360,800]">
    <node class="android.widget.TextView" text="首页" resource-id="com.demo:id/title" displayed="true" enabled="true" bounds="[8,8][120,40]"/>
    <node class="android.widget.Button" text="登录" content-desc="login.submit" resource-id="com.demo:id/login" displayed="true" enabled="true" clickable="true" bounds="[20,300][340,356]"/>
    <node class="android.widget.TextView" text="隐藏提示" content-desc="hidden.tip" displayed="false" enabled="true" bounds="[20,400][340,430]"/>
  </node>
</hierarchy>
`;

const androidMap = buildUiMap(androidSource, {
  platform: "android",
  runtime: "android-native"
});

assert.equal(androidMap.summary.totalElements, 3);
assert.equal(androidMap.summary.visibleElements, 2);
assert.equal(androidMap.elements.length, 2);
assert.deepEqual(androidMap.elements[1].selectors.slice(0, 3), [
  {
    strategy: "accessibilityId",
    value: "login.submit",
    score: 100,
    reason: "accessibility id"
  },
  {
    strategy: "resourceId",
    value: "com.demo:id/login",
    score: 95,
    reason: "android resource id"
  },
  {
    strategy: "text",
    value: "登录",
    score: 70,
    reason: "visible text"
  }
]);

const hiddenMatches = findSelectors(androidSource, {
  query: "hidden.tip",
  platform: "android",
  runtime: "android-native"
});
assert.equal(hiddenMatches.matches.length, 0);

const includedHiddenMatches = findSelectors(androidSource, {
  query: "hidden.tip",
  platform: "android",
  runtime: "android-native",
  includeInvisible: true
});
assert.equal(includedHiddenMatches.matches.length, 1);
assert.equal(
  includedHiddenMatches.matches[0].selectors[0].value,
  "hidden.tip"
);

const iosSource = `
<AppiumAUT>
  <XCUIElementTypeWindow type="XCUIElementTypeWindow" visible="true" enabled="true">
    <XCUIElementTypeButton type="XCUIElementTypeButton" name="login.submit" label="登录" visible="true" enabled="true"/>
    <XCUIElementTypeTextField type="XCUIElementTypeTextField" name="login.phone" value="手机号" visible="true" enabled="true"/>
  </XCUIElementTypeWindow>
</AppiumAUT>
`;

const iosMap = buildUiMap(iosSource, {
  platform: "ios",
  runtime: "ios-native"
});

assert.equal(iosMap.elements.length, 2);
assert.deepEqual(iosMap.elements[0].selectors.slice(0, 2), [
  {
    strategy: "accessibilityId",
    value: "login.submit",
    score: 100,
    reason: "accessibility id"
  },
  {
    strategy: "iosPredicate",
    value: 'name == "login.submit"',
    score: 90,
    reason: "ios name predicate"
  }
]);

const iosMatches = findSelectors(iosSource, {
  query: "手机号",
  platform: "ios",
  runtime: "ios-native",
  exact: true
});
assert.equal(iosMatches.matches.length, 1);
assert.equal(iosMatches.matches[0].element.role, "TextField");
assert.ok(
  iosMatches.matches[0].selectors.some(
    (selector) =>
      selector.strategy === "iosPredicate" &&
      selector.value === 'value == "手机号"'
  )
);

console.log("ui map selector discovery test passed.");
