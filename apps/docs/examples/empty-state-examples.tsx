"use client";

import { MagnifyingGlass24Icon } from "@workspace/react/components/empty-state/icons";
import { Button } from "@workspace/react/components/ui/button";
import {
  EmptyState,
  PageEmptyState,
  SearchEmptyState,
} from "@workspace/react/components/ui/empty-state";
import type {
  PageEmptyStateIllustrationSize,
  PageEmptyStateLayout,
} from "@workspace/react/components/ui/empty-state";
import { cn } from "@workspace/react/lib/utils";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

type Scope = "dark" | "light";

const scopeTitle = (scope: Scope) =>
  scope === "dark" ? "Dark theme" : "Light theme";

const Section = ({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode;
  description?: string;
  id: string;
  title: string;
}) => (
  <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-3">
    <h2 className="text-title-md font-semibold" id={`${id}-heading`}>
      {title}
    </h2>
    {description === undefined ? null : (
      <p className="text-sm text-muted-foreground">{description}</p>
    )}
    {children}
  </section>
);

const Frame = ({
  children,
  className,
  label,
  testId,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  testId: string;
}) => (
  <figure
    className={cn("flex min-w-0 flex-col gap-1", className)}
    data-testid={testId}
  >
    <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
    <div className="rounded-xl border bg-background">{children}</div>
  </figure>
);

const CreateAction = () => <Button size="dialog">Create item</Button>;

const BasicExamples = () => (
  <Section
    description="The source EmptyState: an icon slot, a title, an optional description and an optional actions row. The compact width is 288px and the wide width 576px."
    id="basic"
    title="Empty state"
  >
    <div className="grid gap-4 md:grid-cols-2">
      <Frame label="Compact (default), all parts" testId="empty-full">
        <EmptyState
          actions={<CreateAction />}
          description="Items you create will show up here."
          icon={<Inbox />}
          title="Nothing here yet"
        />
      </Frame>
      <Frame
        className="md:col-span-2"
        label="Wide, all parts"
        testId="empty-wide"
      >
        <EmptyState
          actions={
            <>
              <CreateAction />
              <Button color="secondary" size="dialog">
                Learn more
              </Button>
            </>
          }
          description="Items you create will show up here. A wide empty state keeps longer descriptions on fewer lines, so the text reads as a short paragraph under the title."
          icon={<Inbox />}
          title="Nothing here yet"
          width="wide"
        />
      </Frame>
      <Frame
        label="Title only (empty icon slot still takes a gap)"
        testId="empty-title"
      >
        <EmptyState title="Nothing here yet" />
      </Frame>
      <Frame label="Title and description, no icon" testId="empty-no-icon">
        <EmptyState
          description="Items you create will show up here."
          title="Nothing here yet"
        />
      </Frame>
      <Frame
        label="Icon and actions, no description"
        testId="empty-no-description"
      >
        <EmptyState
          actions={<CreateAction />}
          icon={<Inbox />}
          title="Nothing here yet"
        />
      </Frame>
      <Frame
        label="Disabled action, wrapping actions row"
        testId="empty-disabled"
      >
        <EmptyState
          actions={
            <>
              <Button disabled size="dialog">
                Create item
              </Button>
              <Button color="secondary" size="dialog">
                Import items
              </Button>
              <Button color="secondary" size="dialog">
                Browse templates
              </Button>
            </>
          }
          description="Creating items is turned off."
          icon={<Inbox />}
          title="Nothing here yet"
        />
      </Frame>
      <Frame
        label="className and contentClassName (mt-8 root, 384px content)"
        testId="empty-overrides"
      >
        <EmptyState
          className="mt-8"
          contentClassName="max-w-96"
          description="The root and the content column take extra classes."
          icon={<Inbox />}
          title="Nothing here yet"
        />
      </Frame>
      <Frame
        label="Long title and description wrap inside the width"
        testId="empty-long"
      >
        <EmptyState
          description="Items you create will show up here once you add them, and a long description wraps onto as many lines as it needs inside the compact width."
          icon={<Inbox />}
          title="A title that is long enough to wrap onto a second line in the compact width"
        />
      </Frame>
    </div>
  </Section>
);

