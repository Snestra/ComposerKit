"use client";

import { AccountServicesProvider } from "@workspace/react/components/avatar/account";
/* oxlint-disable anti-slop/no-shape-in-symbol-names -- The public names are shape, animateShape and AvatarShape. */
import type {
  AccountServices,
  ProfileUsage,
  WorkspaceSettings,
} from "@workspace/react/components/avatar/account";
import { Facepile } from "@workspace/react/components/avatar/facepile";
import type { FacepilePerson } from "@workspace/react/components/avatar/facepile";
import {
  clearProfileImageCache,
  ProfileImageProvider,
} from "@workspace/react/components/avatar/profile-image";
import type {
  AssetResolution,
  ProfileImageResolver,
} from "@workspace/react/components/avatar/profile-image";
import {
  AccountAvatar,
  Avatar,
  GroupAvatar,
  GroupAvatarIcon,
} from "@workspace/react/components/ui/avatar";
import type {
  AvatarShapeOption,
  AvatarSize,
} from "@workspace/react/components/ui/avatar";
import { Button } from "@workspace/react/components/ui/button";
import { TooltipProvider } from "@workspace/react/components/ui/tooltip";
import {
  ATTACHMENT_CONTENT_URL,
  HOST_AUTH_HEADER,
} from "@workspace/react/lib/host";
import {
  ReducedMotionAttribute,
  ReducedMotionProvider,
  useReducedMotion,
} from "@workspace/react/lib/reduced-motion";
import type { ReducedMotionPreference } from "@workspace/react/lib/reduced-motion";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { AppearanceControl } from "@/components/appearance-control";

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
  `/gallery/avatar/image?delay=${delay}&tone=${tone}&n=${nonce}&format=${format}`;

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
              src="/gallery/avatar/missing.png"
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
          avatar={{ url: "/gallery/avatar/missing.png" }}
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

const ESTUARY = ATTACHMENT_CONTENT_URL;

// Local asset resolver for the profile pictures. The id in the picture
// address picks the answer: a slow or quick download served by the local
// image route, a failure, or a deleted file. Everything else of the
// profile picture source (the address classification, the request, the data
// URL, the cache) runs unchanged.
const resolveCounts = new Map<string, number>();

// Whether the example asset service answers the "outage" picture.
const backend = { up: false };
const countListeners = new Set<() => void>();

const subscribeCounts = (onChange: () => void) => {
  countListeners.add(onChange);

  return () => {
    countListeners.delete(onChange);
  };
};

const countResolves = (address: string) => {
  resolveCounts.set(address, (resolveCounts.get(address) ?? 0) + 1);

  for (const listener of countListeners) {
    listener();
  }
};

const localResolver: ProfileImageResolver = {
  cacheKey: ["profile-picture"],
  // oxlint-disable-next-line require-await -- The resolver interface is asynchronous.
  resolveAsset: async (address): Promise<AssetResolution> => {
    countResolves(address);

    const query = new URL(address).searchParams;
    const id = query.get("id");

    if (id === "error") {
      throw new Error("The asset lookup returned no result");
    }

    if (id === "outage" && !backend.up) {
      throw new Error("The asset service is offline");
    }

    if (id === "trashed") {
      return { kind: "trashed" };
    }

    if (id === "http503") {
      return {
        downloadUrl: "/gallery/avatar/image?status=503",
        kind: "available",
        requestHeaders: { [HOST_AUTH_HEADER]: "1" },
      };
    }

    return {
      downloadUrl: imageUrl(
        Number(query.get("delay")) || 0,
        Number(query.get("tone")) || 0,
        0,
        id === "png" ? "png" : "svg"
      ),
      kind: "available",
      requestHeaders: { [HOST_AUTH_HEADER]: "1" },
    };
  },
};

const estuaryUrl = (id: string, delay: number, tone: number) =>
  `${ESTUARY}?id=${id}&delay=${delay}&tone=${tone}`;

const loadingChip = (
  <span className="flex size-12 items-center justify-center rounded-full bg-fill-secondary-soft text-xs">
    Loading
  </span>
);

type Plan = "business" | "plus" | "unknown";

type Members = "disabled" | "enabled" | "loading";

type Picture = "auth0" | "direct" | "estuary" | "none";

