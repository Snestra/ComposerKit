"use client";

/* oxlint-disable anti-slop/no-shape-in-symbol-names -- The public names are shape, animateShape and AvatarShape. */
import { Facepile } from "composerkit/components/avatar/facepile";
import type { FacepilePerson } from "composerkit/components/avatar/facepile";
import {
  Avatar,
  GroupAvatar,
  GroupAvatarIcon,
} from "composerkit/components/ui/avatar";
import type {
  AvatarShapeOption,
  AvatarSize,
} from "composerkit/components/ui/avatar";
import { Button } from "composerkit/components/ui/button";
import { TooltipProvider } from "composerkit/components/ui/tooltip";
import {
  ReducedMotionAttribute,
  ReducedMotionProvider,
  useReducedMotion,
} from "composerkit/lib/reduced-motion";
import type { ReducedMotionPreference } from "composerkit/lib/reduced-motion";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";
import { AvatarImageWorker } from "@/components/avatar-image-worker";
import { withBasePath } from "@/lib/site";

type Scope = "dark" | "light";

const allSizes: readonly AvatarSize[] = [
  "badge",
  "inline",
  "xs",
  "response",
  "sm",
  "group",
  "md",
  "action",
  "row",
  "picker",
  "lg",
  "profile",
  "xl",
  "preview",
];

const allShapes: readonly AvatarShapeOption[] = [
  "circle",
  "blossom",
  "square",
  "oval",
  "scalloped",
  "none",
];

const morphTargets = [
  "circle",
  "blossom",
  "square",
  "oval",
  "scalloped",
] as const;

const names = [
  "Alex Sample",
  "Robin Placeholder",
  "Sam Example",
  "Kit Example",
  "Ada Example",
  "Single",
] as const;

const imageUrl = (delay: number, tone = 0, nonce = 0, format = "svg") =>
  withBasePath(
    `/gallery/avatar/image?delay=${delay}&tone=${tone}&n=${nonce}&format=${format}`
  );

const heading = "text-title-md font-semibold";
const note = "text-sm text-muted-foreground";

const Section = ({
  children,
  id,
  note: description,
  title,
}: {
  children: ReactNode;
  id: string;
  note: string;
  title: string;
}) => (
  <section
    aria-labelledby={`${id}-heading`}
    className="flex flex-col gap-3"
    data-testid={id}
  >
    <h2 className={heading} id={`${id}-heading`}>
      {title}
    </h2>
    <p className={note}>{description}</p>
    {children}
  </section>
);

