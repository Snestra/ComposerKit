"use client";

import { Button } from "@workspace/react/components/ui/button";
import {
  Menu,
  MenuCheckboxItem,
  MenuContextMenu,
  MenuFlyoutSubmenuItem,
  MenuGroup,
  MenuItem,
  MenuItemIcon,
  MenuMessage,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSearchInput,
  MenuSection,
  MenuSectionLabel,
  MenuSeparator,
  MenuSubmenuItem,
  MenuTitle,
  MenuZoomProvider,
} from "@workspace/react/components/ui/menu";
import type {
  MenuContentWidth,
  MenuContextItem,
  MenuSize,
  MenuSurface,
} from "@workspace/react/components/ui/menu";
import {
  ListMenu,
  ListMenuCheckboxItem,
  ListMenuContent,
  ListMenuDescription,
  ListMenuItem,
  ListMenuItemAction,
  ListMenuItemActions,
  ListMenuLink,
  ListMenuRadioGroup,
  ListMenuRadioItem,
  ListMenuSeparator,
  ListMenuSub,
  ListMenuSubContent,
  ListMenuSubTrigger,
  ListMenuTrigger,
} from "@workspace/react/components/ui/menu-list";
import { Archive, Copy, Folder, Pencil, Trash2 } from "lucide-react";
import { createContext, use, useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";

type Theme = "dark" | "light";

const sizes = [
  "default",
  "compact",
  "large",
  "select",
  "inset",
  "descriptive",
  "action",
] as const satisfies readonly MenuSize[];

const surfaces = [
  "menu",
  "opaque",
  "panel",
  "rounded",
  "reaction",
  "glass",
] as const satisfies readonly MenuSurface[];

const widths = [
  "icon",
  "xs",
  "sm",
  "menu",
  "menuBounded",
  "menuWide",
  "sidebar",
  "workspace",
  "panel",
  "panelWide",
] as const satisfies readonly MenuContentWidth[];

/** A select handler: its presence makes a row interactive, and the menu closes after it runs. */
const keepOpen = (event: Event) => {
  event.stopPropagation();
};

/** A trigger the examples share. */
const Trigger = ({ children, ...props }: ComponentProps<typeof Button>) => (
  <Button color="outline" size="dialog" {...props}>
    {children}
  </Button>
);

const ThemeContext = createContext<Theme>("light");

/** Ids carry the theme of the panel so the light and dark panels never share one. */
const useScoped = () => {
  const theme = use(ThemeContext);

  return (id: string) => `${theme}-${id}`;
};

/** A themed panel whose menus portal inside it, so they resolve its theme scope. */
const Panel = ({
  children,
  label,
  theme,
}: {
  children: (container: HTMLElement | null) => ReactNode;
  label: string;
  theme: Theme;
}) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  return (
    <div
      className={`${theme} relative flex min-w-0 flex-col gap-3 overflow-x-auto rounded-2xl border bg-panel p-4 text-text`}
      data-theme={theme}
    >
      <h3 className="text-title-xs font-semibold">{label}</h3>
      <ThemeContext value={theme}>
        <div className="flex flex-wrap items-start gap-3">
          {children(container)}
        </div>
      </ThemeContext>
      <div ref={setContainer} />
    </div>
  );
};

/* ----------------------------------------------------------- dropdown */

