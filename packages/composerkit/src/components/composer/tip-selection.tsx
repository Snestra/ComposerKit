"use client";

import type { ComposerMentionAttributes } from "composerkit/components/composer/editor/schema";
import { ComposerTip } from "composerkit/components/composer/tip";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/*
 * Which composer tip shows, and what its button does: the tip hook, the tip
 * catalog and the view and impression helpers. The component reads app stores (skills, plugins,
 * automations, notification permission, the browser extension, the home
 * beacon) and reports through an analytics client. The library takes those
 * as plain data and callbacks, so every state can be driven from local data.
 * Every string is the default message.
 */

const TIP_BADGE = "TIP";
const BEACON_PREFIX = "composer_tip_";

/** The `sites` tip's plugin id. */
const SITES_PLUGIN_ID = "curated-remote-sites";

type ComposerTipAction =
  | { type: "navigate"; path: string; state?: Readonly<Record<string, string>> }
  | { type: "new-chat" }
  | { type: "open-notification-settings" }
  | { type: "prefill"; prompt: string }
  | { type: "prefill-with-plugin"; pluginId: string; prompt: string }
  | { type: "prefill-with-skill"; prompt: string; skillName: string }
  | { type: "start-voice" }
  | { type: "switch-to-work" };

/** The inputs that the component builds for each tip's `isEligible`. */
interface ComposerTipEligibility {
  automationsAvailable: boolean;
  availableSkillNames: ReadonlySet<string>;
  /** Null while the extension state is loading. */
  browserExtensionInstalled: boolean | null;
  /** Null while the plugin list is loading. */
  connectedPluginNames: ReadonlySet<string> | null;
  enabledPluginIds: ReadonlySet<string> | null;
  /** Null while the automation lists are loading or failed. */
  hasAutomations: boolean | null;
  isWorkMode: boolean;
  notificationOnboardingResolved: boolean;
  notificationPermissionStatus: string | null;
  voiceAvailable: boolean;
}

interface ComposerCatalogTip {
  action: ComposerTipAction;
  actionLabel: string;
  badgeLabel: string;
  content: string;
  id: string;
  isEligible: (context: ComposerTipEligibility) => boolean;
}

const always = () => true;

const hasSkill = (context: ComposerTipEligibility, name: string) =>
  context.availableSkillNames.has(name);

/** The plugins are loaded and none of the named ones is connected. */
const lacksPlugins = (
  context: ComposerTipEligibility,
  ...names: readonly string[]
) =>
  context.connectedPluginNames !== null &&
  names.every((name) => context.connectedPluginNames?.has(name) !== true);

const AUTOMATION_CREATE_PATH = "/automations?automationMode=create";

const tip = (
  id: string,
  action: ComposerTipAction,
  content: string,
  actionLabel: string,
  isEligible: (context: ComposerTipEligibility) => boolean = always
): ComposerCatalogTip => ({
  action,
  actionLabel,
  badgeLabel: TIP_BADGE,
  content,
  id,
  isEligible,
});

