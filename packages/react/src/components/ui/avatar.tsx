"use client";

// Lucide artwork is covered by components/icon/lucide.license.

/* oxlint-disable anti-slop/no-shape-in-symbol-names -- The public names are shape, animateShape and AvatarShape. */

import {
  useAccountProfile,
  useAuth,
  useProfileVisibility,
  useSpacePersonAvatar,
} from "@workspace/react/components/avatar/account";
import { AvatarShape } from "@workspace/react/components/avatar/avatar-shape";
import type { AvatarShapeName } from "@workspace/react/components/avatar/avatar-shape";
import { useProfileImage } from "@workspace/react/components/avatar/profile-image";
import { createIcon } from "@workspace/react/components/icon";
import { TooltipHint } from "@workspace/react/components/ui/tooltip";
import { cn } from "@workspace/react/lib/utils";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import styles from "./avatar.module.css";

export type AvatarSize =
  | "action"
  | "badge"
  | "fill"
  | "group"
  | "inline"
  | "lg"
  | "md"
  | "picker"
  | "preview"
  | "profile"
  | "response"
  | "row"
  | "sm"
  | "xl"
  | "xs";

export type AvatarShapeOption = AvatarShapeName | "none";

// Size maps.
// Sizes are Tailwind utilities on a 0.25rem spacing. xs is the
// `icon-sm` utility, which is 18px.
const sizeClasses: Record<AvatarSize, string> = {
  action: "size-9",
  badge: "size-3",
  fill: "size-full",
  group: "size-7",
  inline: "size-4",
  lg: "size-20",
  md: "size-8",
  picker: "size-12",
  preview: "size-48",
  profile: "size-28",
  response: "size-5",
  row: "size-10",
  sm: "size-6",
  xl: "size-32",
  xs: "size-[18px]",
};

// text-5xl in the component is 3rem with a 3rem line height and heading-3xl
// tracking (-.025em), so it is spelled out rather than using the default.
const fontClasses: Record<AvatarSize, string> = {
  action: "text-sm",
  badge: "text-[6px] leading-none",
  fill: "text-[3rem] leading-[3rem] tracking-tight",
  group: "text-xs",
  inline: "text-[6px] leading-none",
  lg: "text-[28px]",
  md: "text-sm",
  picker: "text-lg",
  preview: "text-[3rem] leading-[3rem] tracking-tight",
  profile: "text-[40px]",
  response: "text-[10px] leading-none",
  row: "text-sm",
  sm: "text-xs",
  xl: "text-[40px]",
  xs: "text-[10px] leading-none",
};

const colorNames = ["purple", "blue", "green", "orange", "red"] as const;

type AvatarColorName = (typeof colorNames)[number];

const colorClasses: Record<AvatarColorName, string> = {
  blue: "bg-(--color-status-info-solid)",
  green: "bg-(--color-status-success-solid)",
  orange: "bg-(--color-status-warning-solid)",
  purple: "bg-(--color-status-discovery-solid)",
  red: "bg-(--color-status-danger-solid)",
};

const grayClass = "bg-(--color-neutral-strong-surface)";
const HASH_MULTIPLIER = 33;
const WHITESPACE = /\s+/u;

const trimmedOrNull = (value: string | null | undefined) => {
  const trimmed = value?.trim();

  return trimmed === undefined || trimmed.length === 0 ? null : trimmed;
};

/**
 * First letters of the first and last word of a name, uppercased. "?" when
 * the name has no words.
 */
export const getAvatarInitials = (name: string | null | undefined) => {
  const words = trimmedOrNull(name)?.split(WHITESPACE) ?? [];
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words.at(-1)?.charAt(0) ?? "") : "";
  const initials = `${first}${last}`.toUpperCase();

  return initials.length > 0 ? initials : "?";
};

/** Hash the first word of the trimmed key into the avatar palette. */
export const getAvatarColorName = (
  key: string,
  offset = 0
): AvatarColorName => {
  let hash = 0;

  for (const character of key.trim().split(WHITESPACE, 1)[0]) {
    hash =
      (hash * HASH_MULTIPLIER + (character.codePointAt(0) ?? 0)) %
      colorNames.length;
  }

  return colorNames[(hash + offset) % colorNames.length];
};

/** Content the avatar can return as is; promises are not accepted. */
export type AvatarContent = Exclude<ReactNode, PromiseLike<unknown>>;