const LoadingExample = () => {
  const [pending, setPending] = useState(false);

  return (
    <Section
      description="Actions are any node. This one shows the library Button's loading state while it works."
      id="actions"
      title="Interactive actions"
    >
      <Frame label="Press Create item" testId="empty-loading">
        <EmptyState
          actions={
            <Button
              loading={pending}
              onClick={() => {
                setPending(true);
                setTimeout(() => {
                  setPending(false);
                }, 1500);
              }}
              size="dialog"
            >
              Create item
            </Button>
          }
          description="Items you create will show up here."
          icon={<Inbox />}
          title="Nothing here yet"
        />
      </Frame>
    </Section>
  );
};

const layouts = [
  "default",
  "page",
  "popover",
  "outlined",
  "browse",
  "withPreview",
] as const satisfies readonly PageEmptyStateLayout[];

const LayoutExamples = () => (
  <Section
    description="The page empty state in each of its six layouts, with the default compact spacing and the default illustration."
    id="layouts"
    title="Page empty state layouts"
  >
    <div className="grid gap-4 md:grid-cols-2">
      {layouts.map((layout) => (
        <Frame
          key={layout}
          label={`layout: ${layout}`}
          testId={`page-layout-${layout}`}
        >
          <PageEmptyState
            actions={<CreateAction />}
            description="Items you create will show up here."
            illustration={<Inbox className="size-8" />}
            layout={layout}
            title="Nothing here yet"
          />
        </Frame>
      ))}
    </div>
  </Section>
);

const sizes = [
  "default",
  "icon",
  "tile",
  "hero",
] as const satisfies readonly PageEmptyStateIllustrationSize[];

const IllustrationExamples = () => (
  <Section
    description="Illustration sizes, spacing and tone of the page empty state."
    id="illustrations"
    title="Illustration, spacing and tone"
  >
    <div className="grid gap-4 md:grid-cols-2">
      {sizes.map((size) => (
        <Frame
          key={size}
          label={`illustrationSize: ${size}`}
          testId={`page-illustration-${size}`}
        >
          <PageEmptyState
            description="Items you create will show up here."
            illustration={<Inbox className="size-8" />}
            illustrationSize={size}
            title="Nothing here yet"
          />
        </Frame>
      ))}
      <Frame label="spacing: default (16px gap)" testId="page-spacing-default">
        <PageEmptyState
          description="Items you create will show up here."
          illustration={<Inbox className="size-8" />}
          spacing="default"
          title="Nothing here yet"
        />
      </Frame>
      <Frame label="tone: faded" testId="page-tone-faded">
        <PageEmptyState
          description="Items you create will show up here."
          illustration={<Inbox className="size-8" />}
          title="Nothing here yet"
          tone="faded"
        />
      </Frame>
      <Frame label="Title only" testId="page-title-only">
        <PageEmptyState title="Nothing here yet" />
      </Frame>
      <Frame label="Description only" testId="page-description-only">
        <PageEmptyState description="Items you create will show up here." />
      </Frame>
    </div>
  </Section>
);

const SearchExamples = () => (
  <Section
    description="The no-results state for a search: the chip with the magnifying glass, the heading, the sentence with the query and the guidance on its own line. Text cannot be selected."
    id="search"
    title="Search with no results"
  >
    <div className="grid gap-4 md:grid-cols-2">
      <Frame label="Query: example" testId="search-example">
        <SearchEmptyState query="example" />
      </Frame>
      <Frame label="Query without spaces wraps anywhere" testId="search-long">
        <SearchEmptyState query="averyveryverylongsearchquerywithoutanyspacesthatcannotwrapnaturallyaverylongsearchquery" />
      </Frame>
    </div>
  </Section>
);