/** The tips in catalog order. */
const COMPOSER_TIP_CATALOG: readonly ComposerCatalogTip[] = [
  tip(
    "documents",
    {
      prompt: "Prepare a downloadable document from this work for me to share.",
      skillName: "documents",
      type: "prefill-with-skill",
    },
    "Save this work as a document to download or share.",
    "Create document",
    (context) => hasSkill(context, "documents")
  ),
  tip(
    "spreadsheets",
    {
      prompt:
        "Organize this work in a spreadsheet, including formulas and next steps.",
      skillName: "spreadsheets",
      type: "prefill-with-skill",
    },
    "Put the data, formulas, and next steps together in a spreadsheet.",
    "Create spreadsheet",
    (context) => hasSkill(context, "spreadsheets")
  ),
  tip(
    "presentations",
    {
      prompt: "Build a presentation using these notes and research.",
      skillName: "presentations",
      type: "prefill-with-skill",
    },
    "Use your notes and research to build a presentation.",
    "Create presentation",
    (context) => hasSkill(context, "presentations")
  ),
  tip(
    "web-search",
    {
      prompt: "Find up-to-date sources on the web for this work.",
      type: "prefill",
    },
    "Look up current sources for the work you are doing.",
    "Search the web"
  ),
  tip(
    "skills",
    { path: "/skills", state: { initialTab: "skills" }, type: "navigate" },
    "Choose a skill to help with writing, research, or spreadsheet work.",
    "Explore skills"
  ),
  tip(
    "steering",
    { prompt: "Revise the approach as follows: ", type: "prefill" },
    "Send instructions to adjust work already in progress.",
    "Add to message"
  ),
  tip(
    "plan-mode",
    {
      prompt: "Plan the steps for this task before changing anything.",
      type: "prefill",
    },
    "Start a complex task by asking for a plan.",
    "Create plan"
  ),
  tip(
    "scheduled-tasks",
    { path: AUTOMATION_CREATE_PATH, type: "navigate" },
    "Schedule recurring work to run automatically.",
    "Schedule task",
    (context) =>
      context.automationsAvailable && context.hasAutomations === false
  ),
  tip(
    "morning-briefing",
    { path: AUTOMATION_CREATE_PATH, type: "navigate" },
    "Schedule a morning summary using your connected apps.",
    "Schedule task",
    (context) => context.automationsAvailable
  ),
  tip(
    "plugins",
    { path: "/skills", state: { initialTab: "plugins" }, type: "navigate" },
    "Find plugins for the tools you want to connect.",
    "Explore plugins"
  ),
  tip(
    "work-mode",
    { type: "switch-to-work" },
    "Use Work mode when a task needs several steps or files.",
    "Try Work",
    (context) => !context.isWorkMode
  ),
  tip(
    "sites",
    {
      pluginId: SITES_PLUGIN_ID,
      prompt: "Build a website based on this idea: ",
      type: "prefill-with-plugin",
    },
    "Describe an idea and ask the assistant to build a website.",
    "Add to message",
    (context) => context.enabledPluginIds?.has(SITES_PLUGIN_ID) === true
  ),
  tip(
    "google-drive",
    { path: "/plugins?search=Google%20Drive", type: "navigate" },
    "Link Google Drive to search and use your files.",
    "Connect Drive"
  ),
  tip(
    "gmail",
    { path: "/plugins?search=Gmail", type: "navigate" },
    "Link Gmail for email summaries and help drafting replies.",
    "Connect Gmail"
  ),
  tip(
    "calendar",
    { path: "/plugins?search=Calendar", type: "navigate" },
    "Link a calendar to help prepare for your next meetings.",
    "Connect Calendar"
  ),
  tip(
    "voice-chat",
    { type: "start-voice" },
    "Use voice chat when you would rather explain by speaking.",
    "Start voice",
    (context) => context.voiceAvailable
  ),
  tip(
    "recurring-work",
    { path: AUTOMATION_CREATE_PATH, type: "navigate" },
    "Schedule a request you need to run regularly.",
    "Schedule task",
    (context) => context.automationsAvailable
  ),
  tip(
    "multiple-active-threads",
    { type: "new-chat" },
    "Start another chat to work on a separate task at the same time",
    "Start new chat"
  ),
  tip(
    "notifications",
    { type: "open-notification-settings" },
    "Receive a notification when work finishes or needs your input.",
    "Enable notifications",
    (context) =>
      context.notificationOnboardingResolved &&
      context.notificationPermissionStatus === "disabled"
  ),
  tip(
    "computer-use",
    { path: "/settings/computer-use", type: "navigate" },
    "Set up Computer Use to operate apps on your computer.",
    "Set up",
    (context) => lacksPlugins(context, "computer-use")
  ),
  tip(
    "browser-use",
    { path: "/settings/computer-use", type: "navigate" },
    "Enable the assistant to browse sites and act in your browser.",
    "Install extension",
    (context) => context.browserExtensionInstalled === false
  ),
];

/** The catalog tip a beacon id names, or null. */
const resolveComposerTip = (beaconId: string) => {
  if (!beaconId.startsWith(BEACON_PREFIX)) {
    return null;
  }

  const id = beaconId.slice(BEACON_PREFIX.length).replaceAll("_", "-");

  return COMPOSER_TIP_CATALOG.find((entry) => entry.id === id) ?? null;
};

interface ComposerBeaconActionItem {
  action_v2: { action_enum: string };
  id: string;
  type: string;
}

interface ComposerTipBeacon {
  action_items: readonly ComposerBeaconActionItem[];
  beacon_id: string;
  ui_info: {
    description?: string | null;
    dismiss_variant: "dismiss_after_send" | "persistent";
    title: string;
  };
}

/** What the component reads from the conversation's beacon event. */
interface ComposerTipEvent {
  beacon: ComposerTipBeacon;
  eventMetadata: {
    conversationId: string;
    messageId: string | null;
  };
  productExperience: string;
}

