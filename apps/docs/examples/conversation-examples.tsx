"use client";

import { useToast } from "composerkit/components/ui/toast";
import { useState } from "react";

import { ChatComposer } from "@/components/chat-composer";
import { ChatThread } from "@/components/chat-thread";

const ChatComposerGalleryExample = () => {
  const toast = useToast();
  const [draft, setDraft] = useState("");

  return (
    <section>
      <h2>ChatComposer</h2>
      <h3>Ready</h3>
      <ChatComposer
        value={draft}
        onValueChange={setDraft}
        state="ready"
        onSubmit={() => {
          setDraft("");
        }}
      />
      <h3>Working</h3>
      <ChatComposer
        value="Add a message composer to the chat page."
        onValueChange={setDraft}
        state="working"
        onSubmit={() => {
          setDraft("");
        }}
      />
      <h3>Error</h3>
      <ChatComposer
        value="Keep my draft if the request fails."
        onValueChange={setDraft}
        state="error"
        onSubmit={() => {
          setDraft("");
        }}
        onRetry={() => {
          toast.info("Ready to retry.");
        }}
      />
    </section>
  );
};

const ChatThreadGalleryExample = () => (
  <section>
    <h2>ChatThread</h2>
    <ChatThread
      messages={[
        {
          content: "Where do I find the component source?",
          id: "1",
          role: "user",
        },
        {
          content:
            "Open a component page for its registry command, demo source and TypeScript props.",
          id: "2",
          role: "assistant",
        },
      ]}
    />
    <h3>Empty</h3>
    <ChatThread
      messages={[]}
      emptyContent="Write a message to start the conversation."
    />
  </section>
);

export { ChatComposerGalleryExample, ChatThreadGalleryExample };
