"use client";

/* oxlint-disable typescript/no-deprecated -- The host and composer treat keyCode 229 as an IME composition key. */

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

/*
 * The key-command registry runs normal handlers before fallback handlers,
 * newest registration first, and stops at the first handler that does not
 * return false.
 *
 * The Electron host sends run-command messages. In a browser, dispatchEvent
 * skips prevented events and IME composition, tries commands in table order,
 * and stops at the first command whose handlers accept the key.
 */

/* ---------------------------------------------------------------- keymap */

/** Values include `keyboard_shortcut`, `host_run_command` and menu names. */
type KeyCommandSource = string;

type KeyCommandPriority = "fallback" | "normal";

/** The context a non-keyboard invocation hands to the handlers. */
type KeyCommandContext =
  | { readonly composerId?: string; readonly menuItem?: string }
  | undefined;

/** Handler contract: `false` declines, any other value accepts. */
type KeyCommandHandler = (
  source: KeyCommandSource,
  event: KeyboardEvent | undefined,
  context: KeyCommandContext
) => boolean;

interface KeyCommandOptions {
  isActive?: (context: KeyCommandContext) => boolean;
  priority?: KeyCommandPriority;
}

interface KeyBinding {
  command: string;
  /** `null` unbinds the command, as the keymap state does. */
  key: string | null;
}

interface KeyCommandKeymap {
  bindings: readonly KeyBinding[];
}

/** The commands this family handles, in the command-table order. */
const KEY_COMMAND_ORDER = [
  "composer.sendMessage",
  "composer.runInBackground",
  "composer.redirectRun",
  "composer.enqueueMessage",
  "composer.resetDraft",
  "approval.acceptRequest",
  "approval.rejectRequest",
] as const;

type KeyCommandId = (typeof KEY_COMMAND_ORDER)[number];

/**
 * A repeated key, or a bare key inside an editable target, is not a
 * command (held Enter and Enter in a select do not approve).
 */
const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const isKeyCommandId = (command: string): command is KeyCommandId =>
  KEY_COMMAND_ORDER.some((id) => id === command);

/**
 * Electron default bindings. The table gives approval.acceptRequest Enter and
 * approval.rejectRequest Escape; composer.sendMessage has none of its own, and the
 * component falls back to Enter when no binding is stored.
 */
const DEFAULT_KEYBINDINGS = {
  "approval.acceptRequest": ["Enter"],
  "approval.rejectRequest": ["Escape"],
  "composer.enqueueMessage": [],
  "composer.redirectRun": [],
  "composer.resetDraft": [],
  "composer.runInBackground": ["CmdOrCtrl+Enter"],
  "composer.sendMessage": ["Enter"],
} as const satisfies Record<KeyCommandId, readonly string[]>;

/** Groups of commands that never conflict because they act in different places. */
const CONFLICT_EXEMPT_GROUPS: readonly (readonly string[])[] = [
  ["tabs.closeActive", "windows.closeActive"],
  ["editor.jumpToLine", "browser.focusLocation"],
  ["editor.jumpToSymbol", "history.stepForward"],
];

/**
 * Whether two commands may share a key. A command shares with
 * itself, Enter is shared by composer.sendMessage and approval.acceptRequest, and the
 * listed groups share.
 */
const mayShareKey = (first: string, second: string, key: string) =>
  first === second ||
  (key.toLowerCase() === "enter" &&
    ((first === "composer.sendMessage" &&
      second === "approval.acceptRequest") ||
      (first === "approval.acceptRequest" &&
        second === "composer.sendMessage"))) ||
  CONFLICT_EXEMPT_GROUPS.some(
    (group) => group.includes(first) && group.includes(second)
  );

/** A stored binding replaces the default; without one the default applies. */
const keysForCommand = (
  command: string,
  keymap: KeyCommandKeymap | undefined
): readonly string[] => {
  const stored =
    keymap?.bindings.filter((binding) => binding.command === command) ?? [];

  if (stored.length > 0) {
    return stored.flatMap(({ key }) => (key === null ? [] : [key]));
  }

  return isKeyCommandId(command) ? DEFAULT_KEYBINDINGS[command] : [];
};

