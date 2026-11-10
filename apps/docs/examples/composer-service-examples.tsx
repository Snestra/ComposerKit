"use client";

import { createErrorAnalyticsDelivery } from "@workspace/react/components/composer/analytics-delivery";
import type { AnalyticsEventPayload } from "@workspace/react/components/composer/analytics-delivery";
import { ApprovalReason } from "@workspace/react/components/composer/approval-card";
import {
  createDiagnosticsHost,
  createDiagnosticsStore,
} from "@workspace/react/components/composer/diagnostics-host";
import type {
  DiagnosticsRouter,
  DiagnosticsViewContext,
} from "@workspace/react/components/composer/diagnostics-host";
import { ComposerEditor } from "@workspace/react/components/composer/editor/composer-editor";
import type { ComposerEditorController } from "@workspace/react/components/composer/editor/controller";
import { ApprovalReasonLink } from "@workspace/react/components/composer/reason-link";
import type { ReasonLinkAppearance } from "@workspace/react/components/composer/reason-link";
import {
  AppHttpError,
  AppRequestError,
  ComposerSubmitError,
  createSubmitFailureHandler,
  FollowUpConfirmationCancelledError,
  PresentationSuggestionCloudUnsupportedError,
  ProjectContextSyncError,
  ReplyTextOnlyError,
} from "@workspace/react/components/composer/submit-error";
import {
  COMPOSER_TIP_CATALOG,
  ComposerTipSelector,
  createImpressionLog,
  SITES_PLUGIN_ID,
} from "@workspace/react/components/composer/tip-selection";
import type {
  ComposerTipBeacon,
  ComposerTipEligibility,
  ComposerTipEvent,
  ComposerTipHost,
} from "@workspace/react/components/composer/tip-selection";
import {
  ExternalResourcePolicyContext,
  LinkProviderContext,
} from "@workspace/react/components/markdown/external-link";
import type {
  ExternalResourcePolicy,
  LinkProviderProps,
} from "@workspace/react/components/markdown/external-link";
import { Button } from "@workspace/react/components/ui/button";
import { ToastProvider, useToast } from "@workspace/react/components/ui/toast";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

const ACTION_BUTTON = { color: "outline", size: "composerSm" } as const;

const Section = ({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description: string;
  id: string;
  title: string;
}) => (
  <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h2>
    <p className="text-sm text-muted-foreground">{description}</p>
    {children}
  </section>
);