const Labelled = ({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) => (
  <figure className="m-0 flex flex-col items-center gap-1">
    {children}
    <figcaption className="text-xs text-muted-foreground">{label}</figcaption>
  </figure>
);

const SizesExample = () => (
  <Section
    id="sizes"
    note="Every size name, with initials and with a picture. The fill size takes the 64px box around it."
    title="Sizes"
  >
    <div
      className="flex flex-wrap items-end gap-3"
      data-testid="sizes-initials"
    >
      {allSizes.map((size) => (
        <Labelled key={size} label={size}>
          <Avatar name="Alex Sample" size={size} />
        </Labelled>
      ))}
      <Labelled label="fill">
        <span className="inline-flex size-16" data-testid="fill-box">
          <Avatar name="Alex Sample" size="fill" />
        </span>
      </Labelled>
    </div>
    <div className="flex flex-wrap items-end gap-3" data-testid="sizes-images">
      {allSizes.map((size) => (
        <Labelled key={size} label={size}>
          <Avatar name="Alex Sample" size={size} src={imageUrl(0, 0)} />
        </Labelled>
      ))}
      <Labelled label="fill">
        <span className="inline-flex size-16" data-testid="fill-box-image">
          <Avatar name="Alex Sample" size="fill" src={imageUrl(0, 0)} />
        </span>
      </Labelled>
    </div>
  </Section>
);

const InitialsExample = () => (
  <Section
    id="initials"
    note="Initials come from the first and last word. The color comes from a hash of the color key, or of the name. Badge, inline and extra small show one letter."
    title="Initials and colors"
  >
    <div
      className="flex flex-wrap items-end gap-3"
      data-testid="initials-names"
    >
      {names.map((name) => (
        <Labelled key={name} label={name}>
          <Avatar name={name} size="md" />
        </Labelled>
      ))}
      <Labelled label="no name">
        <Avatar size="md" />
      </Labelled>
      <Labelled label="blank name">
        <Avatar name="   " size="md" />
      </Labelled>
      <Labelled label="color key a">
        <Avatar colorKey="a" name="Alex Sample" size="md" />
      </Labelled>
      <Labelled label="key a__x">
        <Avatar colorKey="a__x" name="Alex Sample" size="md" />
      </Labelled>
      <Labelled label="key a__y">
        <Avatar colorKey="a__y" name="Alex Sample" size="md" />
      </Labelled>
      <Labelled label="fallbackIcon">
        <Avatar fallbackIcon="#" name="Alex Sample" size="md" />
      </Labelled>
      <Labelled label="fallback">
        <Avatar
          fallback={<span className="rounded-full border px-2">Custom</span>}
          name="Alex Sample"
          size="md"
        />
      </Labelled>
    </div>
    <div className="flex flex-wrap items-end gap-3" data-testid="initials-tiny">
      {(["badge", "inline", "xs", "response", "sm"] as const).map((size) => (
        <Labelled key={size} label={size}>
          <Avatar name="Robin Placeholder" size={size} />
        </Labelled>
      ))}
    </div>
  </Section>
);

const ImageExample = () => {
  const [nonce, setNonce] = useState(0);
  const [errors, setErrors] = useState(0);

  return (
    <Section
      id="images"
      note="The slow picture takes four seconds. While it loads, the loading fallback shows and the picture stays hidden. Reload starts it again. A broken address falls back to initials and counts one error."
      title="Image loading"
    >
      <div className="flex flex-wrap items-end gap-4">
        <Labelled label="loaded">
          <Avatar name="Alex Sample" size="lg" src={imageUrl(0, 1)} />
        </Labelled>
        <Labelled label="slow, loading fallback">
          <span data-testid="slow-loading-fallback">
            <Avatar
              key={nonce}
              loadingFallback={
                <span
                  className="flex size-20 items-center justify-center rounded-full bg-fill-secondary-soft text-xs"
                  data-testid="loading-fallback"
                >
                  Loading
                </span>
              }
              name="Alex Sample"
              size="lg"
              src={imageUrl(4000, 2, nonce)}
            />
          </span>
        </Labelled>
        <Labelled label="slow, fade in">
          <span data-testid="slow-fade-in">
            <Avatar
              fadeIn
              key={nonce}
              name="Alex Sample"
              size="lg"
              src={imageUrl(4000, 3, nonce)}
            />
          </span>
        </Labelled>
        <Labelled label="slow, neither">
          <span data-testid="slow-plain">
            <Avatar
              key={nonce}
              name="Alex Sample"
              size="lg"
              src={imageUrl(4000, 4, nonce)}
            />
          </span>
        </Labelled>
        <Labelled label="broken address">
          <span data-testid="broken-image">
            <Avatar
              name="Robin Placeholder"
              onImageError={() => {
                setErrors((count) => count + 1);
              }}
              size="lg"
              src={withBasePath("/gallery/avatar/missing.png")}
            />
          </span>
        </Labelled>
        <Labelled label="referrer policy">
          <Avatar
            name="Alex Sample"
            referrerPolicy="no-referrer"
            size="lg"
            src={imageUrl(0, 0)}
          />
        </Labelled>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            setNonce((count) => count + 1);
          }}
          size="compact"
          color="outline"
        >
          Reload slow pictures
        </Button>
        <span className="text-sm" data-testid="image-error-count">
          onImageError calls: {errors}
        </span>
      </div>
    </Section>
  );
};