/** Other commands bound to `key` that may not share it with `command`. */
const findKeyConflicts = (
  command: string,
  key: string,
  keymap: KeyCommandKeymap | undefined
) =>
  KEY_COMMAND_ORDER.filter(
    (other) =>
      !mayShareKey(command, other, key) &&
      keysForCommand(other, keymap).some(
        (bound) => bound.toLowerCase() === key.toLowerCase()
      )
  );

type Modifier = "alt" | "ctrl" | "meta" | "mod" | "shift";

const MODIFIER_NAMES = new Map<string, Modifier>([
  ["alt", "alt"],
  ["cmd", "meta"],
  ["cmdorctrl", "mod"],
  ["command", "meta"],
  ["commandorcontrol", "mod"],
  ["control", "ctrl"],
  ["ctrl", "ctrl"],
  ["option", "alt"],
  ["shift", "shift"],
]);

const KEY_ALIASES = new Map([
  ["esc", "escape"],
  ["return", "enter"],
  ["space", " "],
]);

const IME_KEY_CODE = 229;

const isMacOS = () =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/u.test(navigator.platform);

const isComposingKeyEvent = (event: KeyboardEvent) =>
  event.isComposing || event.keyCode === IME_KEY_CODE;

/** Whether the event is exactly the accelerator: same key and same modifiers. */
const matchesAccelerator = (event: KeyboardEvent, accelerator: string) => {
  const parts = accelerator.split("+");
  const keyName = (parts.pop() ?? "").toLowerCase();
  const wanted = { alt: false, ctrl: false, meta: false, shift: false };

  for (const part of parts) {
    const modifier = MODIFIER_NAMES.get(part.toLowerCase());

    if (modifier === "mod") {
      wanted[isMacOS() ? "meta" : "ctrl"] = true;
    } else if (modifier !== undefined) {
      wanted[modifier] = true;
    }
  }

  return (
    event.altKey === wanted.alt &&
    event.ctrlKey === wanted.ctrl &&
    event.metaKey === wanted.meta &&
    event.shiftKey === wanted.shift &&
    event.key.toLowerCase() === (KEY_ALIASES.get(keyName) ?? keyName)
  );
};

/* ---------------------------------------------------------------- registry */

interface Registration {
  handler: KeyCommandHandler;
  isActive: (context: KeyCommandContext) => boolean;
  priority: KeyCommandPriority;
}

/** Entry: what a registration tells menus and the keyboard-shortcut list. */
interface RegistrationInfo {
  composerId?: string;
  menuItem?: string;
}

type RegistrationSnapshot = ReadonlyMap<string, readonly RegistrationInfo[]>;

const PRIORITIES: readonly KeyCommandPriority[] = ["normal", "fallback"];

interface KeyCommandRegistry {
  /** Offers one keyboard event to the handlers of one command. */
  dispatchKeyboard: (
    commandId: string,
    event: KeyboardEvent,
    context?: KeyCommandContext
  ) => boolean;
  /** Runs the handlers of one command without an event. */
  dispatchCommand: (
    commandId: string,
    source: KeyCommandSource,
    context?: KeyCommandContext
  ) => boolean;
  /**
   * Offers a keyboard event to every command bound to its key, in table
   * order, and stops at the first command that accepts it. Prevented events
   * and IME composition are never offered, and an event is offered once.
   */
  dispatchEvent: (event: KeyboardEvent) => boolean;
  /**
   * Offers a keyboard event to one command only, whatever its binding. A form
   * that owns its keys uses this so a key it does not handle is never offered
   * to another command (an Enter in a composer must not approve a card). The
   * handlers decide from the event; a prevented key or an IME composition is
   * never offered, and an accepted event is prevented.
   */
  dispatchToCommand: (commandId: string, event: KeyboardEvent) => boolean;
  getSnapshot: () => RegistrationSnapshot;
  /** Whether any handler of the command is active. */
  hasActiveHandler: (commandId: string) => boolean;
  /** Returns the cleanup that removes this registration. */
  register: (
    commandId: string,
    handler: KeyCommandHandler,
    options?: KeyCommandOptions,
    info?: RegistrationInfo
  ) => () => void;
  setKeymap: (keymap: KeyCommandKeymap | undefined) => void;
  subscribe: (listener: () => void) => () => void;
}

