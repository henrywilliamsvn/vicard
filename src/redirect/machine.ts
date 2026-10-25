// Deterministic redirect state machine — dependency-free.
// Pure transition function `reduce(state, event) => state`, mirroring the
// XState chart in Outbox/MeoSanSales-Redirect-StateMachine-Architecture.
// The React hook (useRedirectMachine) runs the side-effects per state.
import type { Network, Platform } from "./adapters";

export type RState =
  | "idle"
  | "validatingSession"
  | "injectingSubId"
  | "renderingExclusions"
  | "countdown"
  | "resolvingTarget"
  | "executingAppRedirect"
  | "executingWebRedirect"
  | "redirected"
  | "webFallback"
  | "sessionBlocked"
  | "error"
  | "aborted";

export interface RContext {
  merchant: string;
  network: Network;
  baseUrl: string;
  rate?: number;
  userId: string | null;
  tripId: string;
  finalUrl: string | null;
  platform: Platform;
  countdown: number;
  error?: "SESSION" | "SUBID" | "UNKNOWN";
}

export type REvent =
  | { type: "ARM"; merchant: string; network: Network; baseUrl: string; rate?: number; platform: Platform; userId: string | null }
  | { type: "SESSION_OK" }
  | { type: "SESSION_FAIL" }
  | { type: "SUBID_READY"; finalUrl: string }
  | { type: "SUBID_FAIL" }
  | { type: "DWELL_DONE" }
  | { type: "TICK" }
  | { type: "SKIP" }
  | { type: "CANCEL" }
  | { type: "RETRY" }
  | { type: "APP_FOREGROUND_LOST" }
  | { type: "APP_TIMEOUT" };

export interface RMachine {
  state: RState;
  context: RContext;
}

export const DELAYS = { DWELL: 600, COUNTDOWN_STEP: 1000, APP_FALLBACK: 1500 } as const;
const GUEST_REDIRECT_ALLOWED = true; // flip to false to require login for attribution
const START_COUNTDOWN = 3;

export function createInitial(): RMachine {
  return {
    state: "idle",
    context: {
      merchant: "",
      network: "direct",
      baseUrl: "",
      userId: null,
      tripId: "",
      finalUrl: null,
      platform: "desktop",
      countdown: START_COUNTDOWN,
      rate: undefined,
      error: undefined,
    },
  };
}

const FINAL: RState[] = ["redirected", "webFallback", "aborted"];

// Pure transition. Deterministic: unknown (state,event) pairs are a no-op.
export function reduce(m: RMachine, e: REvent): RMachine {
  const { state, context } = m;

  // CANCEL is honoured in every non-final state.
  if (e.type === "CANCEL" && !FINAL.includes(state)) {
    return { state: "aborted", context };
  }

  switch (state) {
    case "idle":
      if (e.type === "ARM") {
        return {
          state: "validatingSession",
          context: {
            ...context,
            merchant: e.merchant,
            network: e.network,
            baseUrl: e.baseUrl,
            rate: e.rate,
            platform: e.platform,
            userId: e.userId,
            tripId: safeUuid(),
            countdown: START_COUNTDOWN,
            finalUrl: null,
            error: undefined,
          },
        };
      }
      return m;

    case "validatingSession":
      if (e.type === "SESSION_OK") {
        const allowed = context.userId !== null || GUEST_REDIRECT_ALLOWED;
        return { state: allowed ? "injectingSubId" : "sessionBlocked", context };
      }
      if (e.type === "SESSION_FAIL") return { state: "sessionBlocked", context };
      return m;

    case "injectingSubId":
      if (e.type === "SUBID_READY") return { state: "renderingExclusions", context: { ...context, finalUrl: e.finalUrl } };
      if (e.type === "SUBID_FAIL") return { state: "error", context: { ...context, error: "SUBID" } };
      return m;

    case "renderingExclusions":
      if (e.type === "DWELL_DONE") return { state: "countdown", context };
      return m;

    case "countdown":
      if (e.type === "TICK") {
        if (context.countdown > 1) return { state: "countdown", context: { ...context, countdown: context.countdown - 1 } };
        return { state: "resolvingTarget", context: { ...context, countdown: 0 } };
      }
      if (e.type === "SKIP") return { state: "resolvingTarget", context };
      return m;

    case "resolvingTarget":
      // transient — resolved immediately by the hook via SKIP-less auto events
      return m;

    case "executingAppRedirect":
      if (e.type === "APP_FOREGROUND_LOST") return { state: "redirected", context };
      if (e.type === "APP_TIMEOUT" || e.type === "SKIP") return { state: "executingWebRedirect", context };
      return m;

    case "executingWebRedirect":
      return m; // terminal side-effect handled by the hook → webFallback/redirected

    case "sessionBlocked":
      if (e.type === "RETRY") return { state: "validatingSession", context };
      return m;

    case "error":
      if (e.type === "RETRY") return { state: "injectingSubId", context };
      return m;

    default:
      return m;
  }
}

// Helper the hook uses to advance the transient `resolvingTarget` state.
export function resolveTarget(m: RMachine): RMachine {
  if (m.state !== "resolvingTarget") return m;
  const next: RState = m.context.platform !== "desktop" ? "executingAppRedirect" : "executingWebRedirect";
  return { state: next, context: m.context };
}

function safeUuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return String(Date.now()) + Math.random().toString(16).slice(2);
  }
}