const Check = ({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex items-center gap-2 text-sm">
    <input
      checked={checked}
      type="checkbox"
      onChange={(event) => {
        onChange(event.target.checked);
      }}
    />
    {label}
  </label>
);

const Pick = <Value extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: Value) => void;
  options: readonly Value[];
  value: Value;
}) => (
  <label className="flex items-center gap-2 text-sm">
    {label}
    <select
      className="rounded-md border bg-background px-2 py-1"
      value={value}
      onChange={(event) => {
        onChange(
          options.find((option) => option === event.target.value) ?? value
        );
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

/* ---------------------------------------------------------------- submit failure handler and diagnostics host */

const failureCases: readonly (readonly [string, () => Error, string])[] = [
  [
    "Rejected name",
    () => new AppHttpError("bad", 400, "invalid_name"),
    "local",
  ],
  [
    "Slide suggestion in Cloud",
    () => new PresentationSuggestionCloudUnsupportedError(),
    "cloud",
  ],
  ["Reply with images", () => new ReplyTextOnlyError(), "local"],
  [
    "Error with its own message",
    () => new ComposerSubmitError("Pick a model first"),
    "local",
  ],
  [
    "Model unavailable",
    () =>
      Object.assign(new Error("This model is not available"), {
        code: "model-unavailable",
      }),
    "local",
  ],
  [
    "App request error",
    () => new AppRequestError("Server asked to retry", 503),
    "local",
  ],
  [
    "Project sync error (ignored)",
    () => new ProjectContextSyncError(),
    "local",
  ],
  [
    "Confirmation cancelled (ignored)",
    () => new FollowUpConfirmationCancelledError(),
    "local",
  ],
  [
    "Abort (ignored)",
    () => Object.assign(new Error("aborted"), { name: "AbortError" }),
    "local",
  ],
  ["Local failure", () => new Error("disk full"), "local"],
  ["Worktree failure", () => new Error("disk full"), "worktree"],
  ["Cloud failure", () => new Error("quota exceeded"), "cloud"],
];

interface MessagePreset {
  label: string;
  text: string;
}

const MESSAGE_PRESETS: readonly MessagePreset[] = [
  { label: "Plain message", text: "disk full" },
  {
    label: "Message with secrets and paths",
    text: [
      "Request failed with status 502",
      "Authorization: Bearer abcdef0123456789ghijkl",
      "GITHUB_TOKEN=ghp_0123456789abcdefghijklmnopqrstuvwxyzAB",
      "open /Users/dev/project/src/app.ts failed",
      "reply to dev@company.test",
      "connection reset (ECONNRESET)",
    ].join("\n"),
  },
  {
    label: "Rate limit message",
    text: "429 Too Many Requests: rate limit hit",
  },
  {
    label: "Sandbox message",
    text: "sandbox denied the write: operation not permitted",
  },
];

const HOST_CHOICES = ["local", "remote-1"] as const;

type HostChoice = (typeof HOST_CHOICES)[number];

/** The app state the diagnostics services read. It is a store so a toast action reads it live when it is clicked. */
interface DemoEnvironment {
  conversationId: string;
  gateOn: boolean;
  hostChoice: HostChoice;
  navigationWorks: boolean;
  pathname: string;
  routerLog: readonly string[];
}

const createEnvironment = () => {
  let current: DemoEnvironment = {
    conversationId: "conversation-1",
    gateOn: true,
    hostChoice: "local",
    navigationWorks: true,
    pathname: "/gallery/composer",
    routerLog: [],
  };

  const listeners = new Set<() => void>();

  return {
    get: () => current,
    set: (patch: Partial<DemoEnvironment>) => {
      current = { ...current, ...patch };

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

type Environment = ReturnType<typeof createEnvironment>;

/** The conversation id of a /c/<id> path, or null. */
const conversationIdFromPath = (path: string) => {
  const [leading, prefix, id, ...rest] = path.split("/");

  return leading === "" &&
    prefix === "c" &&
    id !== undefined &&
    id !== "" &&
    rest.length === 0
    ? id
    : null;
};

const createDemoRouter = (environment: Environment): DiagnosticsRouter => {
  const log = (entry: string) => {
    environment.set({
      routerLog: [entry, ...environment.get().routerLog].slice(0, 6),
    });
  };

  const outcome = () => (environment.get().navigationWorks ? "ok" : "refused");

  return {
    conversationIdFromPath,
    navigate: (path) => {
      log(`navigate(${path}) ${outcome()}`);

      if (environment.get().navigationWorks) {
        environment.set({ pathname: path });
      }

      return environment.get().navigationWorks;
    },
    navigateToLocalConversation: (id, host) => {
      log(
        `navigateToLocalConversation(${id}, ${host ?? "default host"}) ${outcome()}`
      );

      return environment.get().navigationWorks;
    },
    pathForConversation: (id) => `/c/${id}`,
    get pathname() {
      return environment.get().pathname;
    },
  };
};

const FailurePanel = ({
  environment,
  store,
}: {
  environment: Environment;
  store: ReturnType<typeof createDiagnosticsStore>;
}) => {
  const toast = useToast();
  const [logged, setLogged] = useState<readonly string[]>([]);
  const [preset, setPreset] = useState(MESSAGE_PRESETS[0].label);

  const host = createDiagnosticsHost(
    {
      hostIdFor: () => environment.get().hostChoice,
      isGateOn: () => environment.get().gateOn,
      router: () => createDemoRouter(environment),
    },
    store
  );

  const message = (
    MESSAGE_PRESETS.find((entry) => entry.label === preset) ??
    MESSAGE_PRESETS[0]
  ).text;

  const run = (error: Error, mode: string, id: string) => {
    const { conversationId } = environment.get();

    createSubmitFailureHandler({
      composerMode: mode,
      conversationId: conversationId === "" ? null : conversationId,
      cwd: "/work/project",
      diagnostics: host,
      followUpType: "local",
      log: (text, details) => {
        setLogged((current) => [`${text} (${details.safe.mode})`, ...current]);
      },
      toast,
    })(error, id);
  };

  return (
    <div className="flex flex-col gap-2">
      <Pick
        label="Message"
        options={MESSAGE_PRESETS.map((entry) => entry.label)}
        value={preset}
        onChange={setPreset}
      />
      <div className="flex flex-wrap gap-2" data-testid="failure-buttons">
        {failureCases.map(([label, make, mode]) => (
          <Button
            key={label}
            {...ACTION_BUTTON}
            onClick={() => {
              run(make(), mode, "composer.sendMessage-demo");
            }}
          >
            {label}
          </Button>
        ))}
        <Button
          {...ACTION_BUTTON}
          onClick={() => {
            run(new Error(message), "local", "composer.sendMessage-demo");
          }}
        >
          Local failure with the selected message
        </Button>
      </div>
      <p className="text-xs text-muted-foreground" data-testid="logger-log">
        Logged: {logged.join(" | ") || "none"}
      </p>
    </div>
  );
};

const ERROR_CODE_PREFIX = '"code":"';
const ERROR_CODE_PATTERN = /"code":"[^"]+"/u;

const errorCodeOf = (payload: string) => {
  const hit = ERROR_CODE_PATTERN.exec(payload)?.[0];

  return hit === undefined ? "none" : hit.slice(ERROR_CODE_PREFIX.length, -1);
};

const FailureHandlerExamples = () => {
  const [deliveries, setDeliveries] = useState<readonly string[]>([]);
  const store = useMemo(() => createDiagnosticsStore(), []);
  const environment = useMemo(() => createEnvironment(), []);

  const env = useSyncExternalStore(
    environment.subscribe,
    environment.get,
    environment.get
  );

  const [viewConversation, setViewConversation] = useState("conversation-1");
  const [viewHost, setViewHost] = useState<HostChoice>("local");
  const stored = useSyncExternalStore(store.subscribe, store.get, () => null);

  const view: DiagnosticsViewContext = {
    conversationId: viewConversation === "" ? null : viewConversation,
    hostId: viewHost,
    pathname: env.pathname,
    surface: "code",
  };

  const shown = store.select(view);

  return (
    <Section
      description="The handler shows the toast for each failure with the source id and error analytics. With the diagnostics gate on, the toast has a View diagnostics action. The report is built when the failure happens: classified, scrubbed of secrets, paths and addresses, with a conversation id that must be a plain id. Clicking navigates through the router and then stores the report. The view below reads the stored report only when it belongs to the conversation, host and surface it shows."
      id="failure-handler"
      title="Submit failure handler and diagnostics"
    >
      <div className="flex flex-wrap items-center gap-4">
        <Check
          checked={env.gateOn}
          label="Diagnostics gate on"
          onChange={(gateOn) => {
            environment.set({ gateOn });
          }}
        />
        <Check
          checked={env.navigationWorks}
          label="Router navigation succeeds"
          onChange={(navigationWorks) => {
            environment.set({ navigationWorks });
          }}
        />
        <label className="flex items-center gap-2 text-sm">
          Failing conversation id
          <input
            className="rounded-md border bg-background px-2 py-1"
            value={env.conversationId}
            onChange={(event) => {
              environment.set({ conversationId: event.target.value });
            }}
          />
        </label>
        <Pick
          label="Failing conversation host"
          options={HOST_CHOICES}
          value={env.hostChoice}
          onChange={(hostChoice) => {
            environment.set({ hostChoice });
          }}
        />
        <label className="flex items-center gap-2 text-sm">
          Current path
          <input
            className="rounded-md border bg-background px-2 py-1"
            data-testid="router-path"
            value={env.pathname}
            onChange={(event) => {
              environment.set({ pathname: event.target.value });
            }}
          />
        </label>
      </div>
      <ToastProvider
        onDangerToast={(payload) => {
          setDeliveries((current) =>
            [JSON.stringify(payload), ...current].slice(0, 16)
          );
        }}
      >
        <FailurePanel environment={environment} store={store} />
      </ToastProvider>
      <p
        className="text-xs text-muted-foreground"
        data-testid="diagnostics-log"
      >
        Diagnostics opened:{" "}
        {stored === null
          ? "none"
          : `${stored.report.operation}: ${stored.report.errorMessage.replaceAll("\n", " / ")}`}
      </p>
      <p className="text-xs text-muted-foreground" data-testid="router-log">
        Router calls (newest first): {env.routerLog.join(" | ") || "none"}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          The view shows conversation
          <input
            className="rounded-md border bg-background px-2 py-1"
            value={viewConversation}
            onChange={(event) => {
              setViewConversation(event.target.value);
            }}
          />
        </label>
        <Pick
          label="on host"
          options={HOST_CHOICES}
          value={viewHost}
          onChange={setViewHost}
        />
      </div>
      <pre
        className="overflow-x-auto rounded-xl border bg-background p-3 text-xs"
        data-testid="diagnostics-view"
      >
        {shown === null
          ? "The diagnostics view has no report for this conversation and host."
          : JSON.stringify(shown, null, 2)}
      </pre>
      <p className="text-xs text-muted-foreground" data-testid="analytics-log">
        Analytics delivered for error codes (newest first):{" "}
        {deliveries.map((payload) => errorCodeOf(payload)).join(", ") || "none"}
      </p>
      <p
        className="text-xs break-all text-muted-foreground"
        data-testid="analytics-payload"
      >
        Latest payload: {deliveries[0] ?? "none"}
      </p>
    </Section>
  );
};

/* ---------------------------------------------------------------- approval reason link */

const REASON_APPEARANCES: readonly ReasonLinkAppearance[] = [
  "inline-mention",
  "decorated",
  "underlined-text",
];

const POLICIES: readonly ExternalResourcePolicy[] = ["allow", "restricted"];
const OPEN_TARGETS = ["default", "in-app-browser", "external-browser"] as const;

/** A host link provider: it receives the href and a render function and may add a preview tooltip. */
// oxlint-disable-next-line typescript/promise-function-async -- a link provider returns what its render function returns, a ReactNode
const PreviewProvider = ({ children, href }: LinkProviderProps) =>
  children({ customTooltip: `Host preview of ${href}` });

const ReasonLinkExamples = () => {
  const [appearance, setAppearance] =
    useState<ReasonLinkAppearance>("inline-mention");

  const [policy, setPolicy] = useState<ExternalResourcePolicy>("allow");
  const [provider, setProvider] = useState(false);
  const [browserEnabled, setBrowserEnabled] = useState(false);

  const [openTarget, setOpenTarget] =
    useState<(typeof OPEN_TARGETS)[number]>("default");

  const [opened, setOpened] = useState<readonly string[]>([]);

  const services = {
    onOpenLink: (request: { href: string; openTarget?: string }) => {
      setOpened((current) =>
        [
          `${request.href}${request.openTarget === undefined ? "" : ` in ${request.openTarget}`}`,
          ...current,
        ].slice(0, 6)
      );
    },
  };

  return (
    <Section
      description="A link in an approval reason is the app link around an inline mention, with the URL as its tooltip. A link provider set by the host can add a preview. A restricted resource policy makes the link ask before it opens, the open target and the browser flag reach the open request, and the open goes to the host. Without a host the card's own links open in a new tab."
      id="reason-link"
      title="Approval reason link"
    >
      <div className="flex flex-wrap items-center gap-4">
        <Pick
          label="Appearance"
          options={REASON_APPEARANCES}
          value={appearance}
          onChange={setAppearance}
        />
        <Pick
          label="Resource policy"
          options={POLICIES}
          value={policy}
          onChange={setPolicy}
        />
        <Pick
          label="Open target"
          options={OPEN_TARGETS}
          value={openTarget}
          onChange={setOpenTarget}
        />
        <Check
          checked={provider}
          label="Host link provider"
          onChange={setProvider}
        />
        <Check
          checked={browserEnabled}
          label="Browser enabled"
          onChange={setBrowserEnabled}
        />
      </div>
      <div
        className="rounded-xl border bg-background p-3"
        data-testid="reason-link-demo"
      >
        <ExternalResourcePolicyContext.Provider value={policy}>
          <LinkProviderContext.Provider
            value={provider ? PreviewProvider : null}
          >
            <ApprovalReason>
              See{" "}
              <ApprovalReasonLink
                appearance={appearance}
                href="https://docs.example.org/guide"
                isBrowserEnabled={browserEnabled}
                openTarget={openTarget === "default" ? undefined : openTarget}
                services={services}
              >
                the guide
              </ApprovalReasonLink>
            </ApprovalReason>
          </LinkProviderContext.Provider>
        </ExternalResourcePolicyContext.Provider>
      </div>
      <div
        className="rounded-xl border bg-background p-3"
        data-testid="reason-link-card"
      >
        <ApprovalReason>
          Fetch https://docs.example.org/page, then
          (https://docs.example.org/more).
        </ApprovalReason>
      </div>
      <p
        className="text-xs text-muted-foreground"
        data-testid="reason-link-log"
      >
        Open requests (newest first): {opened.join(" | ") || "none"}
      </p>
    </Section>
  );
};

/* ---------------------------------------------------------------- analytics delivery */

const AnalyticsPanel = () => {
  const toast = useToast();

  return (
    <div className="flex flex-wrap gap-2" data-testid="analytics-buttons">
      <Button
        {...ACTION_BUTTON}
        onClick={() => {
          createSubmitFailureHandler({
            composerMode: "local",
            conversationId: "conversation-1",
            toast,
          })(new Error("disk full"), "composer.sendMessage-demo");
        }}
      >
        Fail a submit
      </Button>
      <Button
        {...ACTION_BUTTON}
        onClick={() => {
          toast.danger("Error starting chat");
        }}
      >
        Danger toast without errorAnalytics
      </Button>
      <Button
        {...ACTION_BUTTON}
        onClick={() => {
          toast.danger("Error starting chat", {
            errorAnalytics: {
              code: "invalid-payload",
              surface: 42,
            },
          });
        }}
      >
        Danger toast with a malformed payload
      </Button>
    </div>
  );
};

const AnalyticsDeliveryExamples = () => {
  const [delivered, setDelivered] = useState<
    readonly { event: string; payload: AnalyticsEventPayload }[]
  >([]);

  const [attempts, setAttempts] = useState(0);
  const [clientThrows, setClientThrows] = useState(false);

  const deliver = createErrorAnalyticsDelivery({
    deliver: (event, payload) => {
      setAttempts((count) => count + 1);

      if (clientThrows) {
        throw new Error("The analytics service is offline");
      }

      setDelivered((current) => [{ event, payload }, ...current].slice(0, 6));
    },
  });

  return (
    <Section
      description="Danger toasts pass their errorAnalytics option to the host callback. Valid payloads contain only surface, code, message, and source. Missing or malformed payloads are ignored. Callback failures never stop the toast. The library makes no network requests."
      id="analytics-delivery"
      title="Failure analytics delivery"
    >
      <Check
        checked={clientThrows}
        label="Analytics client throws"
        onChange={setClientThrows}
      />
      <ToastProvider
        onDangerToast={(payload) => {
          deliver(payload);
        }}
      >
        <AnalyticsPanel />
      </ToastProvider>
      <p className="text-xs text-muted-foreground" data-testid="delivery-count">
        Danger hook calls that reached the client: {attempts}. Payloads kept:{" "}
        {delivered.length}.
      </p>
      <pre
        className="overflow-x-auto rounded-xl border bg-background p-3 text-xs"
        data-testid="delivery-payload"
      >
        {delivered[0] === undefined
          ? "No payload delivered."
          : JSON.stringify(delivered[0], null, 2)}
      </pre>
    </Section>
  );
};

/* ---------------------------------------------------------------- tip selection */

interface TipDemoContext extends ComposerTipEligibility {
  dismissVariant: ComposerTipBeacon["ui_info"]["dismiss_variant"];
  enabled: boolean;
  eventMessageId: string;
  ready: boolean;
}

const CURRENT_MESSAGE_ID = "message-2";
const CONVERSATION_ID = "conversation-1";
const SKILL_NAMES = ["documents", "spreadsheets", "presentations"] as const;

const NO_EXTRA_PLUGINS: ReadonlySet<string> = new Set();

const INITIAL_TIP_CONTEXT: TipDemoContext = {
  automationsAvailable: true,
  availableSkillNames: new Set(SKILL_NAMES),
  browserExtensionInstalled: false,
  connectedPluginNames: NO_EXTRA_PLUGINS,
  dismissVariant: "persistent",
  enabled: true,
  enabledPluginIds: new Set([SITES_PLUGIN_ID]),
  eventMessageId: CURRENT_MESSAGE_ID,
  hasAutomations: false,
  isWorkMode: false,
  notificationOnboardingResolved: true,
  notificationPermissionStatus: "disabled",
  ready: true,
  voiceAvailable: true,
};

const TRISTATE = ["loading", "no", "yes"] as const;

type Tristate = (typeof TRISTATE)[number];

const fromTristate = (value: Tristate) => {
  if (value === "loading") {
    return null;
  }

  return value === "yes";
};

const toTristate = (value: boolean | null): Tristate => {
  if (value === null) {
    return "loading";
  }

  return value ? "yes" : "no";
};

const NOTIFICATION_STATUSES = ["unknown", "disabled", "enabled"] as const;

const beaconIdFor = (tipId: string) =>
  `composer_tip_${tipId.replaceAll("-", "_")}`;

const buildBeacon = (
  tipId: string,
  dismissVariant: TipDemoContext["dismissVariant"]
): ComposerTipBeacon => ({
  action_items: [
    { action_v2: { action_enum: "open_url" }, id: tipId, type: "primary" },
  ],
  beacon_id: tipId === "not-a-tip" ? "home_banner" : beaconIdFor(tipId),
  ui_info: { dismiss_variant: dismissVariant, title: tipId },
});

const toggleIn = (
  set: ReadonlySet<string> | null,
  name: string,
  on: boolean
) => {
  const next = new Set(set);

  if (on) {
    next.add(name);
  } else {
    next.delete(name);
  }

  return next;
};

const TipSelectionExamples = () => {
  const editor = useRef<ComposerEditorController | null>(null);
  const [tipId, setTipId] = useState("documents");
  const [context, setContext] = useState(INITIAL_TIP_CONTEXT);
  const [dismissed, setDismissed] = useState(false);
  const [impressions, setImpressions] = useState(createImpressionLog);
  const [log, setLog] = useState<readonly string[]>([]);

  const [tipEditor, setTipEditor] = useState<ComposerEditorController | null>(
    null
  );

  useEffect(() => {
    setTipEditor(editor.current);
  }, []);

  const record = (entry: string) => {
    setLog((current) => [entry, ...current].slice(0, 10));
  };

  const update = (patch: Partial<TipDemoContext>) => {
    setContext((current) => ({ ...current, ...patch }));
    setDismissed(false);
  };

  const beaconEvent: ComposerTipEvent | null = dismissed
    ? null
    : {
        beacon: buildBeacon(tipId, context.dismissVariant),
        eventMetadata: {
          conversationId: CONVERSATION_ID,
          messageId:
            context.eventMessageId === "" ? null : context.eventMessageId,
        },
        productExperience: "code",
      };

  const host: ComposerTipHost = {
    analytics: (event) => {
      record(
        `analytics ${event.action}${event.actionId === undefined ? "" : ` ${event.actionId}`}`
      );
    },
    dismissBeacon: () => {
      record("dismiss beacon");
      setDismissed(true);
    },
    markBeaconClicked: () => {
      record("mark beacon clicked");
    },
    navigate: (path, state) => {
      record(
        `navigate ${path}${state === undefined ? "" : ` ${JSON.stringify(state)}`}`
      );
    },
    openNotificationSettings: () => {
      record("open notification settings");
    },
    recordBeaconEvent: (event) => {
      record(`beacon ${event.eventType}`);
    },
    startVoice: () => {
      record("start voice");
    },
    switchToWork: () => {
      record("switch to work");
      update({ isWorkMode: true });
    },
  };

  const tipOptions = [
    ...COMPOSER_TIP_CATALOG.map((entry) => entry.id),
    "not-a-tip",
  ];

  return (
    <Section
      description="Which tip shows depends on the beacon and on app data: the skills, plugins, automations, notification permission and browser extension state. Change the local data below and the tip appears or goes away. The tip's button prefills the editor, mentions a skill or plugin, navigates, or starts a flow, and each step is reported to the host. Views, impressions, clicks and dismissals go to a local log, and a view is reported once per beacon, conversation and message."
      id="tip-selection"
      title="Tip selection"
    >
      <div className="flex flex-wrap items-center gap-4">
        <Pick
          label="Beacon tip"
          options={tipOptions}
          value={tipId}
          onChange={(value) => {
            setTipId(value);
            setDismissed(false);
          }}
        />
        <Pick
          label="Dismiss variant"
          options={["persistent", "dismiss_after_send"] as const}
          value={context.dismissVariant}
          onChange={(value) => {
            update({ dismissVariant: value });
          }}
        />
        <Pick
          label="Beacon message"
          options={[CURRENT_MESSAGE_ID, "message-1"]}
          value={context.eventMessageId}
          onChange={(value) => {
            update({ eventMessageId: value });
          }}
        />
        <Check
          checked={context.enabled}
          label="Tip hook enabled"
          onChange={(enabled) => {
            update({ enabled });
          }}
        />
        <Check
          checked={context.ready}
          label="Stores loaded"
          onChange={(ready) => {
            update({ ready });
          }}
        />
        <Check
          checked={context.isWorkMode}
          label="Work mode"
          onChange={(isWorkMode) => {
            update({ isWorkMode });
          }}
        />
        <Check
          checked={context.automationsAvailable}
          label="Automations available"
          onChange={(automationsAvailable) => {
            update({ automationsAvailable });
          }}
        />
        <Check
          checked={context.voiceAvailable}
          label="Voice available"
          onChange={(voiceAvailable) => {
            update({ voiceAvailable });
          }}
        />
        <Check
          checked={context.notificationOnboardingResolved}
          label="Notification onboarding done"
          onChange={(notificationOnboardingResolved) => {
            update({ notificationOnboardingResolved });
          }}
        />
        <Pick
          label="Has automations"
          options={TRISTATE}
          value={toTristate(context.hasAutomations)}
          onChange={(value) => {
            update({ hasAutomations: fromTristate(value) });
          }}
        />
        <Pick
          label="Browser extension installed"
          options={TRISTATE}
          value={toTristate(context.browserExtensionInstalled)}
          onChange={(value) => {
            update({ browserExtensionInstalled: fromTristate(value) });
          }}
        />
        <Pick
          label="Notification permission"
          options={NOTIFICATION_STATUSES}
          value={context.notificationPermissionStatus ?? "unknown"}
          onChange={(value) => {
            update({
              notificationPermissionStatus: value === "unknown" ? null : value,
            });
          }}
        />
        {SKILL_NAMES.map((name) => (
          <Check
            key={name}
            checked={context.availableSkillNames.has(name)}
            label={`Skill ${name} available`}
            onChange={(on) => {
              update({
                availableSkillNames: toggleIn(
                  context.availableSkillNames,
                  name,
                  on
                ),
              });
            }}
          />
        ))}
        <Check
          checked={context.enabledPluginIds?.has(SITES_PLUGIN_ID) === true}
          label="Sites plugin enabled"
          onChange={(on) => {
            update({
              enabledPluginIds: toggleIn(
                context.enabledPluginIds,
                SITES_PLUGIN_ID,
                on
              ),
            });
          }}
        />
        <Check
          checked={context.connectedPluginNames?.has("computer-use") === true}
          label="Computer Use plugin connected"
          onChange={(on) => {
            update({
              connectedPluginNames: toggleIn(
                context.connectedPluginNames,
                "computer-use",
                on
              ),
            });
          }}
        />
        <Check
          checked={context.connectedPluginNames === null}
          label="Plugins loading"
          onChange={(loading) => {
            update({ connectedPluginNames: loading ? null : NO_EXTRA_PLUGINS });
          }}
        />
      </div>
      <div
        className="rounded-xl border bg-background p-3 text-sm"
        data-testid="tip-editor"
      >
        <ComposerEditor
          aria-label="Tip editor"
          controllerRef={editor}
          placeholder="Do anything"
        />
      </div>
      <div data-testid="tip-slot">
        <ComposerTipSelector
          beaconEvent={beaconEvent}
          context={context}
          conversationId={CONVERSATION_ID}
          currentMessageId={CURRENT_MESSAGE_ID}
          editor={tipEditor}
          enabled={context.enabled}
          host={host}
          impressions={impressions}
          plugins={[
            {
              id: SITES_PLUGIN_ID,
              mention: {
                description: null,
                displayName: "Sites",
                name: "sites",
                path: `plugin://${SITES_PLUGIN_ID}`,
              },
            },
          ]}
          ready={context.ready}
          skills={SKILL_NAMES.map((name) => ({
            enabled: true,
            mention: {
              description: null,
              displayName: name,
              name,
              path: `skill://${name}`,
            },
            name: name[0].toUpperCase() + name.slice(1),
          }))}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          {...ACTION_BUTTON}
          onClick={() => {
            setImpressions(createImpressionLog());
            setLog([]);
          }}
        >
          Forget reported views
        </Button>
        <Button
          {...ACTION_BUTTON}
          onClick={() => {
            setDismissed(false);
          }}
        >
          Show the beacon again
        </Button>
      </div>
      <p
        className="text-xs text-muted-foreground"
        data-testid="tip-selection-log"
      >
        Host calls (newest first): {log.join(" | ") || "none"}. Views reported:{" "}
        {impressions.size()}.
      </p>
    </Section>
  );
};

export {
  AnalyticsDeliveryExamples,
  ReasonLinkExamples,
  FailureHandlerExamples,
  TipSelectionExamples,
};