const dispatchHandlers = (
  entries: readonly Registration[],
  source: KeyCommandSource,
  event: KeyboardEvent | undefined,
  context: KeyCommandContext
) => {
  for (const priority of PRIORITIES) {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];

      if (
        entry?.priority === priority &&
        entry.isActive(context) &&
        entry.handler(source, event, context)
      ) {
        return true;
      }
    }
  }

  return false;
};

const withoutIndex = <Item,>(list: readonly Item[], index: number) =>
  list.filter((_, position) => position !== index);

const createKeyCommandRegistry = (): KeyCommandRegistry => {
  const handlers = new Map<string, Registration[]>();
  const listeners = new Set<() => void>();
  const offered = new WeakSet<Event>();
  let infos: RegistrationSnapshot = new Map();
  let keymap: KeyCommandKeymap | undefined;
  let registrations = 0;

  const publish = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const dispatchKeyboard = (
    commandId: string,
    event: KeyboardEvent,
    context?: KeyCommandContext
  ) =>
    dispatchHandlers(
      handlers.get(commandId) ?? [],
      "keyboard_shortcut",
      event,
      context
    );

  const dispatchEvent = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      isComposingKeyEvent(event) ||
      event.repeat ||
      (isEditableTarget(event.target) &&
        !(event.ctrlKey || event.metaKey || event.altKey)) ||
      offered.has(event)
    ) {
      return false;
    }

    offered.add(event);

    for (const commandId of KEY_COMMAND_ORDER) {
      const bound = keysForCommand(commandId, keymap).some((key) =>
        matchesAccelerator(event, key)
      );

      if (bound && dispatchKeyboard(commandId, event)) {
        event.preventDefault();

        return true;
      }
    }

    return false;
  };

  const dispatchToCommand = (commandId: string, event: KeyboardEvent) => {
    if (event.defaultPrevented || isComposingKeyEvent(event)) {
      return false;
    }

    if (!dispatchKeyboard(commandId, event)) {
      return false;
    }

    event.preventDefault();

    return true;
  };

  const onWindowKeyDown = (event: KeyboardEvent) => {
    dispatchEvent(event);
  };

  const unregister = (commandId: string, entry: Registration) => {
    const current = handlers.get(commandId) ?? [];
    const index = current.lastIndexOf(entry);

    if (index === -1) {
      return;
    }

    const next = withoutIndex(current, index);

    if (next.length === 0) {
      handlers.delete(commandId);
    } else {
      handlers.set(commandId, next);
    }

    const remaining = withoutIndex(infos.get(commandId) ?? [], index);
    const copy = new Map(infos);

    if (remaining.length === 0) {
      copy.delete(commandId);
    } else {
      copy.set(commandId, remaining);
    }

    infos = copy;
    registrations -= 1;

    if (registrations === 0) {
      window.removeEventListener("keydown", onWindowKeyDown);
    }

    publish();
  };

  return {
    dispatchCommand: (commandId, source, context) =>
      dispatchHandlers(
        handlers.get(commandId) ?? [],
        source,
        undefined,
        context
      ),
    dispatchEvent,
    dispatchKeyboard,
    dispatchToCommand,
    getSnapshot: () => infos,
    hasActiveHandler: (commandId) =>
      handlers.get(commandId)?.some(({ isActive }) => isActive(undefined)) ??
      false,
    register: (commandId, handler, options = {}, info = {}) => {
      const entry: Registration = {
        handler,
        isActive: options.isActive ?? (() => true),
        priority: options.priority ?? "normal",
      };

      handlers.set(commandId, [...(handlers.get(commandId) ?? []), entry]);
      infos = new Map(infos).set(commandId, [
        ...(infos.get(commandId) ?? []),
        info,
      ]);
      registrations += 1;

      if (registrations === 1) {
        window.addEventListener("keydown", onWindowKeyDown);
      }

      publish();

      return () => {
        unregister(commandId, entry);
      };
    },
    setKeymap: (next) => {
      keymap = next;
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/* ---------------------------------------------------------------- React */

/** Without a provider every consumer shares one registry, like the module-level map. */
const defaultRegistry = createKeyCommandRegistry();

const KeyCommandRegistryContext = createContext(defaultRegistry);

interface KeyCommandProviderProps {
  children?: ReactNode;
  /** Stored bindings that replace the defaults of the commands they name. */
  keymap?: KeyCommandKeymap;
}

/** Scopes a registry to a subtree, optionally with a remapped keymap. */
const KeyCommandProvider = ({ children, keymap }: KeyCommandProviderProps) => {
  // oxlint-disable-next-line react/hook-use-state -- The registry is created once for the provider and never replaced.
  const [registry] = useState(createKeyCommandRegistry);

  useLayoutEffect(() => {
    registry.setKeymap(keymap);
  }, [keymap, registry]);

  return (
    <KeyCommandRegistryContext.Provider value={registry}>
      {children}
    </KeyCommandRegistryContext.Provider>
  );
};

const useKeyCommandRegistry = () => useContext(KeyCommandRegistryContext);

const emptySnapshot: RegistrationSnapshot = new Map();

/** The live registrations by command id, as React state. */
const useKeyCommandRegistrations = (): RegistrationSnapshot => {
  const registry = useKeyCommandRegistry();

  return useSyncExternalStore(
    registry.subscribe,
    registry.getSnapshot,
    () => emptySnapshot
  );
};

interface UseKeyCommandOptions {
  composerId?: string;
  /** Runs for a non-keyboard invocation instead of the callback; `false` declines. */
  contextHandler?: (context: KeyCommandContext) => boolean | undefined;
  enabled?: boolean;
  isActive?: (context: KeyCommandContext) => boolean;
  /** Runs first for a keyboard event: `false` declines, `true` accepts without the callback. */
  keyboardHandler?: (
    event: KeyboardEvent,
    context: KeyCommandContext
  ) => boolean | undefined;
  menuItem?: string;
  priority?: KeyCommandPriority;
}

const noCleanup = () => {
  // There is nothing to undo while the command is disabled.
};

/**
 * Registers `callback` for `commandId` while `enabled`. The
 * latest callbacks are used without re-registering, so a registration keeps
 * its place in the newest-first order across renders.
 */
const useKeyCommand = (
  commandId: string,
  callback: (source: KeyCommandSource, context: KeyCommandContext) => void,
  {
    composerId,
    contextHandler,
    enabled = true,
    isActive,
    keyboardHandler,
    menuItem,
    priority = "normal",
  }: UseKeyCommandOptions = {}
) => {
  const registry = useKeyCommandRegistry();

  const latest = useRef({
    callback,
    contextHandler,
    isActive,
    keyboardHandler,
  });

  useLayoutEffect(() => {
    latest.current = { callback, contextHandler, isActive, keyboardHandler };
  });

  useEffect(() => {
    if (!enabled) {
      return noCleanup;
    }

    return registry.register(
      commandId,
      (source, event, context) => {
        const { current } = latest;

        const result =
          event === undefined
            ? undefined
            : current.keyboardHandler?.(event, context);

        if (result !== undefined) {
          return result;
        }

        if (current.contextHandler !== undefined) {
          return current.contextHandler(context) !== false;
        }

        current.callback(source, context);

        return true;
      },
      {
        isActive: (context) => latest.current.isActive?.(context) ?? true,
        priority,
      },
      { composerId, menuItem }
    );
  }, [commandId, composerId, enabled, menuItem, priority, registry]);
};

/**
 * For forms that own their keys and stop propagation, so the window never
 * sees them: returns a function that offers a keyboard event to `commandId`
 * only. It returns whether a handler accepted the event (which is then
 * prevented).
 */
const useKeyCommandDispatch = (commandId: KeyCommandId) => {
  const registry = useKeyCommandRegistry();

  return (event: KeyboardEvent) => registry.dispatchToCommand(commandId, event);
};

export {
  createKeyCommandRegistry,
  DEFAULT_KEYBINDINGS,
  findKeyConflicts,
  isComposingKeyEvent,
  KEY_COMMAND_ORDER,
  KeyCommandProvider,
  keysForCommand,
  matchesAccelerator,
  mayShareKey,
  useKeyCommand,
  useKeyCommandDispatch,
  useKeyCommandRegistrations,
  useKeyCommandRegistry,
};

export type {
  KeyBinding,
  KeyCommandContext,
  KeyCommandHandler,
  KeyCommandId,
  KeyCommandKeymap,
  KeyCommandOptions,
  KeyCommandPriority,
  KeyCommandProviderProps,
  KeyCommandRegistry,
  KeyCommandSource,
  RegistrationInfo,
  RegistrationSnapshot,
  UseKeyCommandOptions,
};
