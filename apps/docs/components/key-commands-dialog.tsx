"use client";

/* oxlint-disable shadcn/no-restyle -- The shortcuts dialog has its own layout. */

import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/react/components/ui/dialog";
import { useState } from "react";
import type { RefObject } from "react";

const groups = [
  {
    commands: [
      { action: "Send message", keys: ["Enter"] },
      { action: "Insert a line break", keys: ["Shift", "Enter"] },
      { action: "Clear the draft", keys: ["Ctrl", "Backspace"] },
    ],
    title: "Writing",
  },
  {
    commands: [
      { action: "Start a new thread", keys: ["Ctrl", "Alt", "N"] },
      { action: "Open preferences", keys: ["Ctrl", ","] },
      { action: "Show key commands", keys: ["Ctrl", "/"] },
    ],
    title: "Moving around",
  },
];

const KeyCommandsDialog = ({
  open,
  onOpenChange,
  opener,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opener: RefObject<HTMLButtonElement | null>;
}) => {
  const [filter, setFilter] = useState("");

  const visible = groups.flatMap((group) => {
    const commands = group.commands.filter((command) =>
      command.action.toLowerCase().includes(filter.toLowerCase())
    );

    return commands.length ? [{ ...group, commands }] : [];
  });

  return (
    <Dialog
      className="max-h-[min(560px,calc(100dvh-2rem))] overflow-y-auto"
      open={open}
      size="wide"
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        opener.current?.focus();
      }}
      onOpenChange={(next) => {
        onOpenChange(next);

        if (!next) {
          setFilter("");
        }
      }}
    >
      <DialogBody className="gap-3">
        <DialogHeader
          subtitle={
            <DialogDescription className="contents">
              Example commands. These shortcuts are not active in this preview.
            </DialogDescription>
          }
          subtitleSize="sm"
          title={<DialogTitle className="contents">Key commands</DialogTitle>}
        />
        <label htmlFor="command-filter" className="sr-only">
          Filter commands
        </label>
        <input
          id="command-filter"
          className="key-filter"
          placeholder="Filter commands"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value);
          }}
        />
        <div className="key-list">
          <div aria-live="polite">
            {visible.length === 0 && "No commands match your filter."}
          </div>
          {visible.map((group) => (
            <section key={group.title} className="key-group">
              <h3>{group.title}</h3>
              {group.commands.map((command) => (
                <div key={command.action} className="key-row">
                  <span>{command.action}</span>
                  <span className="key-chips">
                    {command.keys.map((key) => (
                      <kbd key={key}>{key}</kbd>
                    ))}
                  </span>
                </div>
              ))}
            </section>
          ))}
        </div>
      </DialogBody>
    </Dialog>
  );
};

export { KeyCommandsDialog };
