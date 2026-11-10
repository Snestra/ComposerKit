"use client";

import { Button } from "composerkit/components/ui/button";
import { TooltipProvider } from "composerkit/components/ui/tooltip";
import { useState } from "react";

import { ChatComposer } from "@/components/chat-composer";
import { GalleryFrameTheme } from "@/components/gallery-frame-theme";

export function LandingComposer() {
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<{ id: string; text: string }[]>([]);

  return (
    <TooltipProvider>
      <GalleryFrameTheme />
      <main className="landing-playground">
        <header className="landing-playground-header">
          <span>ComposerKit playground</span>
          <Button
            color="ghost"
            size="pageAction"
            onClick={() => setMessages([])}
            disabled={messages.length === 0}
          >
            Clear messages
          </Button>
        </header>
        <div
          className="landing-playground-thread"
          role="log"
          aria-label="Messages"
        >
          <p className="landing-playground-note">
            Write a message to try the composer. Your message stays in this
            browser.
          </p>
          {messages.map((message) => (
            <p className="landing-playground-message" key={message.id}>
              {message.text}
            </p>
          ))}
        </div>
        <ChatComposer
          value={value}
          onValueChange={setValue}
          state="ready"
          onSubmit={() => {
            const message = value.trim();
            if (!message) return;
            setMessages((current) => [
              ...current,
              { id: crypto.randomUUID(), text: message },
            ]);
            setValue("");
          }}
        />
      </main>
    </TooltipProvider>
  );
}