export interface AvatarProps {
  /** Makes the avatar `role="img"` with this label. Without it the avatar is decorative. */
  alt?: string;
  /** Redraws the outline as a morph and leaves rounding to the clip. */
  animateShape?: boolean;
  /** Hashed for the background color. Falls back to the trimmed name. */
  colorKey?: string;
  /** Fades the image in once it has loaded. */
  fadeIn?: boolean;
  /** Replaces the initials entirely. */
  fallback?: AvatarContent;
  /** Replaces the initials text, and the SVG that the badge and inline sizes draw it in. */
  fallbackIcon?: AvatarContent;
  hovered?: boolean;
  /** Shown instead of the image while it loads; the image stays hidden. */
  loadingFallback?: AvatarContent;
  /** `true` dims the avatar to 40%. Any non-nullish value, `false` too, adds the filter transition. */
  muted?: boolean | null;
  name?: string | null;
  onImageError?: () => void;
  overlay?: ReactNode;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  shape?: AvatarShapeOption;
  size?: AvatarSize;
  src?: string | null;
}

type ImageState = "error" | "loaded" | "loading";

// Presence classes: muted is filter opacity(40%).
// The presence transition covers the filter over --motion-duration-fast.
// The component switches it off only when :root has data-ck-reduced-motion="true".
const mutedClass = "[filter:opacity(40%)]";

const presenceClass =
  "transition-[filter] duration-(--motion-duration-fast) [:root[data-ck-reduced-motion=true]_&]:transition-none";

const isPresent = (value: AvatarContent) =>
  value !== undefined && value !== null;

const mutedClasses = (muted: boolean | null | undefined) =>
  cn(
    muted !== null && muted !== undefined && presenceClass,
    muted === true && mutedClass
  );

const colorClassFor = (
  colorKey: string | undefined,
  name: string | null | undefined
) => {
  const source =
    colorKey !== undefined && colorKey !== "" ? colorKey : trimmedOrNull(name);

  return source === null ? grayClass : colorClasses[getAvatarColorName(source)];
};

const initialsContent = (
  size: AvatarSize,
  text: string,
  icon: AvatarContent
): AvatarContent => {
  if (isPresent(icon)) {
    return icon;
  }

  if (size !== "badge" && size !== "inline") {
    return text;
  }

  return (
    <svg aria-hidden="true" className="size-full" viewBox="0 0 12 12">
      <text
        dominantBaseline="central"
        fill="currentColor"
        textAnchor="middle"
        x="6"
        y="6"
      >
        {text}
      </text>
    </svg>
  );
};

const AvatarFallback = ({
  alt,
  animateShape = false,
  colorKey,
  fallback,
  fallbackIcon,
  muted,
  name,
  shape = "circle",
  size = "sm",
}: AvatarProps) => {
  if (isPresent(fallback)) {
    return fallback;
  }

  const initials = getAvatarInitials(name);
  const tiny = size === "badge" || size === "inline" || size === "xs";

  const text = tiny
    ? String.fromCodePoint(initials.codePointAt(0) ?? 0)
    : initials;

  const labelled = alt !== undefined && alt !== "";

  return (
    <span
      aria-hidden={labelled ? undefined : true}
      aria-label={labelled ? alt : undefined}
      className={cn(
        "flex shrink-0 items-center justify-center font-normal text-(--color-avatar-on-surface) select-none",
        mutedClasses(muted),
        !animateShape && shape === "circle" && "rounded-full",
        colorClassFor(colorKey, name),
        sizeClasses[size],
        fontClasses[size]
      )}
      role={labelled ? "img" : undefined}
    >
      {initialsContent(size, text, fallbackIcon)}
    </span>
  );
};

const AvatarImage = (props: AvatarProps & { src: string }) => {
  const {
    alt,
    animateShape,
    fadeIn,
    loadingFallback,
    muted,
    onImageError,
    referrerPolicy,
    shape,
    size = "sm",
    src,
  } = props;

  const [state, setState] = useState<ImageState>("loading");
  const tracksLoad = (loadingFallback ?? null) !== null || fadeIn === true;
  const waiting = loadingFallback !== undefined && loadingFallback !== null;

  // The component reads `complete` when the element mounts, so a cached image
  // settles without waiting for a load event. A server rendered image can
  // also fail before React attaches onError; the component renders on the client
  // only, where the handler is always there first, so a failure that is
  // already complete reports the same error here.
  const trackImage = useCallback(
    (image: HTMLImageElement | null) => {
      if (image?.complete !== true) {
        return;
      }

      if (tracksLoad) {
        setState(image.naturalWidth > 0 ? "loaded" : "error");
      } else if (image.naturalWidth === 0) {
        setState("error");
        onImageError?.();
      }
    },
    [tracksLoad, onImageError]
  );

  if (state === "error") {
    return <AvatarFallback {...props} />;
  }

  const showLoadingFallback = state === "loading" && waiting;

  return (
    <>
      {/* oxlint-disable-next-line nextjs/no-img-element -- Avatar URLs are arbitrary remote images. */}
      <img
        alt={alt}
        className={cn(
          "shrink-0 object-cover",
          mutedClasses(muted),
          fadeIn === true && (state === "loaded" ? styles.loaded : "opacity-0"),
          animateShape !== true &&
            (shape === undefined || shape === "circle") &&
            "rounded-full",
          sizeClasses[size]
        )}
        draggable={false}
        hidden={showLoadingFallback}
        onError={() => {
          setState("error");
          onImageError?.();
        }}
        onLoad={
          tracksLoad
            ? () => {
                setState("loaded");
              }
            : undefined
        }
        ref={trackImage}
        referrerPolicy={referrerPolicy}
        src={src}
      />
      {state === "loading" ? loadingFallback : null}
    </>
  );
};