const RtlExample = () => (
  <Section
    description="The same states in a right-to-left container."
    id="rtl"
    title="Right to left"
  >
    <div className="grid gap-4 md:grid-cols-2" dir="rtl" lang="ar">
      <Frame label="Empty state" testId="rtl-empty">
        <EmptyState
          actions={<Button size="dialog">إنشاء عنصر</Button>}
          description="ستظهر العناصر التي تنشئها هنا."
          icon={<Inbox />}
          title="لا يوجد شيء هنا بعد"
        />
      </Frame>
      <Frame label="Search" testId="rtl-search">
        <SearchEmptyState
          guidanceMessage="جرّب بحثًا مختلفًا."
          noMatchesMessage="لا توجد نتائج لـ «مثال»."
          query="مثال"
          title="لم يتم العثور على نتائج"
        />
      </Frame>
    </div>
  </Section>
);

const PanelContent = ({ prefix }: { prefix: string }) => (
  <div className="flex flex-col gap-3">
    <Frame label="Empty state" testId={`${prefix}-empty`}>
      <EmptyState
        actions={<CreateAction />}
        description="Items you create will show up here."
        icon={<Inbox />}
        title="Nothing here yet"
      />
    </Frame>
    <Frame label="Search" testId={`${prefix}-search`}>
      <PageEmptyState
        description="Items you create will show up here."
        illustration={
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-fill-secondary-soft">
            <MagnifyingGlass24Icon />
          </span>
        }
        layout="outlined"
        title="Nothing here yet"
      />
    </Frame>
  </div>
);

// A theme scope sets color-scheme, so every theme-dependent value inside
// resolves at its nearest scope, at any depth.
const AppearancePanel = ({
  id,
  nested,
  scope,
}: {
  id: string;
  nested?: Scope;
  scope: Scope;
}) => (
  <section
    aria-labelledby={`${id}-heading`}
    className={`${scope} flex min-w-0 flex-col gap-3 rounded-2xl border bg-background p-4 text-foreground`}
    data-testid={id}
  >
    <h3 className="text-sm font-semibold" id={`${id}-heading`}>
      {scopeTitle(scope)}
      {nested === undefined ? "" : `, with a ${nested} panel inside`}
    </h3>
    <PanelContent prefix={id} />
    {nested === undefined ? null : (
      <section
        aria-labelledby={`${id}-nested-heading`}
        className={`${nested} flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
        data-testid={`${id}-nested`}
      >
        <h4 className="text-sm font-semibold" id={`${id}-nested-heading`}>
          {scopeTitle(nested)}, nested in {scope}
        </h4>
        <PanelContent prefix={`${id}-nested`} />
      </section>
    )}
  </section>
);

const AppearanceExamples = () => (
  <Section
    description="Each panel sets its own theme scope, so the appearance control above does not change them. The two lower panels nest the opposite theme inside, and the nested parts follow the nearest scope."
    id="appearance"
    title="Light and dark"
  >
    <div className="grid gap-4 lg:grid-cols-2">
      <AppearancePanel id="appearance-light" scope="light" />
      <AppearancePanel id="appearance-dark" scope="dark" />
      <AppearancePanel id="appearance-dark-light" nested="light" scope="dark" />
      <AppearancePanel id="appearance-light-dark" nested="dark" scope="light" />
    </div>
  </Section>
);

const EmptyStateGalleryExample = () => (
  <main className="mx-auto flex max-w-5xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Empty state</h1>
      <AppearanceControl id="empty-state-appearance" />
    </header>
    <BasicExamples />
    <LoadingExample />
    <LayoutExamples />
    <IllustrationExamples />
    <SearchExamples />
    <RtlExample />
    <AppearanceExamples />
  </main>
);

export { EmptyStateGalleryExample };
