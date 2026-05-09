import assert from "node:assert/strict";
import { describePageSource } from "../src/screen/describe.js";

const iosSource = `
<AppiumAUT>
  <XCUIElementTypeWindow type="XCUIElementTypeWindow" visible="true" enabled="true">
    <XCUIElementTypeButton type="XCUIElementTypeButton" name="login.submit" label="登录" visible="true" enabled="true"/>
    <XCUIElementTypeStaticText type="XCUIElementTypeStaticText" name="hidden.tip" label="隐藏提示" visible="false" enabled="true"/>
    <XCUIElementTypeOther type="XCUIElementTypeOther" visible="true" enabled="true"/>
  </XCUIElementTypeWindow>
</AppiumAUT>
`;

const androidSource = `
<hierarchy>
  <node class="android.widget.FrameLayout" displayed="true" enabled="true" bounds="[0,0][100,100]">
    <node class="android.widget.TextView" text="首页" resource-id="com.demo:id/title" displayed="true" enabled="true" bounds="[8,8][80,40]"/>
    <node class="android.widget.Button" content-desc="settings.button" displayed="false" enabled="false" bounds="[8,48][80,88]"/>
  </node>
</hierarchy>
`;

const iosVisible = describePageSource(iosSource);
assert.deepEqual(iosVisible.elements, [
  {
    role: "Button",
    text: "登录",
    accessibilityId: "login.submit",
    className: "XCUIElementTypeButton",
    visible: true,
    enabled: true
  }
]);

const iosWithInvisible = describePageSource(iosSource, {
  includeInvisible: true
});
assert.equal(iosWithInvisible.elements.length, 2);
assert.equal(iosWithInvisible.elements[1].visible, false);

const androidVisible = describePageSource(androidSource);
assert.deepEqual(androidVisible.elements, [
  {
    role: "TextView",
    text: "首页",
    resourceId: "com.demo:id/title",
    className: "android.widget.TextView",
    visible: true,
    enabled: true,
    bounds: "[8,8][80,40]"
  }
]);

const androidLimited = describePageSource(androidSource, {
  includeInvisible: true,
  maxElements: 1
});
assert.equal(androidLimited.elements.length, 1);

console.log("describe_screen parser test passed.");
