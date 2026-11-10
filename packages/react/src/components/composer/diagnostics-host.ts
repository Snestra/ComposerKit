import {
  classifyFailure,
  normalizeDiagnosticsId,
  redactReportMessage,
} from "@workspace/react/components/composer/diagnostics-report";
import type {
  DiagnosticsSurface,
  FailureClassification,
} from "@workspace/react/components/composer/diagnostics-report";
import type { SubmitDiagnosticsHost } from "@workspace/react/components/composer/submit-error";

/*
 * The diagnostics host behind the "View diagnostics" toast action: the host
 * function with its store and view selector. The gate, the router and the host
 * lookup are
 * the app services the component reads; here each is a function the caller
 * supplies, so a demonstration drives them with local data.
 */

interface DiagnosticsReportInput {
  conversationId: string | null;
  errorMessage: string;
  occurredAtMs: number;
  operation: string;
  surface: DiagnosticsSurface;
}

/** The report as the diagnostics view reads it. */
interface DiagnosticsReport extends DiagnosticsReportInput {
  initialClassification: FailureClassification;
}

/** The stored report with where it was made. */
interface StoredDiagnostics {
  hostId: string | null;
  pathname: string | null;
  report: DiagnosticsReport;
}

/** The router the click navigates with. Each navigation says whether it happened. */
interface DiagnosticsRouter {
  /** The conversation id of the current route. */
  conversationIdFromPath: (pathname: string) => string | null;
  navigate: (path: string) => boolean;
  navigateToLocalConversation: (
    conversationId: string,
    hostId?: string
  ) => boolean;
  pathForConversation: (conversationId: string) => string;
  pathname: string | null;
}

interface DiagnosticsHostServices {
  /** The diagnostics feature gate. */
  isGateOn: () => boolean;
  /** The host a code conversation runs on ("local" or a remote host id). */
  hostIdFor: (conversationId: string | null) => string | null | undefined;
  router: () => DiagnosticsRouter;
}

/** What the diagnostics view is showing. */
interface DiagnosticsViewContext {
  conversationId: string | null;
  hostId: string | null;
  pathname: string | null;
  surface: DiagnosticsSurface;
}

const createDiagnosticsStore = () => {
  let current: StoredDiagnostics | null = null;
  const listeners = new Set<() => void>();

  return {
    get: () => current,
    /** The stored report when it belongs to what the view shows, else null. */
    select: (view: DiagnosticsViewContext) => {
      if (
        current === null ||
        current.report.surface !== view.surface ||
        current.hostId !== view.hostId
      ) {
        return null;
      }

      if (current.report.conversationId === null) {
        return current.pathname === view.pathname ? current : null;
      }

      return current.report.conversationId === view.conversationId
        ? current
        : null;
    },
    set: (next: StoredDiagnostics | null) => {
      current = next;

      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

type DiagnosticsStore = ReturnType<typeof createDiagnosticsStore>;

const prepareReport = (
  services: DiagnosticsHostServices,
  input: DiagnosticsReportInput
) => {
  const report: DiagnosticsReport = {
    ...input,
    conversationId: normalizeDiagnosticsId(input.conversationId),
    errorMessage: redactReportMessage(input.errorMessage),
    initialClassification: classifyFailure(
      input.errorMessage,
      undefined,
      input.surface
    ),
  };

  return {
    hostId:
      input.surface === "code"
        ? (services.hostIdFor(report.conversationId) ?? null)
        : null,
    pathname: services.router().pathname ?? null,
    report,
  };
};

/** The click handler of one prepared diagnostics report. */
const clickHandlerFor = (
  services: DiagnosticsHostServices,
  store: DiagnosticsStore,
  prepared: {
    hostId: string | null;
    pathname: string | null;
    report: DiagnosticsReport;
  }
) => {
  const { hostId, pathname, report } = prepared;

  /** Whether the router agreed to show the report's place; the report is stored only then. */
  const navigate = () => {
    const router = services.router();

    if (report.conversationId === null) {
      return (
        pathname === null ||
        pathname === router.pathname ||
        router.navigate(pathname)
      );
    }

    if (report.surface === "code") {
      const target = hostId === "local" ? undefined : (hostId ?? undefined);

      return router.navigateToLocalConversation(report.conversationId, target);
    }

    return (
      router.conversationIdFromPath(router.pathname ?? "") ===
        report.conversationId ||
      router.navigate(router.pathForConversation(report.conversationId))
    );
  };

  return () => {
    if (services.isGateOn() && navigate()) {
      store.set({ hostId, pathname, report });
    }
  };
};

/**
 * With the gate off `prepare` returns nothing and the toast has no
 * action. With it on, `prepare` builds the report now (classified, scrubbed,
 * with a checked conversation id and the current pathname) and returns the
 * click handler, which navigates and then stores the report for the view.
 */
const createDiagnosticsHost = (
  services: DiagnosticsHostServices,
  store: DiagnosticsStore
): SubmitDiagnosticsHost => ({
  prepare: (input: DiagnosticsReportInput) =>
    services.isGateOn()
      ? clickHandlerFor(services, store, prepareReport(services, input))
      : undefined,
});

export { createDiagnosticsHost, createDiagnosticsStore };

export type {
  DiagnosticsHostServices,
  DiagnosticsReport,
  DiagnosticsReportInput,
  DiagnosticsRouter,
  DiagnosticsStore,
  DiagnosticsViewContext,
  StoredDiagnostics,
};