interface Scenario {
  accountLoading: boolean;
  authMethod: "account" | "none";
  members: Members;
  picture: Picture;
  plan: Plan;
  profileLoading: boolean;
}

const initialScenario: Scenario = {
  accountLoading: false,
  authMethod: "account",
  members: "enabled",
  picture: "estuary",
  plan: "business",
  profileLoading: false,
};

const SIGNED_IN_USER = "user-1__acct-1";

const pictureFor = (picture: Picture) => {
  switch (picture) {
    case "auth0": {
      return "https://cdn.auth0.com/avatars/ax.png";
    }

    case "direct": {
      return imageUrl(0, 2);
    }

    case "estuary": {
      return estuaryUrl("signed-in", 300, 1);
    }

    case "none": {
      return null;
    }

    default: {
      return null;
    }
  }
};

// The pictures the example person lookup knows, by account user id.
const PEOPLE_PICTURES = new Map([
  ["user-3__acct-1", imageUrl(0, 4)],
  ["user-4__acct-1", imageUrl(0, 3)],
]);

// The answers the example services have given, by query key, like the data
// of a query cache. A disabled read answers what is cached for its key and
// fetches nothing.
interface ServiceCache {
  person: Map<string, string>;
  profile: Map<string, ProfileUsage>;
  settings: Map<string, WorkspaceSettings>;
}

const createServiceCache = (): ServiceCache => ({
  person: new Map(),
  profile: new Map(),
  settings: new Map(),
});

interface CachedRead<Data> {
  data: Data | null;
  isLoading: boolean;
}

const readCached = <Data,>(
  cache: Map<string, Data>,
  key: readonly (string | null)[],
  enabled: boolean,
  read: () => CachedRead<Data>
): CachedRead<Data> => {
  const cacheKey = JSON.stringify(key);

  if (!enabled) {
    return {
      data: cache.get(cacheKey) ?? null,
      isLoading: false,
    };
  }

  const answer = read();

  if (answer.data !== null) {
    cache.set(cacheKey, answer.data);
  }

  return answer;
};

// Local account data standing in for the application's account, workspace
// settings and person lookups.
const servicesFor = (
  scenario: Scenario,
  cache: ServiceCache
): AccountServices => ({
  accountCheck: {
    data: {
      account_ordering: ["acct-1"],
      accounts: [
        {
          id: "acct-1",
          plan_type: scenario.plan === "unknown" ? null : scenario.plan,
        },
      ],
    },
    isError: false,
    isLoading: scenario.accountLoading,
  },
  auth: {
    accountId: "acct-1",
    authMethod: scenario.authMethod === "account" ? "account" : null,
    isLoading: false,
    planAtLogin: null,
    userId: SIGNED_IN_USER,
  },
  readProfileUsage: ({ enabled, queryKey }) =>
    readCached(cache.profile, queryKey, enabled, () =>
      scenario.profileLoading
        ? { data: null, isLoading: true }
        : {
            data: { imageUrl: pictureFor(scenario.picture) },
            isLoading: false,
          }
    ),
  readSpacePersonAvatar: (accountUserId, enabled) =>
    readCached(cache.person, ["person", accountUserId], enabled, () => ({
      data: PEOPLE_PICTURES.get(accountUserId) ?? null,
      isLoading: false,
    })).data,
  readWorkspaceSettings: (accountId, enabled) =>
    readCached(cache.settings, ["workspace-settings", accountId], enabled, () =>
      scenario.members === "loading"
        ? { data: null, isLoading: true }
        : {
            data: {
              member_profiles_enabled: scenario.members === "enabled",
            },
            isLoading: false,
          }
    ),
});

const Choice = <Value extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: Value) => void;
  options: readonly Value[];
  value: Value;
}) => (
  <fieldset className="flex flex-wrap items-center gap-2">
    <legend className="sr-only">{label}</legend>
    <span className="text-sm">{label}:</span>
    {options.map((option) => (
      <Button
        aria-pressed={value === option}
        key={option}
        onClick={() => {
          onChange(option);
        }}
        size="compact"
        color={value === option ? "primary" : "outline"}
      >
        {option}
      </Button>
    ))}
  </fieldset>
);