interface ComposerTipSelectionInput {
  beaconEvent: ComposerTipEvent | null;
  context: ComposerTipEligibility;
  /** The message the composer follows. */
  currentMessageId: string | null;
  /** Default true. */
  enabled?: boolean;
  /** Every store the eligibility reads has finished loading. */
  ready: boolean;
}

interface ComposerTipSelection {
  impressionId: string;
  tip: ComposerCatalogTip;
}

/**
 * A tip shows when the hook is enabled, the stores are ready,
 * the beacon names a catalog tip that is eligible, and the beacon is either
 * persistent or tied to the message the composer follows.
 */
const selectComposerTip = ({
  beaconEvent,
  context,
  currentMessageId,
  enabled = true,
  ready,
}: ComposerTipSelectionInput): ComposerTipSelection | null => {
  if (!(enabled && ready) || beaconEvent === null) {
    return null;
  }

  const candidate = resolveComposerTip(beaconEvent.beacon.beacon_id);

  if (candidate === null || !candidate.isEligible(context)) {
    return null;
  }

  const { messageId } = beaconEvent.eventMetadata;

  const tiedToMessage =
    beaconEvent.beacon.ui_info.dismiss_variant === "persistent" ||
    messageId === null ||
    messageId === currentMessageId;

  if (!tiedToMessage) {
    return null;
  }

  return {
    impressionId: `${candidate.id}:${beaconEvent.eventMetadata.conversationId}:${messageId}`,
    tip: candidate,
  };
};

/* ---------------------------------------------------------------- analytics and host */

type ComposerTipAnalyticsAction =
  | "click"
  | "tip_shown"
  | "dismiss"
  | "impression";

interface ComposerTipAnalyticsEvent {
  action: ComposerTipAnalyticsAction;
  actionId?: string;
  actionType?: string;
  beaconId: string;
  destinationAction?: string;
  placement: "in_conversation";
  productExperience: string;
  treatment: "banner";
}

interface ComposerTipSkill {
  enabled: boolean;
  mention: ComposerMentionAttributes;
  name: string;
}

interface ComposerTipPlugin {
  id: string;
  mention: ComposerMentionAttributes;
}

/** The editor calls a tip may make. */
interface ComposerTipEditor {
  appendText: (text: string) => void;
  focus: () => void;
  insertMentionAtSelection: (mention: ComposerMentionAttributes) => void;
  insertSkillMentionAtSelection: (mention: ComposerMentionAttributes) => void;
  insertTextAtSelection: (text: string) => void;
}

/** App services the tip reaches. Each is a callback, so nothing real is called. */
interface ComposerTipHost {
  /** The analytics client. */
  analytics: (event: ComposerTipAnalyticsEvent) => void;
  /** The tip was dismissed. */
  dismissBeacon: (conversationId: string, event: ComposerTipEvent) => void;
  /** The tip's action ran. */
  markBeaconClicked: (conversationId: string, event: ComposerTipEvent) => void;
  navigate: (path: string, state?: Readonly<Record<string, string>>) => void;
  openNotificationSettings: () => void;
  /** The first-view test and the view and click events. */
  recordBeaconEvent: (event: {
    beaconId: string;
    ctaId?: string;
    eventType: "click" | "view";
  }) => void;
  startVoice?: () => void;
  switchToWork: () => void;
}

/** What the tip's button does. */
const runComposerTipAction = (
  action: ComposerTipAction,
  {
    editor,
    host,
    plugins,
    skills,
  }: {
    editor: ComposerTipEditor | null;
    host: ComposerTipHost;
    plugins: readonly ComposerTipPlugin[];
    skills: readonly ComposerTipSkill[];
  }
) => {
  switch (action.type) {
    case "prefill": {
      editor?.appendText(action.prompt);
      editor?.focus();

      break;
    }

    case "prefill-with-skill": {
      const skill = skills.find(
        (candidate) =>
          candidate.enabled && candidate.name.toLowerCase() === action.skillName
      );

      if (editor === null || skill === undefined) {
        break;
      }

      editor.appendText(action.prompt);
      editor.insertTextAtSelection(" ");
      editor.insertSkillMentionAtSelection(skill.mention);
      editor.focus();

      break;
    }

    case "prefill-with-plugin": {
      const plugin = plugins.find(
        (candidate) => candidate.id === action.pluginId
      );

      if (editor === null || plugin === undefined) {
        break;
      }

      editor.appendText(action.prompt);
      editor.insertTextAtSelection(" ");
      editor.insertMentionAtSelection(plugin.mention);
      editor.focus();

      break;
    }

    case "navigate": {
      host.navigate(action.path, action.state);

      break;
    }

    case "new-chat": {
      host.navigate("/");

      break;
    }

    case "open-notification-settings": {
      host.openNotificationSettings();

      break;
    }

    case "start-voice": {
      host.startVoice?.();

      break;
    }

    case "switch-to-work": {
      host.switchToWork();
      host.navigate("/");

      break;
    }

    default: {
      break;
    }
  }
};

