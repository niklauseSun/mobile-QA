import type { MobilePlatform, MobileRuntime } from "../selectors/types.js";

export interface MobileSessionConfig {
  platform: MobilePlatform;
  runtime: MobileRuntime;

  appiumServerUrl?: string;

  deviceName?: string;
  platformVersion?: string;

  app?: string;

  bundleId?: string;

  appPackage?: string;
  appActivity?: string;

  noReset?: boolean;
  fullReset?: boolean;
  newCommandTimeout?: number;
}

export function createCapabilities(config: MobileSessionConfig) {
  if (config.platform === "ios") {
    return {
      platformName: "iOS",
      "appium:automationName": "XCUITest",
      "appium:deviceName": config.deviceName ?? "iPhone 15",
      "appium:platformVersion": config.platformVersion,
      "appium:app": config.app,
      "appium:bundleId": config.bundleId,
      "appium:noReset": config.noReset ?? true,
      "appium:fullReset": config.fullReset ?? false,
      "appium:newCommandTimeout": config.newCommandTimeout ?? 300
    };
  }

  return {
    platformName: "Android",
    "appium:automationName": "UiAutomator2",
    "appium:deviceName": config.deviceName ?? "Android Emulator",
    "appium:app": config.app,
    "appium:appPackage": config.appPackage,
    "appium:appActivity": config.appActivity,
    "appium:noReset": config.noReset ?? true,
    "appium:fullReset": config.fullReset ?? false,
    "appium:newCommandTimeout": config.newCommandTimeout ?? 300
  };
}