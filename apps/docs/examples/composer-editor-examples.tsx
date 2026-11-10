"use client";

import { ComposerEditor } from "composerkit/components/composer/editor/composer-editor";
import type { ComposerEditorController } from "composerkit/components/composer/editor/controller";
import {
  addDraftAttachments,
  createDraft,
  createDraftStore,
} from "composerkit/components/composer/editor/draft";
import type { ComposerDraft } from "composerkit/components/composer/editor/draft";
import type { ComposerMentionAttributes } from "composerkit/components/composer/editor/schema";
import { ComposerFeatureGatesProvider } from "composerkit/components/composer/feature-gates";
import {
  ComposerSendIcon,
  ComposerStopIcon,
  ComposerVoiceIcon,
} from "composerkit/components/composer/icons";
import type { ComposerMorphState } from "composerkit/components/composer/morph-geometry";
import type {
  ComposerEnterBehavior,
  FileAttachmentRef,
} from "composerkit/components/composer/rules";
import { Button } from "composerkit/components/ui/button";
import { ComposerSubmitButton } from "composerkit/components/ui/composer";
import type { SelectedMode } from "composerkit/components/ui/composer";
import {
  ReducedMotionAttribute,
  ReducedMotionProvider,
} from "composerkit/lib/reduced-motion";
import type { ReducedMotionPreference } from "composerkit/lib/reduced-motion";
import type { Node as ProseMirrorNode } from "prosemirror-model";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

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

const ACTION_BUTTON = { color: "outline", size: "composerSm" } as const;

/* ---------------------------------------------------------------- rich editor */

const NOTES_MENTION: ComposerMentionAttributes = {
  description: "A local file",
  displayName: "Project notes",
  name: "project-notes",
  path: "/work/notes.md",
};

const SKILL_MENTION: ComposerMentionAttributes = {
  description: "A local skill",
  displayName: "Documents",
  name: "documents",
  path: "skill://documents",
};

const APP_MENTION: ComposerMentionAttributes = {
  description: "A local app",
  displayName: "Calendar",
  name: "calendar",
  path: "app://calendar",
};

const ENTER_BEHAVIORS: readonly ComposerEnterBehavior[] = [
  "enter",
  "cmdIfMultiline",
  "cmdAlways",
];

type DemoAttachment = FileAttachmentRef & { fsPath: string };

const ATTACHMENT_CHOICES: readonly DemoAttachment[] = [
  { endLine: 10, fsPath: "src/app.ts", startLine: 1 },
  { endLine: 40, fsPath: "src/app.ts", startLine: 20 },
];

const attachmentLabel = ({ endLine, fsPath, startLine }: DemoAttachment) =>
  `${fsPath}:${startLine}-${endLine}`;

const draftStore = createDraftStore<DemoAttachment>();
const DRAFT_KEY = "conversation-1";