const ActionRows = ({ prefix }: { prefix: string }) => {
  const [grid, setGrid] = useState(true);
  const [rulers, setRulers] = useState(false);
  const [size, setSize] = useState("medium");

  return (
    <>
      <MenuSectionLabel>Actions</MenuSectionLabel>
      <MenuItem
        keyboardShortcut="⌘C"
        LeftIcon={Copy}
        onSelect={keepOpen}
        tooltipText="Copy the selection"
      >
        Copy
      </MenuItem>
      <MenuItem LeftIcon={Pencil} onSelect={keepOpen}>
        Rename
      </MenuItem>
      <MenuItem
        LeftIcon={Folder}
        onSelect={keepOpen}
        rightText="3 items"
        SubText="Keeps the original"
      >
        Duplicate
      </MenuItem>
      <MenuItem disabled LeftIcon={Archive}>
        Share (unavailable)
      </MenuItem>
      <MenuItem LeftIcon={Trash2} onSelect={keepOpen} tone="danger">
        Delete
      </MenuItem>
      <MenuSeparator />
      <MenuCheckboxItem checked={grid} onCheckedChange={setGrid}>
        Show grid
      </MenuCheckboxItem>
      <MenuCheckboxItem
        checked={rulers}
        indicator="switch"
        onCheckedChange={setRulers}
      >
        Show rulers
      </MenuCheckboxItem>
      <MenuSeparator />
      <MenuRadioGroup onValueChange={setSize} value={size}>
        <MenuRadioItem value="small">Small</MenuRadioItem>
        <MenuRadioItem value="medium">Medium</MenuRadioItem>
        <MenuRadioItem value="large">Large</MenuRadioItem>
      </MenuRadioGroup>
      <MenuSeparator />
      <MenuFlyoutSubmenuItem label="More actions">
        <MenuItem onSelect={keepOpen}>Archive</MenuItem>
        <MenuItem onSelect={keepOpen}>Move</MenuItem>
      </MenuFlyoutSubmenuItem>
      <MenuSubmenuItem
        trigger={<MenuItem onSelect={keepOpen}>Expand inline</MenuItem>}
      >
        <MenuItem onSelect={keepOpen}>Inline one</MenuItem>
        <MenuItem onSelect={keepOpen}>Inline two</MenuItem>
      </MenuSubmenuItem>
      <span hidden>{prefix}</span>
    </>
  );
};

const DropdownSection = ({ container }: { container: HTMLElement | null }) => {
  const scoped = useScoped();

  return (
    <>
      <Menu
        portalContainer={container}
        triggerButton={<Trigger id={scoped("menu-basic")}>Open menu</Trigger>}
      >
        <ActionRows prefix="basic" />
      </Menu>
      <Menu
        disabled
        triggerButton={
          <Trigger id={scoped("menu-disabled")}>Disabled menu</Trigger>
        }
      >
        <MenuItem>Never shown</MenuItem>
      </Menu>
      <Menu
        openOnHover
        portalContainer={container}
        triggerButton={
          <Trigger id={scoped("menu-hover")}>Open on hover</Trigger>
        }
      >
        <MenuItem onSelect={keepOpen}>Hover one</MenuItem>
        <MenuItem onSelect={keepOpen}>Hover two</MenuItem>
      </Menu>
      <Menu
        matchTriggerWidth
        portalContainer={container}
        triggerButton={
          <Trigger id={scoped("menu-match")}>Matches trigger width</Trigger>
        }
      >
        <MenuItem onSelect={keepOpen}>Short</MenuItem>
      </Menu>
    </>
  );
};

const SizeSection = ({ container }: { container: HTMLElement | null }) => {
  const scoped = useScoped();

  return (
    <>
      {sizes.map((size) => (
        <Menu
          key={size}
          portalContainer={container}
          size={size}
          triggerButton={
            <Trigger id={scoped(`menu-size-${size}`)}>{size}</Trigger>
          }
        >
          <MenuSectionLabel>Section</MenuSectionLabel>
          <MenuItem
            onSelect={keepOpen}
            SubText={size === "descriptive" ? "Sub text" : undefined}
          >
            First row
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={keepOpen}>Second row</MenuItem>
        </Menu>
      ))}
      <Menu
        portalContainer={container}
        rowLayout="single-line"
        triggerButton={
          <Trigger id={scoped("menu-single-line")}>single-line</Trigger>
        }
      >
        <MenuItem onSelect={keepOpen}>
          A single line row with a very long label that is clipped
        </MenuItem>
      </Menu>
    </>
  );
};