/**
 * Round (or clipped) avatar showing an image, or initials when there is no
 * image or it fails to load.
 */
export const Avatar = (props: AvatarProps) => {
  const { animateShape, hovered, overlay, shape, size = "sm", src } = props;

  const content =
    src === undefined || src === null ? (
      <AvatarFallback {...props} />
    ) : (
      <AvatarImage {...props} key={src} src={src} />
    );

  if (shape === "none") {
    if (overlay === undefined || overlay === null) {
      return content;
    }

    return (
      <span className={cn("relative inline-flex shrink-0", sizeClasses[size])}>
        {content}
        {overlay}
      </span>
    );
  }

  if (
    (shape === undefined || shape === "circle") &&
    (overlay === undefined || overlay === null) &&
    animateShape !== true
  ) {
    return content;
  }

  return (
    <AvatarShape
      animateShape={animateShape}
      hovered={hovered}
      shape={shape ?? "circle"}
    >
      {content}
      {overlay}
    </AvatarShape>
  );
};

export interface ProfileAvatarProps {
  avatarUrl?: string | null;
  colorKey?: string;
  fadeIn?: boolean;
  /** Keeps the loading fallback up while the profile is still loading. */
  loading?: boolean;
  loadingFallback?: AvatarContent;
  muted?: boolean | null;
  name?: string | null;
  size?: AvatarSize;
}

/**
 * Avatar for a person: the picture when profile pictures are visible
 * (useProfileVisibility, which needs AccountServicesProvider), otherwise
 * initials. The picture goes through useProfileImage.
 */
export const ProfileAvatar = ({
  avatarUrl,
  colorKey,
  fadeIn,
  loading,
  loadingFallback,
  muted,
  name,
  size = "md",
}: ProfileAvatarProps) => {
  const { isProfileVisible } = useProfileVisibility();
  const { isError, src } = useProfileImage(isProfileVisible ? avatarUrl : null);

  const pending =
    isProfileVisible &&
    (Boolean(loading) ||
      (avatarUrl !== null &&
        avatarUrl !== undefined &&
        (src === null || src === undefined) &&
        !isError));

  return (
    <Avatar
      alt=""
      colorKey={colorKey}
      fadeIn={fadeIn}
      fallback={pending ? loadingFallback : undefined}
      loadingFallback={loadingFallback}
      muted={muted}
      name={name}
      size={size}
      src={src}
    />
  );
};

export interface AccountAvatarProps {
  /** Account user id of the person. Its part before "__" is matched with the signed-in user. */
  accountUserId?: string;
  avatarUrl?: string | null;
  fadeIn?: boolean;
  loading?: boolean;
  loadingFallback?: AvatarContent;
  muted?: boolean | null;
  name?: string | null;
  /** Whether the person lookup runs. Defaults to true. */
  profileQueryEnabled?: boolean;
  size?: AvatarSize;
}

const AUTH0_AVATAR_PREFIX = "https://cdn.auth0.com/avatars/";

/** The part before "__" matches the signed-in user's. */
const isSameUser = (userId: string | null, accountUserId: string | undefined) =>
  userId !== null && accountUserId?.split("__")[0] === userId.split("__")[0];

/** The account picture, unless auth0 generated it. */
const accountPictureOf = (
  signedIn: boolean,
  imageUrl: string | null | undefined
) => {
  if (!signedIn || (imageUrl ?? "").startsWith(AUTH0_AVATAR_PREFIX)) {
    return null;
  }

  return imageUrl;
};