/** Remembers which beacon views were already reported, so a view is reported once. */
const createImpressionLog = () => {
  const seen = new Set<string>();

  return {
    /** True the first time a view key is seen. */
    firstView: (
      beaconId: string,
      accountOrConversationId: string,
      event: ComposerTipEvent
    ) => {
      const key = `${accountOrConversationId}:${beaconId}:${event.eventMetadata.conversationId}:${event.eventMetadata.messageId}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    },
    size: () => seen.size,
  };
};

type ComposerTipImpressionLog = ReturnType<typeof createImpressionLog>;

interface ComposerTipSelectorProps extends ComposerTipSelectionInput {
  accountId?: string | null;
  conversationId: string;
  editor: ComposerTipEditor | null;
  host: ComposerTipHost;
  impressions: ComposerTipImpressionLog;
  plugins?: readonly ComposerTipPlugin[];
  skills?: readonly ComposerTipSkill[];
}

/** Renders the selected tip with impression, dismiss and click reporting. */
const NO_PLUGINS: readonly ComposerTipPlugin[] = [];
const NO_SKILLS: readonly ComposerTipSkill[] = [];

const ComposerTipSelector = ({
  accountId = null,
  beaconEvent,
  conversationId,
  editor,
  host,
  impressions,
  plugins = NO_PLUGINS,
  skills = NO_SKILLS,
  ...input
}: ComposerTipSelectorProps): ReactNode => {
  const selection = selectComposerTip({ beaconEvent, ...input });
  const shownKey = useRef<string | null>(null);
  const hasSelection = selection !== null;

  useEffect(() => {
    if (!hasSelection) {
      shownKey.current = null;
    }
  }, [hasSelection]);

  if (selection === null || beaconEvent === null) {
    return null;
  }

  const { beacon } = beaconEvent;

  const placement = {
    beaconId: beacon.beacon_id,
    placement: "in_conversation",
    productExperience: beaconEvent.productExperience,
    treatment: "banner",
  } as const;

  const onShown = () => {
    if (shownKey.current === selection.impressionId) {
      return;
    }

    shownKey.current = selection.impressionId;

    if (
      impressions.firstView(
        beacon.beacon_id,
        accountId ?? conversationId,
        beaconEvent
      )
    ) {
      host.recordBeaconEvent({ beaconId: beacon.beacon_id, eventType: "view" });
      host.analytics({ ...placement, action: "impression" });
    }

    host.analytics({ ...placement, action: "tip_shown" });
  };

  const onDismiss = () => {
    host.analytics({ ...placement, action: "dismiss" });
    host.dismissBeacon(conversationId, beaconEvent);
  };

  const onPrimaryAction = () => {
    const item =
      beacon.action_items.find(
        (candidate) => candidate.id === selection.tip.id
      ) ?? beacon.action_items[0];

    host.analytics({
      ...placement,
      action: "click",
      actionId: selection.tip.id,
      actionType: item?.type ?? "primary",
      destinationAction: item?.action_v2.action_enum,
    });
    host.recordBeaconEvent({
      beaconId: beacon.beacon_id,
      ctaId: selection.tip.id,
      eventType: "click",
    });
    host.markBeaconClicked(conversationId, beaconEvent);
    runComposerTipAction(selection.tip.action, {
      editor,
      host,
      plugins,
      skills,
    });
  };

  return (
    <ComposerTip
      impressionId={selection.impressionId}
      tip={selection.tip}
      onDismiss={onDismiss}
      onPrimaryAction={onPrimaryAction}
      onShown={onShown}
    />
  );
};

export {
  COMPOSER_TIP_CATALOG,
  ComposerTipSelector,
  createImpressionLog,
  resolveComposerTip,
  runComposerTipAction,
  SITES_PLUGIN_ID,
  selectComposerTip,
};

export type {
  ComposerBeaconActionItem,
  ComposerCatalogTip,
  ComposerTipAction,
  ComposerTipAnalyticsEvent,
  ComposerTipBeacon,
  ComposerTipEditor,
  ComposerTipEligibility,
  ComposerTipEvent,
  ComposerTipHost,
  ComposerTipImpressionLog,
  ComposerTipPlugin,
  ComposerTipSelection,
  ComposerTipSkill,
};