const SurfaceSection = ({ container }: { container: HTMLElement | null }) => {
  const scoped = useScoped();

  return (
    <>
      {surfaces.map((surface) => (
        <Menu
          key={surface}
          portalContainer={container}
          surface={surface}
          triggerButton={
            <Trigger id={scoped(`menu-surface-${surface}`)}>{surface}</Trigger>
          }
        >
          <MenuItem onSelect={keepOpen}>One</MenuItem>
          <MenuItem onSelect={keepOpen}>Two</MenuItem>
        </Menu>
      ))}
      {widths.map((width) => (
        <Menu
          contentWidth={width}
          key={width}
          portalContainer={container}
          triggerButton={
            <Trigger id={scoped(`menu-width-${width}`)}>{width}</Trigger>
          }
        >
          <MenuItem onSelect={keepOpen}>{width}</MenuItem>
        </Menu>
      ))}
    </>
  );
};

const VariantSection = ({ container }: { container: HTMLElement | null }) => {
  const scoped = useScoped();

  return (
    <>
      <Menu
        portalContainer={container}
        triggerButton={
          <Trigger id={scoped("menu-variants")}>Item variants</Trigger>
        }
      >
        <MenuItem onSelect={keepOpen} variant="hint">
          Hint row
        </MenuItem>
        <MenuItem variant="label">Label row</MenuItem>
        <MenuItem variant="display">Display row</MenuItem>
        <MenuItem variant="detail">Detail row</MenuItem>
        <MenuItem onSelect={keepOpen} tone="warning">
          Warning tone
        </MenuItem>
        <MenuItem onSelect={keepOpen} tone="muted">
          Muted tone
        </MenuItem>
        <MenuItem onSelect={keepOpen} tone="destructive">
          Destructive tone
        </MenuItem>
        <MenuItem isActive onSelect={keepOpen}>
          Active row
        </MenuItem>
        <MenuItem disabled focusableWhenDisabled>
          Focusable disabled
        </MenuItem>
        <MenuItem allowWrap onSelect={keepOpen}>
          A long label that wraps onto a second line instead of being cut
        </MenuItem>
        <MenuItem onSelect={keepOpen} textOverflow="fade">
          A long label that fades out at the end of the row instead of a dots
        </MenuItem>
        <MenuItem asChild>
          <a href="https://example.com">Absolute link</a>
        </MenuItem>
        <MenuItem href="#local">Local link</MenuItem>
      </Menu>
      <Menu
        portalContainer={container}
        triggerButton={
          <Trigger id={scoped("menu-choices")}>Choice variants</Trigger>
        }
      >
        <MenuRadioGroup value="a">
          <MenuRadioItem SubText="Default variant" value="a">
            Default
          </MenuRadioItem>
          <MenuRadioItem value="b" variant="descriptive" SubText="Descriptive">
            Descriptive
          </MenuRadioItem>
          <MenuRadioItem value="c" variant="rounded" SubText="Rounded">
            Assistant
          </MenuRadioItem>
        </MenuRadioGroup>
        <MenuGroup>
          <MenuItem onSelect={keepOpen}>
            <MenuItemIcon>
              <Copy aria-hidden className="size-4" />
            </MenuItemIcon>
            Icon from child
          </MenuItem>
        </MenuGroup>
      </Menu>
      <Menu
        portalContainer={container}
        triggerButton={<Trigger id={scoped("menu-messages")}>Messages</Trigger>}
      >
        <MenuTitle>Title row</MenuTitle>
        <MenuMessage>No results (muted)</MenuMessage>
        <MenuMessage tone="error">Could not load (error)</MenuMessage>
        <MenuMessage centered compact>
          Centered compact
        </MenuMessage>
      </Menu>
    </>
  );
};

/** A request that settles after a delay; each open of the loading menu starts a new one. */
const slowRequest = async (): Promise<string[]> => {
  // oxlint-disable-next-line promise/avoid-new -- A promise that settles after a delay stands in for a slow request.
  await new Promise((resolve) => {
    setTimeout(resolve, 1500);
  });

  return ["Loaded one", "Loaded two"];
};

const SlowRows = ({ request }: { request: Promise<string[]> }) =>
  use(request).map((row) => (
    <MenuItem key={row} onSelect={keepOpen}>
      {row}
    </MenuItem>
  ));

