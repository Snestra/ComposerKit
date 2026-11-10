"use client";

import { Field } from "@base-ui/react/field";
import { Button } from "@workspace/react/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/react/components/ui/dialog";
import { Menu, MenuItem } from "@workspace/react/components/ui/menu";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/react/components/ui/popover";
import { Select } from "@workspace/react/components/ui/select";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { ChatComposer } from "@/components/chat-composer";
import type { PreviewState } from "@/components/chat-composer";
import { ChatShell } from "@/components/chat-shell";
import { ChatThread } from "@/components/chat-thread";
import type { ChatMessage } from "@/components/chat-thread";
import { SettingsForm } from "@/components/settings-form";

const initialMessages: ChatMessage[] = [
  { content: "Plan a focused afternoon.", id: "example-user", role: "user" },
  {
    content: "Choose one task. Silence distractions, then take a short break.",
    id: "example-assistant",
    role: "assistant",
  },
];

const states = [
  { label: "Ready", value: "ready" },
  { label: "Working", value: "working" },
  { label: "Error", value: "error" },
] as const;

const DesignPreview = () => {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState>("ready");
  const [menuOpen, setMenuOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const nextId = useRef(0);

  const navigation = (
    <nav className="flex h-full min-h-0 flex-col gap-4 p-4">
      <h2 className="preview-heading">Threads</h2>
      <Link href="/gallery">Component gallery</Link>
      <Link href="/preferences">Preferences screen</Link>
      <Button
        color="outline"
        size="dialog"
        className="justify-start"
        onClick={() => {
          setMessages(initialMessages);
          setDraft("");
          setPreviewState("ready");
          setDrawerOpen(false);
        }}
      >
        New thread
      </Button>
      <div className="min-w-0 rounded-control bg-secondary px-3 py-2">
        Focused afternoon
      </div>
      <Popover open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <PopoverTrigger
          render={
            <Button
              color="ghostActive"
              size="dialog"
              className="mt-auto justify-start"
            />
          }
        >
          Preferences
        </PopoverTrigger>
        <PopoverContent align="end" side="right" sideOffset={4}>
          <div className="p-4">
            <PopoverTitle className="mb-4">
              <span className="preview-heading">Preferences</span>
            </PopoverTitle>
            <SettingsForm />
          </div>
        </PopoverContent>
      </Popover>
    </nav>
  );

  return (
    <div className="flex h-dvh min-h-0 flex-col">
      <ChatShell
        navigation={navigation}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
      >
        <header className="flex flex-wrap items-center gap-3 px-4 pt-4">
          <h1 className="preview-heading mr-auto">Design preview</h1>
          <Field.Root className="flex items-center gap-2">
            <Field.Label id="preview-state-label">Preview state</Field.Label>
            <Select
              aria-labelledby="preview-state-label"
              block={false}
              onChange={(option) => {
                const next = states.find(
                  (entry) => entry.value === option.value
                );

                if (next) {
                  setPreviewState(next.value);
                }
              }}
              options={states}
              value={previewState}
            />
          </Field.Root>
          <Menu
            align="end"
            onOpenChange={setMenuOpen}
            open={menuOpen}
            sideOffset={4}
            triggerButton={
              <Button
                ref={moreRef}
                color="ghostActive"
                size="iconCircleLg"
                aria-label="More options"
              >
                <MoreHorizontal />
              </Button>
            }
          >
            <MenuItem
              onSelect={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
            >
              Clear draft
            </MenuItem>
          </Menu>
        </header>
        <ChatThread messages={messages} />
        <ChatComposer
          value={draft}
          onValueChange={setDraft}
          state={previewState}
          onRetry={() => {
            setPreviewState("ready");
          }}
          onSubmit={() => {
            if (!draft.trim()) {
              return;
            }

            nextId.current += 1;
            setMessages((current) => [
              ...current,
              { content: draft, id: `local-${nextId.current}`, role: "user" },
            ]);
            setDraft("");
          }}
        />
      </ChatShell>
      <Dialog
        open={confirmOpen}
        size="compact"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          moreRef.current?.focus();
        }}
        onOpenChange={setConfirmOpen}
      >
        <DialogBody>
          <DialogHeader
            subtitle={
              <DialogDescription className="contents">
                Your draft text will be removed.
              </DialogDescription>
            }
            title={<DialogTitle className="contents">Clear draft?</DialogTitle>}
          />
          <div className="pt-6">
            <DialogFooter>
              <DialogClose render={<Button color="outline" size="dialog" />}>
                Keep writing
              </DialogClose>
              <DialogClose
                render={
                  <Button
                    size="dialog"
                    onClick={() => {
                      setDraft("");
                    }}
                  />
                }
              >
                Clear draft
              </DialogClose>
            </DialogFooter>
          </div>
        </DialogBody>
      </Dialog>
    </div>
  );
};

export { DesignPreview };
