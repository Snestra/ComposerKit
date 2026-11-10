"use client";

import { ChatSidebar } from "composerkit/components/chat-sidebar/chat-sidebar";
import type {
  ChatSidebarProject,
  ChatSidebarThread,
} from "composerkit/components/chat-sidebar/chat-sidebar";
import { useState } from "react";

// Minutes since each chat's last activity, and the unread ones.
const AGE_MINUTES = {
  t01: 12,
  t02: 48,
  t03: 95,
  t04: 180,
  t05: 300,
  t06: 420,
  t07: 600,
  t08: 900,
  t09: 1500,
  t10: 2400,
  t11: 3300,
  t12: 4300,
  t13: 90,
  t14: 300,
  t15: 2000,
  t16: 12_000,
  t17: 60_000,
} as const;

type ThreadId = keyof typeof TITLES;

const UNREAD = new Set<ThreadId>(["t04", "t08"]);

const MINUTE = 60_000;

const TITLES = {
  t01: "Fix login redirect loop",
  t02: "Release checklist for 2.4",
  t03: "Port settings page to new router",
  t04: "Scratch notes on caching",
  t05: "Investigate flaky checkout test",
  t06: "Draft migration guide",
  t07: "Rename workspace module",
  t08: "Upgrade dependencies",
  t09: "Add dark mode toggle",
  t10: "Review onboarding copy",
  t11: "Spike offline sync",
  t12: "Archive old experiments",
  t13: "Tidy gamma configs",
  t14: "Delta import script",
  t15: "Epsilon load test",
  t16: "Zeta release notes",
  t17: "Eta docs sweep",
} as const;

const PROJECT_LAYOUT: { id: string; name: string; threads: ThreadId[] }[] = [
  { id: "proj-gamma", name: "Gamma", threads: ["t13"] },
  { id: "proj-delta", name: "Delta", threads: ["t14"] },
  { id: "proj-epsilon", name: "Epsilon", threads: ["t15"] },
  { id: "proj-zeta", name: "Zeta", threads: ["t16"] },
  { id: "proj-eta", name: "Eta", threads: ["t17"] },
  { id: "proj-apollo", name: "Apollo", threads: ["t01", "t05", "t07", "t10"] },
  { id: "proj-zephyr", name: "Zephyr", threads: ["t03", "t06", "t09", "t12"] },
];

const PINNED_IDS: ThreadId[] = ["t02"];

