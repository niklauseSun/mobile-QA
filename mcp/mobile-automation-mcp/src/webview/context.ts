import type { Browser } from "webdriverio";

export type ContextName = string;

type ContextLike =
  | string
  | {
      id?: string;
      name?: string;
    };

type ContextDriver = Browser & {
  getContext?: () => Promise<ContextLike>;
  getContexts?: () => Promise<ContextLike[]>;
  switchContext?: (context: string) => Promise<void>;
};

export async function getContexts(driver: Browser): Promise<ContextLike[]> {
  const contextDriver = driver as ContextDriver;

  if (!contextDriver.getContexts) {
    throw new Error("Current driver does not support getContexts().");
  }

  return contextDriver.getContexts();
}

export async function switchContext(
  driver: Browser,
  context: ContextName
): Promise<void> {
  const contextDriver = driver as ContextDriver;

  if (!contextDriver.switchContext) {
    throw new Error("Current driver does not support switchContext().");
  }

  await contextDriver.switchContext(context);
}

export async function requireWebViewContext(driver: Browser): Promise<string> {
  const context = await getCurrentContext(driver);

  if (!isWebViewContext(context)) {
    throw new Error(
      `Current context is ${context}. Switch to a WEBVIEW context with mobile_switch_context before using WebView tools.`
    );
  }

  return context;
}

export async function getCurrentContext(driver: Browser): Promise<string> {
  const contextDriver = driver as ContextDriver;

  if (!contextDriver.getContext) {
    throw new Error("Current driver does not support getContext().");
  }

  return contextToName(await contextDriver.getContext());
}

export function isWebViewContext(context: string): boolean {
  return context.toUpperCase().startsWith("WEBVIEW");
}

function contextToName(context: ContextLike): string {
  if (typeof context === "string") {
    return context;
  }

  return context.id ?? context.name ?? "UNKNOWN";
}