const SearchSection = ({ container }: { container: HTMLElement | null }) => {
  const scoped = useScoped();

  const [query, setQuery] = useState("");
  const [request, setRequest] = useState(slowRequest);

  const rows = Array.from(
    { length: 30 },
    (_, index) => `Row ${index + 1}`
  ).filter((row) => row.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <Menu
        contentMaxHeight="list"
        onEscapeKeyDown={(event) => {
          if (event.shiftKey) {
            event.preventDefault();
          }
        }}
        portalContainer={container}
        scrollFade
        triggerButton={
          <Trigger id={scoped("menu-search")}>Search and scroll fade</Trigger>
        }
      >
        <MenuSearchInput
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder="Search"
          value={query}
        />
        {rows.length === 0 ? <MenuMessage>No rows match</MenuMessage> : null}
        <MenuItem onSelect={keepOpen}>
          Hold Shift and press Escape: vetoed
        </MenuItem>
        {rows.map((row) => (
          <MenuItem key={row} onSelect={keepOpen}>
            {row}
          </MenuItem>
        ))}
      </Menu>
      <Menu
        contentMaxHeight="listWithPeek"
        portalContainer={container}
        scrollPeek
        size="compact"
        triggerButton={<Trigger id={scoped("menu-peek")}>Scroll peek</Trigger>}
      >
        {Array.from({ length: 30 }, (_, index) => (
          <MenuItem key={index} onSelect={keepOpen}>
            Peek row {index + 1}
          </MenuItem>
        ))}
      </Menu>
      <Menu
        loadingContent={<MenuMessage>Loading</MenuMessage>}
        onOpenChange={(next) => {
          if (next) {
            setRequest(slowRequest());
          }
        }}
        portalContainer={container}
        triggerButton={
          <Trigger id={scoped("menu-loading")}>Loading content</Trigger>
        }
      >
        <SlowRows request={request} />
      </Menu>
    </>
  );
};

const StateSection = ({ container }: { container: HTMLElement | null }) => {
  const scoped = useScoped();
  const theme = use(ThemeContext);
  const [open, setOpen] = useState(true);
  // Opening a menu moves focus into it. The open it starts with keeps focus
  // where it is, so loading the page does not move focus.
  const [startOpen, setStartOpen] = useState(true);
  const [icon, setIcon] = useState("one");

  return (
    <>
      <Menu
        onOpenAutoFocus={(event) => {
          if (startOpen) {
            event.preventDefault();
          }
        }}
        onOpenChange={(next) => {
          setOpen(next);

          if (!next) {
            setStartOpen(false);
          }
        }}
        open={open}
        portalContainer={container}
        triggerButton={
          <Trigger id={scoped("menu-open-state")}>Open on load</Trigger>
        }
      >
        <MenuItem onSelect={keepOpen}>Already open</MenuItem>
        <MenuItem onSelect={keepOpen}>Second row</MenuItem>
      </Menu>
      <Menu
        modal
        portalContainer={container}
        triggerButton={<Trigger id={scoped("menu-modal")}>Modal menu</Trigger>}
      >
        <MenuItem onSelect={keepOpen}>Modal row</MenuItem>
      </Menu>
      {theme === "light" ? (
        // No portal container: the menu portals to the body, which is where the page zoom
        // applies. A container suppresses the zoom.
        <MenuZoomProvider zoom={1.25}>
          <Menu
            triggerButton={
              <Trigger id={scoped("menu-zoom")}>Zoom 1.25</Trigger>
            }
          >
            <MenuItem onSelect={keepOpen}>Zoomed row</MenuItem>
          </Menu>
        </MenuZoomProvider>
      ) : null}
      <Menu
        portalContainer={container}
        triggerButton={
          <Trigger id={scoped("menu-section")}>Section and icon rows</Trigger>
        }
      >
        <MenuSection size="five-rows">
          {Array.from({ length: 8 }, (_, index) => (
            <MenuItem key={index} onSelect={keepOpen}>
              Section row {index + 1}
            </MenuItem>
          ))}
        </MenuSection>
        <MenuSeparator />
        <MenuRadioGroup onValueChange={setIcon} value={icon}>
          <MenuRadioItem value="one" variant="icon">
            1
          </MenuRadioItem>
          <MenuRadioItem value="two" variant="swatch">
            2
          </MenuRadioItem>
        </MenuRadioGroup>
      </Menu>
    </>
  );
};

