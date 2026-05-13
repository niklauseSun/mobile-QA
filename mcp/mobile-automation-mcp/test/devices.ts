import assert from "node:assert/strict";
import {
  parseAdbDevices,
  parseSimctlDevices
} from "../src/appium/devices.js";

const androidDevices = parseAdbDevices(
  [
    "List of devices attached",
    "emulator-5554 device product:sdk_gphone64 model:Pixel_8 device:emu64 transport_id:1",
    "R5CT1234ABC unauthorized usb:336592896X product:demo model:Galaxy_S23 device:dm3q",
    "offline-1 offline"
  ].join("\n"),
  { includeUnavailable: true }
);

assert.deepEqual(androidDevices, [
  {
    platform: "android",
    id: "emulator-5554",
    name: "Pixel_8",
    state: "device",
    source: "adb",
    details: {
      product: "sdk_gphone64",
      model: "Pixel_8",
      device: "emu64",
      transport_id: "1"
    }
  },
  {
    platform: "android",
    id: "R5CT1234ABC",
    name: "Galaxy_S23",
    state: "unauthorized",
    source: "adb",
    details: {
      usb: "336592896X",
      product: "demo",
      model: "Galaxy_S23",
      device: "dm3q"
    }
  },
  {
    platform: "android",
    id: "offline-1",
    state: "offline",
    source: "adb",
    details: {}
  }
]);

assert.deepEqual(
  parseAdbDevices(
    [
      "List of devices attached",
      "emulator-5554 device model:Pixel_8",
      "offline-1 offline"
    ].join("\n")
  ).map((device) => device.id),
  ["emulator-5554"]
);

const iosDevices = parseSimctlDevices(
  JSON.stringify({
    devices: {
      "com.apple.CoreSimulator.SimRuntime.iOS-17-5": [
        {
          name: "iPhone 15",
          udid: "A-B-C",
          state: "Booted",
          isAvailable: true,
          deviceTypeIdentifier:
            "com.apple.CoreSimulator.SimDeviceType.iPhone-15"
        },
        {
          name: "iPhone 8",
          udid: "D-E-F",
          state: "Shutdown",
          isAvailable: false
        }
      ]
    }
  }),
  { includeUnavailable: true }
);

assert.deepEqual(iosDevices, [
  {
    platform: "ios",
    id: "A-B-C",
    name: "iPhone 15",
    state: "Booted",
    osVersion: "17.5",
    source: "simctl",
    details: {
      runtime: "com.apple.CoreSimulator.SimRuntime.iOS-17-5",
      deviceTypeIdentifier:
        "com.apple.CoreSimulator.SimDeviceType.iPhone-15",
      isAvailable: true
    }
  },
  {
    platform: "ios",
    id: "D-E-F",
    name: "iPhone 8",
    state: "Shutdown",
    osVersion: "17.5",
    source: "simctl",
    details: {
      runtime: "com.apple.CoreSimulator.SimRuntime.iOS-17-5",
      isAvailable: false
    }
  }
]);

assert.deepEqual(
  parseSimctlDevices(
    JSON.stringify({
      devices: {
        "com.apple.CoreSimulator.SimRuntime.iOS-17-5": [
          {
            name: "iPhone 15",
            udid: "A-B-C",
            state: "Booted",
            isAvailable: true
          },
          {
            name: "iPhone 8",
            udid: "D-E-F",
            state: "Shutdown",
            isAvailable: false
          }
        ]
      }
    })
  ).map((device) => device.id),
  ["A-B-C"]
);

console.log("devices parser test passed.");