const MutedExample = () => {
  const [muted, setMuted] = useState(false);

  return (
    <Section
      id="muted"
      note="Muted dims an avatar to 40%. The change fades over 0.15s once muted has been set to any value, true or false. The page root attribute data-ck-reduced-motion, written by the host from the reduced motion preference above, turns the fade off when it is true. A name label or alt text makes the avatar an image for assistive tools."
      title="Muted and accessibility"
    >
      <div className="flex flex-wrap items-end gap-4">
        <Labelled label="toggled">
          <span data-testid="muted-toggled">
            <Avatar muted={muted} name="Alex Sample" size="lg" />
          </span>
        </Labelled>
        <Labelled label="muted true">
          <span data-testid="muted-true">
            <Avatar muted name="Alex Sample" size="lg" />
          </span>
        </Labelled>
        <Labelled label="muted unset">
          <span data-testid="muted-unset">
            <Avatar name="Alex Sample" size="lg" />
          </span>
        </Labelled>
        <Labelled label="muted picture">
          <span data-testid="muted-picture">
            <Avatar muted name="Alex Sample" size="lg" src={imageUrl(0, 1)} />
          </span>
        </Labelled>
        <Labelled label="with alt">
          <span data-testid="alt-labelled">
            <Avatar alt="Alex Sample" name="Alex Sample" size="lg" />
          </span>
        </Labelled>
        <Labelled label="without alt">
          <span data-testid="alt-decorative">
            <Avatar name="Alex Sample" size="lg" />
          </span>
        </Labelled>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          aria-pressed={muted}
          onClick={() => {
            setMuted((current) => !current);
          }}
          size="compact"
          color="outline"
        >
          Toggle muted
        </Button>
      </div>
    </Section>
  );
};

const HoverBlossom = ({
  animate,
  shape,
}: {
  animate: boolean;
  shape: AvatarShapeOption;
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Pointer hover drives the hovered prop.
    <div
      className="inline-flex w-fit"
      data-testid="morph-target"
      onPointerEnter={() => {
        setHovered(true);
      }}
      onPointerLeave={() => {
        setHovered(false);
      }}
    >
      <Avatar
        animateShape={animate}
        hovered={hovered}
        name="Alex Sample"
        shape={shape}
        size="profile"
      />
    </div>
  );
};

const ShapesExample = () => {
  const [shape, setShape] = useState<AvatarShapeOption>("circle");
  const [animate, setAnimate] = useState(true);

  return (
    <Section
      id="shapes"
      note="Each outline, the none shape, and an overlay. Pick a shape to morph the avatar in the box on the right. Hold the pointer on the blossom for a second and it turns once."
      title="Shapes"
    >
      <div className="flex flex-wrap items-end gap-4" data-testid="shapes-row">
        {allShapes.map((option) => (
          <Labelled key={option} label={option}>
            <Avatar name="Alex Sample" shape={option} size="picker" />
          </Labelled>
        ))}
        <Labelled label="picture, scalloped">
          <Avatar
            name="Alex Sample"
            shape="scalloped"
            size="picker"
            src={imageUrl(0, 3)}
          />
        </Labelled>
        <Labelled label="overlay, circle">
          <Avatar
            name="Alex Sample"
            overlay={
              <span
                className="absolute end-0 bottom-0 size-3 rounded-full border-2 border-background bg-fill-info-solid"
                data-testid="overlay-dot"
              />
            }
            size="picker"
          />
        </Labelled>
        <Labelled label="overlay, none">
          <Avatar
            name="Alex Sample"
            overlay={
              <span
                className="absolute end-0 bottom-0 size-3 rounded-full border-2 border-background bg-fill-info-solid"
                data-testid="overlay-dot-none"
              />
            }
            shape="none"
            size="picker"
          />
        </Labelled>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {morphTargets.map((option) => (
          <Button
            aria-pressed={shape === option}
            key={option}
            onClick={() => {
              setShape(option);
            }}
            size="compact"
            color="outline"
          >
            Morph to {option}
          </Button>
        ))}
        <Button
          aria-pressed={animate}
          onClick={() => {
            setAnimate((current) => !current);
          }}
          size="compact"
          color="outline"
        >
          animateShape: {animate ? "on" : "off"}
        </Button>
      </div>
      <HoverBlossom animate={animate} shape={shape} />
    </Section>
  );
};