/**
 * Avatar for a person of the signed-in account. For the signed-in user the
 * account profile picture is used (not an auth0 generated one), then the
 * given avatarUrl, then the picture of the person lookup. It needs
 * AccountServicesProvider.
 */
export const AccountAvatar = ({
  accountUserId,
  avatarUrl,
  fadeIn,
  loading,
  loadingFallback,
  muted,
  name,
  profileQueryEnabled = true,
  size = "sm",
}: AccountAvatarProps) => {
  const { accountId, userId } = useAuth();

  const isSignedInUser = isSameUser(userId, accountUserId);

  const { data: profile, isLoading: profileLoading } = useAccountProfile({
    accountId,
    enabled: isSignedInUser && accountId !== null,
    userId,
  });

  const profileImageUrl = profile?.imageUrl;

  const accountImageUrl = accountPictureOf(isSignedInUser, profileImageUrl);

  const lookupKey =
    (accountImageUrl ?? null) === null && (avatarUrl ?? null) === null
      ? (accountUserId ?? null)
      : null;

  const lookedUp = useSpacePersonAvatar(lookupKey, profileQueryEnabled);

  return (
    <ProfileAvatar
      avatarUrl={accountImageUrl ?? avatarUrl ?? lookedUp}
      colorKey={accountUserId}
      fadeIn={fadeIn}
      loading={
        Boolean(loading) ||
        (isSignedInUser && profileLoading && (avatarUrl ?? null) === null)
      }
      loadingFallback={loadingFallback}
      muted={muted}
      name={name}
      size={size}
    />
  );
};

const PersonGroupSmallIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M16 3.128a4 4 0 0 1 0 7.744"></path><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><circle cx="9" cy="7" r="4"></circle></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "person-group-16",
});

const PersonGroupLargeIcon = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M16 3.128a4 4 0 0 1 0 7.744"></path><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><circle cx="9" cy="7" r="4"></circle></g>',
  canvas: { height: 32, viewBox: "0 0 24 24", width: 32 },
  name: "person-group-32",
});

export interface GroupAvatarImage {
  url?: string | null;
}

export interface GroupAvatarIconProps {
  avatar?: GroupAvatarImage | null;
  name?: string;
  size?: "large" | "sidebar" | "small";
}

// Group icon sizes: icon-sm (18px), size-12, and icon-leading, which is
// var(--icon-start-size, 16px).
const groupIconSizes = {
  large: "size-12",
  sidebar: "size-[var(--icon-start-size,16px)]",
  small: "size-[18px]",
} as const;

/**
 * The picture or person-group icon inside a group avatar. A picture that
 * fails to load is remembered by URL and the icon shows instead.
 */
export const GroupAvatarIcon = ({
  avatar,
  name,
  size = "small",
}: GroupAvatarIconProps) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = avatar?.url ?? undefined;
  const sizeClass = groupIconSizes[size];
  const Icon = size === "large" ? PersonGroupLargeIcon : PersonGroupSmallIcon;

  const icon = (
    <span
      aria-label={name}
      className={cn("flex shrink-0 items-center justify-center", sizeClass)}
      role={name === undefined ? undefined : "img"}
    >
      {url === undefined || url === failedUrl ? (
        <Icon
          className={cn(
            "text-text-muted",
            size === "sidebar" && "size-[var(--icon-start-size,16px)]"
          )}
        />
      ) : (
        // oxlint-disable-next-line nextjs/no-img-element -- Group pictures are arbitrary remote images.
        <img
          alt=""
          className={cn("object-contain", sizeClass)}
          draggable={false}
          onError={() => {
            setFailedUrl(url);
          }}
          ref={(image) => {
            // A server rendered picture can fail before onError is attached.
            if (image?.complete === true && image.naturalWidth === 0) {
              setFailedUrl(url);
            }
          }}
          src={url}
        />
      )}
    </span>
  );

  return name === undefined ? (
    icon
  ) : (
    <TooltipHint content={name}>{icon}</TooltipHint>
  );
};

const groupAvatarSizes = {
  md: "size-7",
  sm: "size-6",
  xs: "size-[18px]",
} as const;

export interface GroupAvatarProps {
  avatar?: GroupAvatarImage | null;
  size?: keyof typeof groupAvatarSizes;
}

/**
 * Circle on the soft secondary background holding the group picture or icon.
 */
export const GroupAvatar = ({ avatar, size = "md" }: GroupAvatarProps) => (
  <span
    className={cn(
      "flex shrink-0 items-center justify-center rounded-full bg-fill-secondary-soft",
      groupAvatarSizes[size]
    )}
  >
    <GroupAvatarIcon avatar={avatar} size="small" />
  </span>
);