/** The fixture with ages measured from the moment the demo mounts. */
const buildFixture = (now: number) => {
  const thread = (id: ThreadId): ChatSidebarThread => {
    const project = PROJECT_LAYOUT.find((entry) => entry.threads.includes(id));
    const projectId = id === "t02" ? "proj-apollo" : project?.id;

    return {
      id,
      projectId,
      title: TITLES[id],
      unread: UNREAD.has(id),
      updatedAt: now - AGE_MINUTES[id] * MINUTE,
      workingDirectory:
        projectId === undefined
          ? "/home/user"
          : `/home/user/${projectId.slice(5)}`,
    };
  };

  const projects: ChatSidebarProject[] = PROJECT_LAYOUT.map((project) => ({
    chatCount: project.threads.length + (project.id === "proj-apollo" ? 1 : 0),
    id: project.id,
    name: project.name,
    path: `/home/user/${project.name.toLowerCase()}`,
    threads: project.threads.map(thread),
  }));

  const ids = Object.keys(TITLES).filter((id): id is ThreadId => id in TITLES);

  const recents = ids
    .filter((id) => !PINNED_IDS.includes(id))
    .map(thread)
    .toSorted((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  return { pinned: PINNED_IDS.map(thread), projects, recents };
};

const inOrder = <T extends { id: string }>(items: T[], ids: string[]): T[] =>
  items.toSorted((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));

const useSidebarDemo = () => {
  const [pinned, setPinned] = useState(() => buildFixture(Date.now()).pinned);

  const [projects, setProjects] = useState(
    () => buildFixture(Date.now()).projects
  );

  const [recents, setRecents] = useState(
    () => buildFixture(Date.now()).recents
  );

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState("No action yet");

  const findThread = (threadId: string) =>
    [...pinned, ...recents].find((entry) => entry.id === threadId);

  const onPinThread = (threadId: string, nextPinned: boolean) => {
    setLastAction(
      nextPinned ? `Pin chat ${threadId}` : `Unpin chat ${threadId}`
    );

    if (nextPinned) {
      const entry = findThread(threadId);
      setRecents((current) => current.filter((item) => item.id !== threadId));
      setProjects((current) =>
        current.map((project) => ({
          ...project,
          threads: project.threads.filter((item) => item.id !== threadId),
        }))
      );

      if (entry !== undefined) {
        setPinned((current) => [...current, entry]);
      }
    } else {
      const entry = pinned.find((item) => item.id === threadId);
      setPinned((current) => current.filter((item) => item.id !== threadId));

      if (entry !== undefined) {
        setRecents((current) => [entry, ...current]);
      }
    }
  };

  const onArchiveThread = (threadId: string) => {
    setLastAction(`Archive chat ${threadId}`);
    setPinned((current) => current.filter((item) => item.id !== threadId));
    setRecents((current) => current.filter((item) => item.id !== threadId));
    setProjects((current) =>
      current.map((project) => ({
        ...project,
        threads: project.threads.filter((item) => item.id !== threadId),
      }))
    );
  };

  const onMoveThreadToProject = (
    threadId: string,
    projectId: string | null
  ) => {
    setLastAction(
      projectId === null
        ? `Remove chat ${threadId} from its project`
        : `Move chat ${threadId} to ${projectId}`
    );

    const entry = [
      ...recents,
      ...projects.flatMap((project) => project.threads),
    ].find((item) => item.id === threadId);

    if (entry === undefined) {
      return;
    }

    setProjects((current) =>
      current.map((project) => {
        const rest = project.threads.filter((item) => item.id !== threadId);

        return project.id === projectId
          ? { ...project, threads: [entry, ...rest] }
          : { ...project, threads: rest };
      })
    );
  };

  const sidebar = (
    <ChatSidebar
      footer={<span className="text-sm text-text-muted">stub@example.com</span>}
      onArchiveThread={onArchiveThread}
      onNewChat={(projectId) => {
        setLastAction(
          projectId === undefined ? "New chat" : `New chat in ${projectId}`
        );
      }}
      onMoveThreadToProject={onMoveThreadToProject}
      onPinThread={onPinThread}
      onReorderProjects={(ids) => {
        setProjects((current) => inOrder(current, ids));
        setLastAction(`Project order ${ids.join(", ")}`);
      }}
      onReorderThreads={(group, ids) => {
        if (group.kind === "pinned") {
          setPinned((current) => inOrder(current, ids));
        } else if (group.kind === "recents") {
          setRecents((current) => inOrder(current, ids));
        } else if (group.kind === "project") {
          setProjects((current) =>
            current.map((project) =>
              project.id === group.projectId
                ? { ...project, threads: inOrder(project.threads, ids) }
                : project
            )
          );
        }

        setLastAction(`Chat order ${ids.join(", ")}`);
      }}
      onProjectAction={(projectId, action) => {
        setLastAction(`Project ${action} ${projectId}`);
      }}
      onThreadAction={(threadId, action) => {
        setLastAction(`Chat ${action} ${threadId}`);
      }}
      onSelectThread={(threadId) => {
        setSelectedThreadId(threadId);
        setLastAction(`Select chat ${threadId}`);
      }}
      pinnedThreads={pinned}
      projects={projects}
      recentThreads={recents}
      selectedThreadId={selectedThreadId}
    />
  );

  return { lastAction, sidebar };
};

const ChatSidebarGalleryExample = () => {
  const { lastAction, sidebar } = useSidebarDemo();

  return (
    <main className="flex min-h-dvh flex-col gap-6 bg-background p-6 text-text">
      <h1 className="text-title-md font-semibold">Chat sidebar</h1>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {lastAction}
      </p>
      <div className="flex flex-wrap items-start gap-6">
        <figure className="flex flex-col gap-1" data-testid="chat-sidebar">
          <figcaption className="text-xs text-muted-foreground">
            Pinned, seven projects and recents
          </figcaption>
          <div className="h-[560px] w-[340px] overflow-hidden rounded-xl border bg-panel">
            {sidebar}
          </div>
        </figure>
        <figure
          className="flex flex-col gap-1"
          data-testid="chat-sidebar-empty"
        >
          <figcaption className="text-xs text-muted-foreground">
            Empty
          </figcaption>
          <div className="h-[400px] w-[340px] overflow-hidden rounded-xl border bg-panel">
            <ChatSidebar />
          </div>
        </figure>
      </div>
    </main>
  );
};

/**
 * The sidebar as the left panel of the app window: 340px wide, full height,
 * starting 44px down where the window toolbar and top inset end.
 */
const ChatSidebarWindowExample = () => {
  const { lastAction, sidebar } = useSidebarDemo();

  return (
    <div className="flex h-dvh bg-panel text-text">
      <aside className="flex h-full w-[340px] shrink-0 flex-col pt-11">
        {sidebar}
      </aside>
      <main className="flex flex-1 flex-col gap-4 p-6">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {lastAction}
        </p>
        <textarea
          aria-label="Work with the agent"
          className="mt-auto h-24 w-full max-w-3xl resize-none self-center rounded-3xl border border-border bg-panel p-4 text-base outline-none"
          placeholder="Work with the agent"
        />
      </main>
    </div>
  );
};

export { ChatSidebarGalleryExample, ChatSidebarWindowExample };