const GroupExample = () => (
  <Section
    id="group"
    note="Group avatars hold a person-group icon on the soft secondary background. A picture replaces the icon, and a picture that fails to load brings the icon back. The named icon shows its name in a tooltip."
    title="Group avatar"
  >
    <div className="flex flex-wrap items-end gap-4" data-testid="group-row">
      {(["xs", "sm", "md"] as const).map((size) => (
        <Labelled key={size} label={size}>
          <GroupAvatar size={size} />
        </Labelled>
      ))}
      <Labelled label="picture">
        <GroupAvatar avatar={{ url: imageUrl(0, 2) }} size="md" />
      </Labelled>
      <Labelled label="sidebar icon">
        <span data-testid="group-sidebar">
          <GroupAvatarIcon size="sidebar" />
        </span>
      </Labelled>
      <Labelled label="named icon, hover">
        <span data-testid="group-named">
          <GroupAvatarIcon name="Example group" size="large" />
        </span>
      </Labelled>
      <Labelled label="broken picture">
        <GroupAvatar
          avatar={{ url: withBasePath("/gallery/avatar/missing.png") }}
          size="md"
        />
      </Labelled>
    </div>
  </Section>
);

const people: FacepilePerson[] = [
  "Alex Sample",
  "Robin Placeholder",
  "Sam Example",
  "Kit Example",
  "Ada Example",
  "Lee Example",
  "Max Example",
].map((name, index) => ({
  avatar: <Avatar name={name} size="md" />,
  id: `person-${index}`,
  name,
}));

const smallPeople: FacepilePerson[] = people.map((person) => ({
  ...person,
  avatar: <Avatar name={person.name} size="sm" />,
}));

const FacepileExample = () => (
  <Section
    id="facepile"
    note="Avatars overlap and the ones that do not fit are replaced by a count. The count button lists them on hover, focus or click. The last two rows show the sm size and the last-in-front order. Resize the page to see more or fewer avatars."
    title="Facepile"
  >
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-6">
        <Labelled label="two people">
          <span data-testid="facepile-two">
            <Facepile people={people.slice(0, 2)} />
          </span>
        </Labelled>
        <Labelled label="seven people">
          <span data-testid="facepile-seven">
            <Facepile overflowSideOffset={8} people={people} />
          </span>
        </Labelled>
        <Labelled label="sm, seven people">
          <span data-testid="facepile-sm">
            <Facepile people={smallPeople} size="sm" />
          </span>
        </Labelled>
        <Labelled label="last in front">
          <span data-testid="facepile-last">
            <Facepile front="last" people={people.slice(0, 4)} />
          </span>
        </Labelled>
        <Labelled label="not interactive">
          <span data-testid="facepile-static">
            <Facepile interactive={false} people={people} />
          </span>
        </Labelled>
        <Labelled label="placeholder">
          <span data-testid="facepile-placeholder">
            <Facepile people={[]} placeholder={<Avatar name="?" size="md" />} />
          </span>
        </Labelled>
        <Labelled label="narrow box">
          <span className="flex w-24" data-testid="facepile-narrow">
            <Facepile people={people.slice(0, 4)} />
          </span>
        </Labelled>
      </div>
    </TooltipProvider>
  </Section>
);