/* -------------------------------------------------------- context menu */

const contextItems = [
  {
    id: "ctx-title",
    message: { defaultMessage: "Message actions", id: "ctx.title" },
    type: "label",
  },
  {
    accelerator: "CmdOrCtrl+C",
    id: "ctx-copy",
    message: { defaultMessage: "Copy", id: "ctx.copy" },
  },
  { id: "ctx-sep", type: "separator" },
  {
    checked: true,
    id: "ctx-check",
    message: { defaultMessage: "Wrap lines", id: "ctx.wrap" },
    type: "checkbox",
  },
  {
    checked: true,
    id: "ctx-radio",
    message: { defaultMessage: "Radio choice", id: "ctx.radio" },
    type: "radio",
  },
  {
    enabled: false,
    id: "ctx-off",
    message: { defaultMessage: "Unavailable", id: "ctx.off" },
  },
  {
    id: "ctx-danger",
    message: { defaultMessage: "Delete", id: "ctx.delete" },
    tone: "danger",
  },
  {
    id: "ctx-sub",
    message: { defaultMessage: "More", id: "ctx.more" },
    submenu: [
      {
        id: "ctx-sub-1",
        message: { defaultMessage: "Nested one", id: "ctx.n1" },
      },
    ],
  },
] as const satisfies readonly MenuContextItem[];

const ContextSection = ({ container }: { container: HTMLElement | null }) => (
  <>
    <MenuContextMenu container={container} items={contextItems}>
      <button
        className="flex h-24 w-64 items-center justify-center rounded-xl border border-dashed"
        id="context-area"
        type="button"
      >
        Right-click here
      </button>
    </MenuContextMenu>
    <MenuContextMenu container={container} items={contextItems} trigger="click">
      <Button color="outline" id="context-click" size="dialog">
        Click opens items
      </Button>
    </MenuContextMenu>
  </>
);

/* ------------------------------------------------------ native context menu */

interface BridgeCall {
  point: { x: number; y: number };
  template: unknown;
}

/** A small SVG as a data URI: the native menu receives string icons as they are. */
const nativeIcon =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6' fill='black'/%3E%3C/svg%3E";

const nativeItems = [
  {
    accelerator: "CmdOrCtrl+C",
    icon: nativeIcon,
    id: "n-copy",
    message: { defaultMessage: "Copy {what}", id: "n.copy" },
    messageValues: { what: "message" },
    tooltipMessage: { defaultMessage: "Copies {what}", id: "n.copy.tip" },
    tooltipMessageValues: { what: "the message" },
  },
  {
    id: "n-paste",
    message: { defaultMessage: "Paste", id: "n.paste" },
    nativeRole: "paste",
  },
  { id: "n-sep", type: "separator" },
  {
    checked: true,
    id: "n-wrap",
    message: { defaultMessage: "Wrap lines", id: "n.wrap" },
    type: "checkbox",
  },
  {
    checked: true,
    id: "n-radio-a",
    message: { defaultMessage: "Radio A", id: "n.ra" },
    type: "radio",
  },
  {
    checked: false,
    id: "n-radio-b",
    message: { defaultMessage: "Radio B", id: "n.rb" },
    type: "radio",
  },
  {
    enabled: false,
    id: "n-off",
    message: { defaultMessage: "Unavailable", id: "n.off" },
  },
  {
    id: "n-more",
    message: { defaultMessage: "More", id: "n.more" },
    submenu: [
      {
        id: "n-nested",
        message: { defaultMessage: "Nested {n}", id: "n.nested" },
        messageValues: { n: 1 },
      },
    ],
  },
  {
    id: "n-after",
    message: { defaultMessage: "Select after close", id: "n.after" },
    selectAfterClose: true,
  },
] as const satisfies readonly MenuContextItem[];