const ProfileExample = () => {
  const [scenario, setScenario] = useState(initialScenario);
  const [nonce, setNonce] = useState(0);
  const [reuse, setReuse] = useState(false);
  const serviceCache = useMemo(() => createServiceCache(), []);
  const [lookupOn, setLookupOn] = useState(true);
  const [pngShown, setPngShown] = useState(true);
  const [outageNonce, setOutageNonce] = useState(0);

  const services = useMemo(
    () => servicesFor(scenario, serviceCache),
    [scenario, serviceCache]
  );

  const slowUrl = estuaryUrl(`slow-${nonce}`, 2500, 3);

  const downloads = useSyncExternalStore(
    subscribeCounts,
    () => resolveCounts.get(slowUrl) ?? 0,
    () => 0
  );

  const outageUrl = estuaryUrl("outage", 0, 2);

  const outageAttempts = useSyncExternalStore(
    subscribeCounts,
    () => resolveCounts.get(outageUrl) ?? 0,
    () => 0
  );

  const update = (patch: Partial<Scenario>) => {
    setScenario((current) => ({ ...current, ...patch }));
  };

  return (
    <Section
      id="profile"
      note="Profile pictures follow the account. They show for a account sign-in with a known plan, and on a workspace plan only while the workspace allows member profiles. An address under the host content endpoint is fetched with the session headers and shown as a data URL, kept in a cache for four minutes. Other addresses are used as they are. The account here is local example data."
      title="Profile and account avatars"
    >
      <AccountServicesProvider services={services}>
        <ProfileImageProvider resolver={localResolver}>
          <div className="flex flex-col gap-2">
            <Choice
              label="Sign-in"
              onChange={(authMethod) => {
                update({ authMethod });
              }}
              options={["account", "none"] as const}
              value={scenario.authMethod}
            />
            <Choice
              label="Plan"
              onChange={(plan: Plan) => {
                update({ plan });
              }}
              options={["plus", "business", "unknown"] as const}
              value={scenario.plan}
            />
            <Choice
              label="Member profiles"
              onChange={(members: Members) => {
                update({ members });
              }}
              options={["enabled", "disabled", "loading"] as const}
              value={scenario.members}
            />
            <Choice
              label="Signed-in user picture"
              onChange={(picture: Picture) => {
                update({ picture });
              }}
              options={["estuary", "direct", "auth0", "none"] as const}
              value={scenario.picture}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={scenario.accountLoading}
                onChange={(event) => {
                  update({ accountLoading: event.currentTarget.checked });
                }}
                type="checkbox"
              />
              account check loading
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={scenario.profileLoading}
                onChange={(event) => {
                  update({ profileLoading: event.currentTarget.checked });
                }}
                type="checkbox"
              />
              profile query loading
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <Labelled label="estuary, slow">
              <span data-testid="profile-estuary" key={nonce}>
                <AccountAvatar
                  accountUserId="user-2__acct-1"
                  avatarUrl={slowUrl}
                  loadingFallback={loadingChip}
                  name="Robin Placeholder"
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label="estuary, same address">
              {reuse ? (
                <span data-testid="profile-estuary-reuse">
                  <AccountAvatar
                    accountUserId="user-2__acct-1"
                    avatarUrl={slowUrl}
                    loadingFallback={loadingChip}
                    name="Robin Placeholder"
                    size="picker"
                  />
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  not mounted
                </span>
              )}
            </Labelled>
            <Labelled label="estuary, fails">
              <span data-testid="profile-estuary-error">
                <AccountAvatar
                  accountUserId="user-2__acct-1"
                  avatarUrl={estuaryUrl("error", 0, 0)}
                  loadingFallback={loadingChip}
                  name="Kit Example"
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label="estuary, HTTP 503">
              <span data-testid="profile-estuary-http503">
                <AccountAvatar
                  accountUserId="user-2__acct-1"
                  avatarUrl={estuaryUrl("http503", 0, 3)}
                  loadingFallback={loadingChip}
                  name="Sam Example"
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label="estuary, PNG">
              {pngShown ? (
                <span data-testid="profile-estuary-png">
                  <AccountAvatar
                    accountUserId="user-2__acct-1"
                    avatarUrl={estuaryUrl("png", 0, 1)}
                    loadingFallback={loadingChip}
                    name="Robin Placeholder"
                    size="picker"
                  />
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  not mounted
                </span>
              )}
            </Labelled>
            <Labelled label="estuary, service down">
              <span data-testid="profile-estuary-outage" key={outageNonce}>
                <AccountAvatar
                  accountUserId="user-2__acct-1"
                  avatarUrl={outageUrl}
                  loadingFallback={loadingChip}
                  name="Kit Example"
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label="estuary, deleted">
              <span data-testid="profile-estuary-trashed">
                <AccountAvatar
                  accountUserId="user-2__acct-1"
                  avatarUrl={estuaryUrl("trashed", 0, 0)}
                  loadingFallback={loadingChip}
                  name="Ada Example"
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label="direct address">
              <span data-testid="profile-direct">
                <AccountAvatar
                  accountUserId="user-2__acct-1"
                  avatarUrl={imageUrl(0, 2)}
                  name="Sam Example"
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label="signed-in user">
              <span data-testid="account-signed-in">
                <AccountAvatar
                  accountUserId="user-1__other-suffix"
                  loadingFallback={loadingChip}
                  name="Alex Sample"
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label="signed-in, explicit address">
              <span data-testid="account-signed-in-explicit">
                <AccountAvatar
                  accountUserId="user-1__other-suffix"
                  avatarUrl={imageUrl(0, 4)}
                  loadingFallback={loadingChip}
                  name="Alex Sample"
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label="person lookup">
              <span data-testid="account-lookup">
                <AccountAvatar
                  accountUserId="user-3__acct-1"
                  name="Lee Example"
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label={lookupOn ? "lookup on" : "lookup turned off"}>
              <span data-testid="account-lookup-toggle">
                <AccountAvatar
                  accountUserId="user-3__acct-1"
                  name="Lee Example"
                  profileQueryEnabled={lookupOn}
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label="lookup off, nothing cached">
              <span data-testid="account-lookup-off">
                <AccountAvatar
                  accountUserId="user-4__acct-1"
                  name="Lee Example"
                  profileQueryEnabled={false}
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label="no match, no address">
              <span data-testid="account-no-match">
                <AccountAvatar
                  accountUserId="user-9__acct-1"
                  name="Max Example"
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label="loading prop">
              <span data-testid="account-loading">
                <AccountAvatar
                  accountUserId="user-9__acct-1"
                  loading
                  loadingFallback={loadingChip}
                  name="Max Example"
                  size="picker"
                />
              </span>
            </Labelled>
            <Labelled label="default size">
              <span data-testid="account-default-size">
                <AccountAvatar
                  accountUserId="user-9__acct-1"
                  name="Max Example"
                />
              </span>
            </Labelled>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setReuse(true);
              }}
              size="compact"
              color="outline"
            >
              Mount a second avatar with the same address
            </Button>
            <Button
              aria-pressed={lookupOn}
              onClick={() => {
                setLookupOn((on) => !on);
              }}
              size="compact"
              color="outline"
            >
              {lookupOn ? "Turn the lookup off" : "Turn the lookup on"}
            </Button>
            <label className="flex items-center gap-2 text-sm">
              <input
                defaultChecked={backend.up}
                onChange={(event) => {
                  backend.up = event.currentTarget.checked;
                }}
                type="checkbox"
              />
              asset service up
            </label>
            <Button
              aria-pressed={pngShown}
              onClick={() => {
                setPngShown((shown) => !shown);
              }}
              size="compact"
              color="outline"
            >
              {pngShown ? "Unmount the PNG avatar" : "Mount the PNG avatar"}
            </Button>
            <output className="text-sm" data-testid="profile-outage-attempts">
              attempts for the service down address: {outageAttempts}
            </output>
            <Button
              onClick={() => {
                setOutageNonce((count) => count + 1);
              }}
              size="compact"
              color="outline"
            >
              Remount the service down avatar
            </Button>
            <Button
              onClick={() => {
                clearProfileImageCache();
                setReuse(false);
                setNonce((count) => count + 1);
              }}
              size="compact"
              color="outline"
            >
              Clear cache and reload
            </Button>
            <output className="text-sm" data-testid="profile-fetch-count">
              downloads of the slow address: {downloads}
            </output>
          </div>
        </ProfileImageProvider>
      </AccountServicesProvider>
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
    <MotionSettings>
      <SizesExample />
      <InitialsExample />
      <ImageExample />
      <ProfileExample />
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
  </main>
);

export { AvatarGalleryExample };