const AppearanceContent = ({ prefix }: { prefix: string }) => (
  <div
    className="flex flex-wrap items-center gap-3"
    data-testid={`${prefix}-content`}
  >
    <Avatar name="Alex Sample" size="md" />
    <Avatar muted name="Robin Placeholder" size="md" />
    <Avatar name="Sam Example" shape="scalloped" size="md" />
    <GroupAvatar size="md" />
    <TooltipProvider>
      <Facepile people={people} />
    </TooltipProvider>
  </div>
);

const scopeTitle = (scope: Scope) =>
  scope === "dark" ? "Dark theme" : "Light theme";

// A theme scope sets color-scheme, so theme tokens inside resolve at the
// nearest scope at any depth.
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
    <AppearanceContent prefix={id} />
    {nested === undefined ? null : (
      <section
        aria-labelledby={`${id}-nested-heading`}
        className={`${nested} flex min-w-0 flex-col gap-3 rounded-xl border bg-background p-4 text-foreground`}
        data-testid={`${id}-nested`}
      >
        <h4 className="text-sm font-semibold" id={`${id}-nested-heading`}>
          {scopeTitle(nested)}, nested in {scope}
        </h4>
        <AppearanceContent prefix={`${id}-nested`} />
      </section>
    )}
  </section>
);

const RtlExample = () => (
  <Section
    id="rtl"
    note="In a right to left page the facepile reads from the right, and its count sits at the end."
    title="Right to left"
  >
    <div className="flex flex-wrap items-center gap-6" dir="rtl" lang="ar">
      <span data-testid="facepile-rtl">
        <TooltipProvider>
          <Facepile people={people} />
        </TooltipProvider>
      </span>
      <Avatar name="Alex Sample" shape="blossom" size="picker" />
    </div>
  </Section>
);

const readAttribute = () =>
  document.documentElement.dataset.ckReducedMotion ?? "absent";

const subscribeAttribute = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);

  observer.observe(document.documentElement, {
    attributeFilter: ["data-ck-reduced-motion"],
    attributes: true,
  });

  return () => {
    observer.disconnect();
  };
};

const readAttributeOnServer = () => "absent";

const PREFERENCES = ["system", "on", "off"] as const;