const answerLabels = [
  ["n-copy", "Copy"],
  ["n-paste", "Paste (role)"],
  ["n-wrap", "Wrap lines"],
  ["n-radio-b", "Radio B"],
  ["n-nested", "Nested 1"],
  ["n-after", "Select after close"],
  ["", "Dismiss"],
] as const;

const slowNativeItems = async (): Promise<MenuContextItem[]> => {
  // oxlint-disable-next-line promise/avoid-new -- A promise that settles after a delay stands in for a slow request.
  await new Promise((resolve) => {
    setTimeout(resolve, 2000);
  });

  return [...nativeItems];
};

/**
 * A local stand-in for the desktop shell's bridge. It records each (template, point) and
 * answers with the chosen id, or with nothing, which is how the operating system reports a
 * dismissed menu. The real menu is drawn by the operating system.
 */
const NativeSection = () => {
  const [installed, setInstalled] = useState(false);
  const [answer, setAnswer] = useState("n-copy");
  const [calls, setCalls] = useState<BridgeCall[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const answerRef = useRef(answer);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  // The desktop shell has the bridge before the page renders, so the stub is installed in the
  // handler, ahead of the re-render that reads it.
  const install = (on: boolean) => {
    if (on) {
      window.electronBridge = {
        showContextMenu: async (template, point) => {
          setCalls((previous) => [...previous, { point, template }]);
          // oxlint-disable-next-line promise/avoid-new -- The stub answers after a short delay, as the operating system does once the user chooses.
          await new Promise((resolve) => {
            setTimeout(resolve, 300);
          });

          return answerRef.current === ""
            ? undefined
            : { id: answerRef.current };
        },
      };
    } else {
      delete window.electronBridge;
    }

    setInstalled(on);
  };

  useEffect(
    () => () => {
      delete window.electronBridge;
    },
    []
  );

  const note = (message: string) => {
    setLog((previous) => [...previous, message]);
  };

  const withNote = (items: readonly MenuContextItem[]) =>
    items.map((item) =>
      item.id === "n-copy" || item.id === "n-after" || item.id === "n-nested"
        ? {
            ...item,
            onSelect: () => {
              note(`selected ${item.id}`);
            },
          }
        : item
    );

  const onSelectNested = (
    items: readonly MenuContextItem[]
  ): MenuContextItem[] =>
    withNote(items).map((item) =>
      item.submenu ? { ...item, submenu: withNote(item.submenu) } : item
    );

  return (
    <div className="flex w-full flex-col gap-3" id="native-section">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm">
          <input
            checked={installed}
            id="native-bridge"
            onChange={(event) => {
              install(event.target.checked);
            }}
            type="checkbox"
          />
          window.electronBridge stub
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          Stub answers
          <select
            className="rounded-md border bg-transparent px-1 py-0.5"
            id="native-answer"
            onChange={(event) => {
              setAnswer(event.target.value);
            }}
            value={answer}
          >
            {answerLabels.map(([id, label]) => (
              <option key={label} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <MenuContextMenu
          items={onSelectNested(nativeItems)}
          onAfterClose={() => {
            note("onAfterClose");
          }}
          onCloseAutoFocus={(event) => {
            note(`closeAutoFocus prevented=${event.defaultPrevented}`);
          }}
          onOpenChange={(open) => {
            note(`open ${open}`);
          }}
        >
          <button
            className="flex h-20 w-56 items-center justify-center rounded-xl border border-dashed"
            id="native-area"
            type="button"
          >
            Right-click (native when stubbed)
          </button>
        </MenuContextMenu>
        <MenuContextMenu
          getItems={slowNativeItems}
          onOpenChange={(open) => {
            note(`slow open ${open}`);
          }}
        >
          <button
            className="flex h-20 w-56 items-center justify-center rounded-xl border border-dashed"
            id="native-slow-area"
            type="button"
          >
            Right-click: items arrive in 2s
          </button>
        </MenuContextMenu>
        <MenuContextMenu disableNative items={nativeItems}>
          <button
            className="flex h-20 w-56 items-center justify-center rounded-xl border border-dashed"
            id="native-disabled-area"
            type="button"
          >
            Right-click: disableNative
          </button>
        </MenuContextMenu>
      </div>
      <pre
        className="max-h-48 overflow-auto rounded-lg border p-2 text-xs"
        id="native-calls"
      >
        {JSON.stringify(
          calls.map(({ point, template }) => ({
            point,
            template,
          })),
          null,
          1
        )}
      </pre>
      <pre
        className="max-h-32 overflow-auto rounded-lg border p-2 text-xs"
        id="native-log"
      >
        {log.join("\n")}
      </pre>
    </div>
  );
};

/* ----------------------------------------------------------- list menu */

/**
 * An embedded control that owns Escape: with text in it, Escape clears the text and stops the
 * event on the element, so neither the menu's body listener nor Base UI sees it. With no text,
 * Escape passes through and the menu closes.
 */
const EscapeFirstInput = ({ id }: { id: string }) => {
  const [text, setText] = useState("Type, then Escape");
  const ref = useRef<HTMLInputElement>(null);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    const input = ref.current;

    const consume = (event: KeyboardEvent) => {
      if (event.key === "Escape" && textRef.current !== "") {
        event.stopPropagation();
        setText("");
      }
    };

    input?.addEventListener("keydown", consume);

    return () => {
      input?.removeEventListener("keydown", consume);
    };
  }, []);

  return (
    <input
      aria-label="Escape clears me first"
      className="w-full rounded-md border bg-transparent px-2 py-1 text-sm"
      id={id}
      onChange={(event) => {
        setText(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") {
          event.stopPropagation();
        }
      }}
      ref={ref}
      value={text}
    />
  );
};

const ListSection = ({ container }: { container: HTMLElement | null }) => {
  const scoped = useScoped();

  const [radio, setRadio] = useState("one");
  const [on, setOn] = useState(true);
  const [flag, setFlag] = useState(false);

  const body = (
    <>
      <ListMenuItem onSelect={keepOpen}>
        Plain item
        <ListMenuItemActions>
          <ListMenuItemAction
            onClick={(event) => {
              event.preventDefault();
            }}
          >
            ⋯
          </ListMenuItemAction>
        </ListMenuItemActions>
      </ListMenuItem>
      <ListMenuItem color="danger" onSelect={keepOpen}>
        Danger item
      </ListMenuItem>
      <ListMenuItem disabled onSelect={keepOpen}>
        Disabled item
      </ListMenuItem>
      <ListMenuItem>
        Content row
        <ListMenuDescription>Without handlers</ListMenuDescription>
      </ListMenuItem>
      <ListMenuItem>
        <EscapeFirstInput id={scoped("list-escape-input")} />
      </ListMenuItem>
      <ListMenuLink href="https://example.com">Absolute link</ListMenuLink>
      <ListMenuSeparator />
      <ListMenuCheckboxItem checked={on} onCheckedChange={setOn}>
        Solid checkbox
      </ListMenuCheckboxItem>
      <ListMenuCheckboxItem
        checked={flag}
        indicatorVariant="ghost"
        onCheckedChange={setFlag}
      >
        Ghost checkbox
      </ListMenuCheckboxItem>
      <ListMenuCheckboxItem
        checked={on}
        onCheckedChange={setOn}
        variant="switch"
      >
        Switch
      </ListMenuCheckboxItem>
      <ListMenuCheckboxItem
        checked={on}
        indicatorPosition="start"
        onCheckedChange={setOn}
      >
        Start indicator
      </ListMenuCheckboxItem>
      <ListMenuSeparator />
      <ListMenuRadioGroup onChange={setRadio} value={radio}>
        <ListMenuRadioItem value="one">Radio one</ListMenuRadioItem>
        <ListMenuRadioItem indicatorVariant="checkmark" value="two">
          Checkmark two
        </ListMenuRadioItem>
      </ListMenuRadioGroup>
      <ListMenuSeparator />
      <ListMenuSub>
        <ListMenuSubTrigger>Submenu</ListMenuSubTrigger>
        <ListMenuSubContent>
          <ListMenuItem onSelect={keepOpen}>Sub item</ListMenuItem>
        </ListMenuSubContent>
      </ListMenuSub>
    </>
  );

  return (
    <>
      <ListMenu>
        <ListMenuTrigger>
          <Trigger id={scoped("list-default")}>List menu</Trigger>
        </ListMenuTrigger>
        <ListMenuContent container={container}>{body}</ListMenuContent>
      </ListMenu>
      <ListMenu compact>
        <ListMenuTrigger>
          <Trigger id={scoped("list-compact")}>Compact</Trigger>
        </ListMenuTrigger>
        <ListMenuContent container={container}>{body}</ListMenuContent>
      </ListMenu>
      <ListMenu>
        <ListMenuTrigger>
          <Trigger id={scoped("list-descriptive")}>Descriptive</Trigger>
        </ListMenuTrigger>
        <ListMenuContent container={container} variant="descriptive">
          {body}
        </ListMenuContent>
      </ListMenu>
    </>
  );
};

/* ------------------------------------------------------------ the page */

const ThemePanel = ({ theme }: { theme: Theme }) => (
  <Panel
    label={`${theme === "light" ? "Light" : "Dark"} appearance`}
    theme={theme}
  >
    {(container) => (
      <>
        <DropdownSection container={container} />
        <SizeSection container={container} />
        <SurfaceSection container={container} />
        <VariantSection container={container} />
        <SearchSection container={container} />
        <StateSection container={container} />
        <ListSection container={container} />
      </>
    )}
  </Panel>
);

const NestedThemes = ({ outer }: { outer: Theme }) => {
  const inner: Theme = outer === "dark" ? "light" : "dark";

  return (
    <Panel label={`${outer} panel with a ${inner} panel inside`} theme={outer}>
      {(outerContainer) => (
        <>
          <Menu
            portalContainer={outerContainer}
            triggerButton={
              <Trigger id={`nested-${outer}-outer`}>Outer {outer} menu</Trigger>
            }
          >
            <MenuItem onSelect={keepOpen}>Outer row</MenuItem>
          </Menu>
          <Panel label={`Inner ${inner}`} theme={inner}>
            {(innerContainer) => (
              <Menu
                portalContainer={innerContainer}
                triggerButton={
                  <Trigger id={`nested-${outer}-inner`}>
                    Inner {inner} menu
                  </Trigger>
                }
              >
                <MenuItem onSelect={keepOpen}>Inner row</MenuItem>
                <MenuItem onSelect={keepOpen} tone="danger">
                  Inner danger
                </MenuItem>
              </Menu>
            )}
          </Panel>
        </>
      )}
    </Panel>
  );
};

const MenuGalleryExample = () => (
  <section className="flex min-w-0 flex-col gap-5" id="menu-gallery">
    <h2 className="text-title-md font-semibold">Menu</h2>
    <ThemePanel theme="light" />
    <ThemePanel theme="dark" />
    <NestedThemes outer="dark" />
    <NestedThemes outer="light" />
    <div dir="rtl" lang="ar">
      <Panel label="RTL" theme="light">
        {(container) => (
          <Menu
            dir="rtl"
            portalContainer={container}
            triggerButton={<Trigger id="menu-rtl">قائمة</Trigger>}
          >
            <MenuItem keyboardShortcut="⌘C" onSelect={keepOpen}>
              نسخ
            </MenuItem>
            <MenuCheckboxItem checked indicator="switch">
              تبديل
            </MenuCheckboxItem>
            <MenuFlyoutSubmenuItem label="المزيد">
              <MenuItem onSelect={keepOpen}>فرعي</MenuItem>
            </MenuFlyoutSubmenuItem>
          </Menu>
        )}
      </Panel>
    </div>
    <Panel label="Context menu" theme="light">
      {(container) => <ContextSection container={container} />}
    </Panel>
    <Panel label="Native context menu (local bridge stub)" theme="light">
      {() => <NativeSection />}
    </Panel>
  </section>
);

export { MenuGalleryExample };
