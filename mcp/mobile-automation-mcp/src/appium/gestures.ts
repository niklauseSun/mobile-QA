import type { Browser, ChainablePromiseElement } from "webdriverio";
import type { MobileAdapter } from "../adapters/MobileAdapter.js";
import type { MobileSelector } from "../selectors/types.js";

export type SwipeDirection = "up" | "down" | "left" | "right";

export interface MobilePoint {
  x: number;
  y: number;
}

export interface SwipeOptionsInput {
  direction?: SwipeDirection;
  durationMs?: number;
  percent?: number;
  from?: MobilePoint;
  to?: MobilePoint;
}

export interface ScrollOptionsInput extends SwipeOptionsInput {
  selector?: MobileSelector;
  scrollableSelector?: MobileSelector;
  maxScrolls?: number;
  timeoutMs?: number;
}

export interface LongPressOptionsInput {
  selector?: MobileSelector;
  x?: number;
  y?: number;
  durationMs?: number;
  timeoutMs?: number;
}

export interface HideKeyboardOptionsInput {
  keys?: string[];
}

export interface DeepLinkOptionsInput {
  url: string;
  appIdentifier: string;
  waitForLaunch?: boolean;
}

export async function performSwipe(
  driver: Browser,
  options: SwipeOptionsInput
) {
  assertCompleteSwipeCoordinates(options);
  await driver.swipe(toWebdriverSwipeOptions(options));
}

export async function performScroll(
  driver: Browser,
  adapter: MobileAdapter,
  options: ScrollOptionsInput
) {
  assertCompleteSwipeCoordinates(options);

  const scrollableElement = options.scrollableSelector
    ? await driver.$(adapter.toDriverSelector(options.scrollableSelector))
    : undefined;

  const scrollOptions = stripUndefined({
    direction: options.direction,
    duration: options.durationMs,
    percent: options.percent,
    scrollableElement,
    maxScrolls: options.maxScrolls
  });

  if (options.selector) {
    const element = await driver.$(adapter.toDriverSelector(options.selector));
    await element.scrollIntoView(scrollOptions);
    await element.waitForDisplayed({ timeout: options.timeoutMs ?? 10000 });
    return;
  }

  const swipeOptions = toWebdriverSwipeOptions(options, scrollableElement);
  const repeatCount = options.maxScrolls ?? 1;

  for (let i = 0; i < repeatCount; i++) {
    await driver.swipe(swipeOptions);
  }
}

export async function performLongPress(
  driver: Browser,
  adapter: MobileAdapter,
  options: LongPressOptionsInput
) {
  assertLongPressTarget(options);

  const duration = options.durationMs ?? 1500;

  if (options.selector) {
    const element = await driver.$(adapter.toDriverSelector(options.selector));
    await element.waitForDisplayed({ timeout: options.timeoutMs ?? 10000 });
    await element.longPress(
      stripUndefined({
        x: options.x,
        y: options.y,
        duration
      })
    );
    return;
  }

  await driver
    .action("pointer", { parameters: { pointerType: "touch" } })
    .move({ x: options.x!, y: options.y!, duration: 0, origin: "viewport" })
    .down({ button: 0 })
    .pause(duration)
    .up({ button: 0 })
    .perform();
}

export async function hideKeyboard(
  driver: Browser,
  options: HideKeyboardOptionsInput = {}
) {
  return driver.execute(
    "mobile: hideKeyboard",
    stripUndefined({
      keys: options.keys
    })
  );
}

export async function openDeepLink(
  driver: Browser,
  options: DeepLinkOptionsInput
) {
  if (options.waitForLaunch === undefined) {
    return driver.deepLink(options.url, options.appIdentifier);
  }

  return driver.deepLink(
    options.url,
    options.appIdentifier,
    options.waitForLaunch
  );
}

export function assertCompleteSwipeCoordinates(options: SwipeOptionsInput) {
  if ((options.from && !options.to) || (!options.from && options.to)) {
    throw new Error("Swipe coordinates require both from and to points.");
  }
}

export function assertLongPressTarget(options: LongPressOptionsInput) {
  if (options.selector) {
    return;
  }

  if (options.x === undefined || options.y === undefined) {
    throw new Error("Long press requires either selector or both x and y.");
  }
}

function toWebdriverSwipeOptions(
  options: SwipeOptionsInput,
  scrollableElement?: WebdriverIO.Element | ChainablePromiseElement
) {
  return stripUndefined({
    direction: options.direction,
    duration: options.durationMs,
    percent: options.percent,
    from: options.from,
    to: options.to,
    scrollableElement
  });
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) {
      delete value[key];
    }
  }

  return value;
}