const MotionPreferenceControl = ({
  hostMounted,
  onHostMountedChange,
  onPreferenceChange,
  onSettingsReadyChange,
  preference,
  settingsReady,
}: {
  hostMounted: boolean;
  onHostMountedChange: (mounted: boolean) => void;
  onPreferenceChange: (preference: ReducedMotionPreference) => void;
  onSettingsReadyChange: (ready: boolean) => void;
  preference: ReducedMotionPreference;
  settingsReady: boolean;
}) => {
  const reduced = useReducedMotion();

  const attribute = useSyncExternalStore(
    subscribeAttribute,
    readAttribute,
    readAttributeOnServer
  );

  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">Reduced motion</legend>
      <span className="text-sm">Reduced motion preference:</span>
      {PREFERENCES.map((choice) => (
        <Button
          aria-pressed={preference === choice}
          key={choice}
          onClick={() => {
            onPreferenceChange(choice);
          }}
          size="compact"
          color={preference === choice ? "primary" : "outline"}
        >
          {choice === "system" ? "System" : `Reduced ${choice}`}
        </Button>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={settingsReady}
          onChange={(event) => {
            onSettingsReadyChange(event.currentTarget.checked);
          }}
          type="checkbox"
        />
        settings loaded
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          checked={hostMounted}
          onChange={(event) => {
            onHostMountedChange(event.currentTarget.checked);
          }}
          type="checkbox"
        />
        host writes data-ck-reduced-motion
      </label>
      <output className="text-sm" data-testid="motion-readout">
        reduced: {String(reduced)}
      </output>
      <output className="text-sm" data-testid="motion-attribute-readout">
        data-ck-reduced-motion: {attribute}
      </output>
    </fieldset>
  );
};

// The shared reduced motion hook reads the preference from this provider. The
// host component writes data-ck-reduced-motion from it, which the muted fade and
// the image fade read through CSS.
const MotionSettings = ({ children }: { children: ReactNode }) => {
  const [preference, setPreference] =
    useState<ReducedMotionPreference>("system");

  const [settingsReady, setSettingsReady] = useState(true);
  const [hostMounted, setHostMounted] = useState(true);

  return (
    <ReducedMotionProvider
      preference={preference}
      settingsReady={settingsReady}
    >
      {hostMounted ? <ReducedMotionAttribute /> : null}
      <MotionPreferenceControl
        hostMounted={hostMounted}
        onHostMountedChange={setHostMounted}
        onPreferenceChange={setPreference}
        onSettingsReadyChange={setSettingsReady}
        preference={preference}
        settingsReady={settingsReady}
      />
      {children}
    </ReducedMotionProvider>
  );
};

const FacepileFadeExample = () => {
  const [mountKey, setMountKey] = useState(0);
  const [order, setOrder] = useState(() => people.slice(0, 4));
  const [withPlaceholder, setWithPlaceholder] = useState(false);

  return (
    <Section
      id="facepile-fade"
      note="Each avatar fades from 88% to full opacity over 160ms when the facepile appears. Replay mounts it again. Move last to front and Remove first give the first place to another person, whose avatar fades again, and a fade that is running on the avatar that loses the first place continues to full opacity. With a placeholder given there is no first fade. Reduced motion shows the avatars at full opacity at once."
      title="Facepile fade"
    >
      <TooltipProvider>
        <span data-testid="facepile-fade-target" key={mountKey}>
          <Facepile
            people={order}
            placeholder={
              withPlaceholder ? <Avatar name="?" size="md" /> : undefined
            }
          />
        </span>
      </TooltipProvider>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            setMountKey((count) => count + 1);
          }}
          size="compact"
          color="outline"
        >
          Replay facepile
        </Button>
        <Button
          onClick={() => {
            setOrder((current) => [
              current.at(-1) ?? current[0],
              ...current.slice(0, -1),
            ]);
          }}
          size="compact"
          color="outline"
        >
          Move last to front
        </Button>
        <Button
          onClick={() => {
            setOrder((current) => current.slice(1));
          }}
          size="compact"
          color="outline"
        >
          Remove first
        </Button>
        <Button
          onClick={() => {
            setOrder(people.slice(0, 4));
          }}
          size="compact"
          color="outline"
        >
          Restore people
        </Button>
        <Button
          aria-pressed={withPlaceholder}
          onClick={() => {
            setWithPlaceholder((current) => !current);
            setMountKey((count) => count + 1);
          }}
          size="compact"
          color="outline"
        >
          Placeholder given: {withPlaceholder ? "yes" : "no"}
        </Button>
      </div>
    </Section>
  );
};

const AvatarGalleryExample = () => (
  <main className="mx-auto flex max-w-6xl flex-col gap-8 bg-background p-4 text-foreground">
    <header className="flex flex-wrap items-center gap-4">
      <Link className="text-sm underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Avatar</h1>
      <AppearanceControl id="avatar-appearance" />
    </header>
    <AvatarImageWorker>
      <MotionSettings>
        <SizesExample />
        <InitialsExample />
        <ImageExample />
        <MutedExample />
        <ShapesExample />
        <GroupExample />
        <FacepileExample />
        <FacepileFadeExample />
      </MotionSettings>
      <Section
        id="appearance"
        note="Each panel sets its own theme scope. The two lower panels nest the opposite theme inside. Avatar colors are fixed values; the group background and the facepile border follow the nearest scope."
        title="States in light and dark"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <AppearancePanel id="appearance-light" scope="light" />
          <AppearancePanel id="appearance-dark" scope="dark" />
          <AppearancePanel
            id="appearance-dark-light"
            nested="light"
            scope="dark"
          />
          <AppearancePanel
            id="appearance-light-dark"
            nested="dark"
            scope="light"
          />
        </div>
      </Section>
      <RtlExample />
    </AvatarImageWorker>
  </main>
);

export { AvatarGalleryExample };