const EditorExamples = () => {
  const controller = useRef<ComposerEditorController | null>(null);

  const [session, setSession] = useState<{
    doc?: ProseMirrorNode;
    key: number;
  }>({ key: 0 });

  const [text, setText] = useState("");
  const [log, setLog] = useState<readonly string[]>([]);

  const [enterBehavior, setEnterBehavior] =
    useState<ComposerEnterBehavior>("enter");

  const [planMode, setPlanMode] = useState(false);
  const [transcript, setTranscript] = useState("none");
  const [attachments, setAttachments] = useState<readonly DemoAttachment[]>([]);
  const [savedKeys, setSavedKeys] = useState<readonly string[]>([]);

  const record = (entry: string) => {
    setLog((current) => [entry, ...current].slice(0, 8));
  };

  const keyContext = {
    enterBehavior,
    handleEscape: () => {
      record("Escape: handler ran");
    },
    hasDefaultMode: true,
    isPlanMode: planMode,
    onSubmit: () => {
      record(`Enter: submit "${controller.current?.getText() ?? ""}"`);
    },
    setSelectedMode: (mode: SelectedMode) => {
      record(`Backspace at start: mode ${mode ?? "none"}`);
      setPlanMode(mode === "plan");
    },
  };

  const use = (action: (editor: ComposerEditorController) => void) => () => {
    const editor = controller.current;

    if (editor) {
      action(editor);
      setText(editor.getText());
    }
  };

  const saveDraft = () => {
    const editor = controller.current;

    if (!editor) {
      return;
    }

    draftStore.set(DRAFT_KEY, createDraft(editor.view.state.doc, attachments));
    setSavedKeys(draftStore.keys());
  };

  const restoreDraft = () => {
    const draft: ComposerDraft<DemoAttachment> | undefined =
      draftStore.get(DRAFT_KEY);

    if (!draft) {
      return;
    }

    setAttachments(draft.attachments);
    setSession((current) => ({
      doc: draft.doc,
      key: current.key + 1,
    }));
  };

  return (
    <Section
      description="The editor is ProseMirror: a schema of paragraphs, line breaks, mentions and skill mentions, with history, typography input rules, a placeholder, the base keymap and the key routing for Enter, Escape and Backspace. Type -- or ... for the input rules, Shift+Enter for a line break, and Ctrl or Cmd+Z to undo."
      id="rich-editor"
      title="Rich editor"
    >
      <div className="flex flex-wrap items-center gap-2">
        {ENTER_BEHAVIORS.map((choice) => (
          <Button
            key={choice}
            {...ACTION_BUTTON}
            aria-pressed={enterBehavior === choice}
            onClick={() => {
              setEnterBehavior(choice);
            }}
          >
            Enter behaviour: {choice}
          </Button>
        ))}
        <Button
          {...ACTION_BUTTON}
          aria-pressed={planMode}
          onClick={() => {
            setPlanMode((current) => !current);
          }}
        >
          Plan mode
        </Button>
      </div>
      <div
        className="rounded-xl border bg-background p-3 text-sm"
        data-testid="rich-editor"
      >
        <ComposerEditor
          key={session.key}
          aria-label="Rich editor"
          controllerRef={controller}
          doc={session.doc}
          keyContext={keyContext}
          placeholder="Do anything"
          onChange={() => {
            setText(controller.current?.getText() ?? "");
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          {...ACTION_BUTTON}
          onClick={use((editor) => {
            editor.insertTextAtSelection("inserted");
          })}
        >
          Insert text at selection
        </Button>
        <Button
          {...ACTION_BUTTON}
          onClick={use((editor) => {
            editor.appendText("appended");
          })}
        >
          Append text
        </Button>
        <Button
          {...ACTION_BUTTON}
          onClick={use((editor) => {
            editor.insertDictationText("  dictated words ");
            const range = editor.lastInsertedTranscript;
            setTranscript(range ? `${range.from} to ${range.to}` : "none");
          })}
        >
          Insert dictation text
        </Button>
        <Button
          {...ACTION_BUTTON}
          onClick={use((editor) => {
            editor.insertMentionAtSelection(NOTES_MENTION);
          })}
        >
          Insert mention
        </Button>
        <Button
          {...ACTION_BUTTON}
          onClick={use((editor) => {
            editor.insertSkillMentionAtSelection(SKILL_MENTION);
          })}
        >
          Insert skill mention
        </Button>
        <Button
          {...ACTION_BUTTON}
          onClick={use((editor) => {
            editor.prependMentions([APP_MENTION]);
          })}
        >
          Prepend mention
        </Button>
        <Button
          {...ACTION_BUTTON}
          onClick={use((editor) => {
            editor.clear();
          })}
        >
          Clear
        </Button>
      </div>
      <p className="text-xs text-muted-foreground" data-testid="editor-text">
        Draft text: {JSON.stringify(text)}
      </p>
      <p
        className="text-xs text-muted-foreground"
        data-testid="editor-transcript"
      >
        Last dictation range: {transcript}
      </p>
      <p className="text-xs text-muted-foreground" data-testid="editor-log">
        Key routing (newest first): {log.join(" | ") || "none"}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {ATTACHMENT_CHOICES.map((choice) => (
          <Button
            key={attachmentLabel(choice)}
            {...ACTION_BUTTON}
            onClick={() => {
              setAttachments(
                (current) =>
                  addDraftAttachments(createDraft(undefined, current), [
                    choice,
                    choice,
                  ]).attachments
              );
            }}
          >
            Attach {attachmentLabel(choice)}
          </Button>
        ))}
        <Button {...ACTION_BUTTON} onClick={saveDraft}>
          Save draft
        </Button>
        <Button {...ACTION_BUTTON} onClick={restoreDraft}>
          Restore draft
        </Button>
        <Button
          {...ACTION_BUTTON}
          onClick={() => {
            draftStore.clear(DRAFT_KEY);
            setSavedKeys(draftStore.keys());
          }}
        >
          Discard draft
        </Button>
      </div>
      <p
        className="text-xs text-muted-foreground"
        data-testid="editor-attachments"
      >
        Attachments in the draft:{" "}
        {attachments.map(attachmentLabel).join(", ") || "none"}. Saved drafts:{" "}
        {savedKeys.join(", ") || "none"}.
      </p>
    </Section>
  );
};

/* ---------------------------------------------------------------- submit button morph */

const MORPH_STATES: readonly ComposerMorphState[] = ["send", "stop", "voice"];

const MORPH_ICONS = {
  send: ComposerSendIcon,
  stop: ComposerStopIcon,
  voice: ComposerVoiceIcon,
} as const;

const MORPH_LABELS: Record<ComposerMorphState, string> = {
  send: "Send",
  stop: "Stop generation",
  voice: "Start voice",
};

const MOTION_CHOICES = ["system", "on", "off"] as const;
const SEQUENCE_STEP_MS = 900;

const MORPH_SEQUENCE: readonly ComposerMorphState[] = [
  "stop",
  "send",
  "voice",
  "send",
];

const MorphExamples = () => {
  const [gateOn, setGateOn] = useState(true);
  const [state, setState] = useState<ComposerMorphState>("send");
  const [loading, setLoading] = useState(false);

  const [preference, setPreference] =
    useState<ReducedMotionPreference>("system");

  const timers = useRef<number[]>([]);

  const play = () => {
    for (const timer of timers.current) {
      window.clearTimeout(timer);
    }

    timers.current = MORPH_SEQUENCE.map((next, index) =>
      window.setTimeout(
        () => {
          setState(next);
        },
        (index + 1) * SEQUENCE_STEP_MS
      )
    );
  };

  return (
    <ReducedMotionProvider preference={preference}>
      <ReducedMotionAttribute />
      <Section
        description="With the feature gate on, a button that supports morphing and shows the send, stop or voice icon draws the morphing icon: four paths blend between the shapes, the icon rotates, shifts and scales, and a change through the voice shape passes by two in-between shapes. With the gate off the static icons show. A shortcut label never morphs. Reduced motion jumps to the new shape."
        id="submit-morph"
        title="Submit button morph"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            {...ACTION_BUTTON}
            aria-pressed={gateOn}
            onClick={() => {
              setGateOn((current) => !current);
            }}
          >
            Morph gate {gateOn ? "on" : "off"}
          </Button>
          {MORPH_STATES.map((choice) => (
            <Button
              key={choice}
              {...ACTION_BUTTON}
              aria-pressed={state === choice}
              onClick={() => {
                setState(choice);
              }}
            >
              State: {choice}
            </Button>
          ))}
          <Button {...ACTION_BUTTON} onClick={play}>
            Play stop, send, voice, send
          </Button>
          <Button
            {...ACTION_BUTTON}
            aria-pressed={loading}
            onClick={() => {
              setLoading((current) => !current);
            }}
          >
            Loading
          </Button>
          {MOTION_CHOICES.map((choice) => (
            <Button
              key={choice}
              {...ACTION_BUTTON}
              aria-pressed={preference === choice}
              onClick={() => {
                setPreference(choice);
              }}
            >
              Reduced motion: {choice}
            </Button>
          ))}
        </div>
        <ComposerFeatureGatesProvider gates={{ submitMorph: gateOn }}>
          <div
            className="flex flex-wrap items-center gap-6 rounded-xl border bg-background p-4"
            data-testid="morph-buttons"
          >
            <div className="flex flex-col items-center gap-1">
              <ComposerSubmitButton
                ariaLabel={MORPH_LABELS[state]}
                Icon={MORPH_ICONS[state]}
                isLoading={loading}
                supportsMorphing
              />
              <span className="text-xs text-muted-foreground">Morphs</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ComposerSubmitButton
                ariaLabel="Send with a shortcut label"
                Icon={MORPH_ICONS[state]}
                keyboardShortcutLabel="⌘↵"
                supportsMorphing
              />
              <span className="text-xs text-muted-foreground">
                Shortcut label
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <ComposerSubmitButton
                ariaLabel={MORPH_LABELS[state]}
                Icon={MORPH_ICONS[state]}
                isLoading={loading}
              />
              <span className="text-xs text-muted-foreground">
                Without supportsMorphing
              </span>
            </div>
          </div>
        </ComposerFeatureGatesProvider>
        <p className="text-xs text-muted-foreground" data-testid="morph-state">
          State {state}, gate {gateOn ? "on" : "off"}
        </p>
      </Section>
    </ReducedMotionProvider>
  );
};

export { EditorExamples, MorphExamples };
