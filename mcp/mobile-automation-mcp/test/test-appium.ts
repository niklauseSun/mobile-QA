import { remote } from "webdriverio";

async function main() {
  const driver = await remote({
    protocol: "http",
    hostname: "127.0.0.1",
    port: 4723,
    path: "/",
    capabilities: {
      platformName: "iOS",
    "appium:automationName": "XCUITest",
    "appium:deviceName": "iPhone 17",
    "appium:bundleId": "com.ggi.onemore.enterprise",
    "appium:noReset": true,
    "appium:newCommandTimeout": 300
    }
  });

  await driver.pause(3000);

  const source = await driver.getPageSource();
  console.log(source.slice(0, 1000));

  await driver.saveScreenshot("./screenshot.png");

  await driver.deleteSession();
}

main().catch(console.error);