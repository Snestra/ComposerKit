"use client";

/* oxlint-disable anti-slop/no-runtime-typeof -- ButtonLink accepts a destination as a string or as path parts and the platform link component as "a" or a component. */

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { useLinkComponent } from "composerkit/components/platform-provider";
import type { PlatformLinkComponent } from "composerkit/components/platform-provider";
import { cn } from "composerkit/lib/utils";
import { usePathname } from "next/navigation";
import { createElement } from "react";
import type {
  ComponentProps,
  ComponentType,
  ReactElement,
  ReactNode,
  Ref,
} from "react";

import { Spinner } from "./progress";

// One spinner implementation: the progress family owns the Spinner.
export { Spinner } from "./progress";

export type { SpinnerProps } from "./progress";

const isPresent = <T,>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

const SURFACE_TINT =
  "[&:not(:disabled):not([aria-disabled=true]):hover,&[data-state=open],&[data-popup-open]]:bg-[image:linear-gradient(var(--color-fill-primary-transparent-hover),var(--color-fill-primary-transparent-hover))]";

// Class maps of ButtonBase: color, size, radius and radius override.
// Utilities are written with this library's tokens
// (ui/app/globals.css), with the Electron theme values as defaults:
// `electron:` classes are always on, `browser:` classes are dropped, and
// `data-[state=open]` also matches Base UI's `data-popup-open`.
const colorClasses = {
  limited:
    "relative border-transparent text-text-subtle not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover",
  activity:
    "border-transparent bg-[color-mix(in_oklab,var(--ck-palette-ink)_12%,transparent)] text-[color:var(--ck-palette-ink)] not-disabled:not-aria-disabled:hover:bg-[var(--color-neutral-strong-surface)] not-disabled:not-aria-disabled:hover:text-(--color-text-on-status) not-disabled:not-aria-disabled:data-[native-hovered=true]:bg-[var(--color-neutral-strong-surface)] not-disabled:not-aria-disabled:data-[native-hovered=true]:text-(--color-text-on-status) aria-pressed:bg-[var(--color-neutral-strong-surface)] aria-pressed:text-(--color-text-on-status)",
  activityStop:
    "border-transparent bg-[color-mix(in_oklab,var(--ck-palette-ink)_12%,transparent)] text-[color:var(--ck-palette-ink)] not-disabled:not-aria-disabled:hover:bg-[light-dark(var(--color-light-app-text-foreground-secondary),var(--color-dark-app-text-foreground-secondary))] not-disabled:not-aria-disabled:hover:text-(--color-text-on-status) not-disabled:not-aria-disabled:data-[native-hovered=true]:bg-[light-dark(var(--color-light-app-text-foreground-secondary),var(--color-dark-app-text-foreground-secondary))] not-disabled:not-aria-disabled:data-[native-hovered=true]:text-(--color-text-on-status)",
  activitySuccess:
    "border-transparent bg-[var(--color-status-success-surface)] text-[color:var(--color-status-success)] not-disabled:not-aria-disabled:hover:bg-[var(--color-status-success-solid)] not-disabled:not-aria-disabled:hover:text-white not-disabled:not-aria-disabled:data-[native-hovered=true]:bg-[var(--color-status-success-solid)] not-disabled:not-aria-disabled:data-[native-hovered=true]:text-white",
  accent:
    "bg-fill-info-solid not-disabled:not-aria-disabled:hover:bg-fill-info-solid/90 [&[data-state=open],&[data-popup-open]]:bg-fill-info-solid/90 text-text-on-accent border-transparent",
  accentAction:
    "bg-fill-info-solid not-disabled:not-aria-disabled:hover:bg-fill-info-solid/90 [&[data-state=open],&[data-popup-open]]:bg-fill-info-solid/90 text-text-on-accent border-transparent",
  accentInverse:
    "bg-fill-info-solid not-disabled:not-aria-disabled:hover:bg-fill-info-solid/90 [&[data-state=open],&[data-popup-open]]:bg-fill-info-solid/90 text-(--ck-palette-label-button-primary) border-transparent",
  accentSubtle:
    "bg-text-notice/10 not-disabled:not-aria-disabled:hover:bg-text-notice/15 [&[data-state=open],&[data-popup-open]]:bg-text-notice/15 text-text-notice border-transparent",
  conversationAccentSubtle:
    "bg-[var(--ck-conversation-accent,var(--ck-palette-label-accent))]/10 not-disabled:not-aria-disabled:hover:bg-[var(--ck-conversation-accent,var(--ck-palette-label-accent))]/15 [&[data-state=open],&[data-popup-open]]:bg-[var(--ck-conversation-accent,var(--ck-palette-label-accent))]/15 text-[color:var(--ck-conversation-accent-text,var(--ck-palette-label-accent))] border-transparent",
  headerUpgrade:
    "border-transparent bg-transparent text-[color:var(--color-status-info)] not-disabled:not-aria-disabled:hover:bg-[light-dark(color-mix(in_srgb,var(--color-status-info-fill)_9%,transparent),color-mix(in_srgb,var(--color-status-info)_20%,transparent))] focus-visible:bg-[light-dark(color-mix(in_srgb,var(--color-status-info-fill)_9%,transparent),color-mix(in_srgb,var(--color-status-info)_20%,transparent))] [&[data-state=open],&[data-popup-open]]:bg-[light-dark(color-mix(in_srgb,var(--color-status-info-fill)_9%,transparent),color-mix(in_srgb,var(--color-status-info)_20%,transparent))]",
  upgrade:
    "border-transparent bg-[light-dark(color-mix(in_oklab,var(--color-status-info-fill)_4%,transparent),color-mix(in_srgb,var(--color-status-info)_15%,transparent))] text-[color:var(--color-status-info)] not-disabled:not-aria-disabled:hover:bg-[light-dark(color-mix(in_srgb,var(--color-status-info-fill)_9%,transparent),color-mix(in_srgb,var(--color-status-info)_20%,transparent))] [&[data-state=open],&[data-popup-open]]:bg-[light-dark(color-mix(in_srgb,var(--color-status-info-fill)_9%,transparent),color-mix(in_srgb,var(--color-status-info)_20%,transparent))]",
  upgradeAccent:
    "border-transparent bg-[light-dark(color-mix(in_srgb,var(--color-status-info-fill)_9%,transparent),color-mix(in_srgb,var(--color-status-info)_15%,transparent))] text-[color:var(--color-status-info)] not-disabled:not-aria-disabled:hover:bg-[light-dark(color-mix(in_oklab,var(--color-status-info-fill)_13%,transparent),color-mix(in_srgb,var(--color-status-info)_20%,transparent))] [&[data-state=open],&[data-popup-open]]:bg-[light-dark(color-mix(in_oklab,var(--color-status-info-fill)_13%,transparent),color-mix(in_srgb,var(--color-status-info)_20%,transparent))]",
  composerPrimary:
    "bg-fill-primary-solid not-disabled:not-aria-disabled:hover:bg-fill-primary-solid/90 [&[data-state=open],&[data-popup-open]]:bg-fill-primary-solid/90 text-text-strong-solid border-transparent",
  composerSurface:
    "border-transparent bg-[light-dark(color-mix(in_oklab,var(--ck-palette-surface-control)_90%,transparent),var(--ck-palette-surface-elevated-primary))] text-text shadow-(--shadow-xl) max-sm:shadow-(--shadow-lg) not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover [:where(:root[data-ui-platform=win32].electron-opaque)_&]:bg-[light-dark(var(--ck-palette-surface-control),var(--ck-palette-surface-elevated-primary))] forced-colors:shadow-none forced-colors:outline forced-colors:outline-[CanvasText]",
  cardAction:
    "border-stroke-subtle bg-panel text-text not-disabled:not-aria-disabled:active:opacity-80",
  successOutline:
    "border-white/20 bg-transparent text-white not-disabled:not-aria-disabled:hover:bg-white/10",
  successSolid:
    "bg-(--color-status-success-solid) not-disabled:not-aria-disabled:hover:bg-[var(--color-status-success-strong)] [&[data-state=open],&[data-popup-open]]:bg-[var(--color-status-success-strong)] text-white border-transparent",
  danger:
    "bg-[light-dark(color-mix(in_oklab,var(--color-status-danger)_10%,transparent),color-mix(in_oklab,var(--color-status-danger)_10%,transparent))] not-disabled:not-aria-disabled:hover:bg-[light-dark(color-mix(in_oklab,var(--color-status-danger)_20%,transparent),color-mix(in_oklab,var(--color-status-danger)_20%,transparent))] text-[color:var(--color-status-danger)] border-transparent",
  dangerSolid:
    "bg-(--color-status-danger-solid) not-disabled:not-aria-disabled:hover:bg-(--color-status-danger-solid)/90 text-white border-transparent",
  dangerOutline:
    "border-current bg-transparent text-[color:var(--color-status-danger)] not-disabled:not-aria-disabled:hover:bg-(--color-status-danger-solid)/10",
  ghost:
    "text-text-subtle not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover border-transparent",
  disclosure: "border-transparent bg-transparent text-text-subtle",
  blockAction:
    "text-text-subtle not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover not-disabled:not-aria-disabled:hover:text-text [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover border-transparent",
  ghostAccent:
    "text-text-notice not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover border-transparent",
  ghostSubtle:
    "text-text not-disabled:not-aria-disabled:hover:bg-(--ck-palette-surface-elevated-secondary) [&[data-state=open],&[data-popup-open]]:bg-(--ck-palette-surface-elevated-secondary) border-0",
  ghostAccentSubtle:
    "text-text-notice not-disabled:not-aria-disabled:hover:bg-(--ck-palette-surface-elevated-secondary) [&[data-state=open],&[data-popup-open]]:bg-(--ck-palette-surface-elevated-secondary) border-0",
  ghostOutline:
    "border-transparent text-text-subtle not-disabled:not-aria-disabled:hover:border-(--ck-palette-border) not-disabled:not-aria-disabled:hover:bg-panel not-disabled:not-aria-disabled:hover:text-text not-disabled:not-aria-disabled:hover:shadow-sm [&[data-state=open],&[data-popup-open]]:border-(--ck-palette-border) [&[data-state=open],&[data-popup-open]]:bg-panel [&[data-state=open],&[data-popup-open]]:text-text [&[data-state=open],&[data-popup-open]]:shadow-sm",
  ghostSecondary:
    "text-text-muted not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover border-transparent",
  ghostDanger:
    "border-transparent text-text not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover not-disabled:not-aria-disabled:hover:text-[color:var(--color-status-danger)] focus-visible:bg-fill-primary-transparent-hover focus-visible:text-[color:var(--color-status-danger)]",
  outlineActive:
    "border-(--ck-palette-border) bg-text/10 not-disabled:not-aria-disabled:hover:bg-text/15 [&[data-state=open],&[data-popup-open]]:bg-text/15 border",
  ghostActive:
    "text-text not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover border-transparent",
  toolbar:
    "text-text-subtle not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover border-transparent",
  ghostMuted:
    "not-disabled:not-aria-disabled:hover:bg-transparent [&[data-state=open],&[data-popup-open]]:bg-transparent hover:text-text border-transparent",
  ghostUserMessage:
    "text-text not-disabled:not-aria-disabled:hover:bg-transparent [&[data-state=open],&[data-popup-open]]:bg-transparent border-transparent",
  ghostTertiary:
    "text-text-subtle not-disabled:not-aria-disabled:hover:bg-transparent [&[data-state=open],&[data-popup-open]]:bg-transparent not-disabled:not-aria-disabled:hover:text-text border-transparent",
  mediaSolid:
    "border-transparent bg-white text-black not-disabled:not-aria-disabled:hover:bg-white/90 [&[data-state=open],&[data-popup-open]]:bg-white/90",
  mediaSubtle:
    "border-white/20 bg-[color-mix(in_srgb,var(--ck-fixed-white)_35%,var(--color-media-surface))] text-white not-disabled:not-aria-disabled:hover:bg-[color-mix(in_srgb,var(--ck-fixed-white)_40%,var(--color-media-surface))] [&[data-state=open],&[data-popup-open]]:bg-[color-mix(in_srgb,var(--ck-fixed-white)_40%,var(--color-media-surface))]",
  mediaOverlay:
    "border-transparent bg-[color-mix(in_srgb,var(--ck-fixed-white)_35%,var(--color-media-surface))] text-white not-disabled:not-aria-disabled:hover:bg-[color-mix(in_srgb,var(--ck-fixed-white)_40%,var(--color-media-surface))] focus:bg-[color-mix(in_srgb,var(--ck-fixed-white)_40%,var(--color-media-surface))] [&[data-state=open],&[data-popup-open]]:bg-[color-mix(in_srgb,var(--ck-fixed-white)_40%,var(--color-media-surface))]",
  mediaTranslucent:
    "border-transparent bg-black/20 text-white backdrop-blur-md backdrop-brightness-75 not-disabled:not-aria-disabled:hover:bg-black/30 focus-visible:bg-black/30 [&[data-state=open],&[data-popup-open]]:bg-black/30",
  imageSurface:
    "border-transparent bg-panel text-text not-disabled:not-aria-disabled:hover:bg-panel focus-visible:bg-panel [&[data-state=open],&[data-popup-open]]:bg-panel",
  outline:
    "border-(--ck-palette-border) bg-(--ck-palette-surface-elevated-secondary) not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover border",
  field:
    "border-(--ck-palette-border) bg-fill-primary-soft text-text not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover",
  mapSurface:
    "relative isolate border-transparent bg-panel text-text ring-1 ring-(--ck-palette-border) after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-[inherit] not-disabled:not-aria-disabled:hover:after:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:after:bg-fill-primary-transparent-hover not-disabled:not-aria-disabled:aria-pressed:hover:after:bg-current/10 aria-pressed:bg-fill-primary-solid aria-pressed:text-text-strong-solid",
  outlineSurface:
    "border-(--ck-palette-border) bg-panel not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover border",
  outlineSurfaceRaised: `${SURFACE_TINT} border-(--ck-palette-border) bg-panel text-text shadow-sm border-[0.5px]`,
  outlineCard:
    "border-(--ck-palette-border) bg-panel text-text not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover not-disabled:not-aria-disabled:active:opacity-80",
  conversationFollowup:
    "border-(--ck-palette-border) bg-panel text-text shadow-sm not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover border",
  conversationPill:
    "border-(--ck-palette-border) bg-panel text-text shadow-(--shadow-card) not-disabled:not-aria-disabled:hover:border-transparent not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:border-transparent [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover",
  selectTrigger:
    "border-(--ck-palette-border) bg-panel not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-panel-elevated-secondary [&[data-state=open],&[data-popup-open]]:rounded-t-2xl [&[data-state=open],&[data-popup-open]]:rounded-b-none [&[data-state=open],&[data-popup-open]]:border-b-transparent border",
  outlineGhost:
    "border-(--ck-palette-border) bg-transparent text-text not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover",
  outlineGhostInset:
    "border-transparent bg-transparent text-text inset-ring-1 inset-ring-(--ck-palette-border) not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover",
  outlineGhostMuted:
    "border-(--ck-palette-border) bg-transparent text-text-subtle not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover [&[data-state=open],&[data-popup-open]]:bg-fill-primary-transparent-hover",
  outlineSubtle:
    "border-stroke-subtle bg-transparent text-text-muted not-disabled:not-aria-disabled:hover:bg-fill-secondary-soft [&[data-state=open],&[data-popup-open]]:bg-fill-secondary-soft",
  surveyCard:
    "border-stroke-subtle bg-transparent text-text not-disabled:not-aria-disabled:not-aria-pressed:hover:bg-fill-secondary-soft aria-pressed:bg-fill-primary-transparent-hover",
  selectionTile:
    "relative border-(--ck-palette-border) bg-panel text-text not-disabled:not-aria-disabled:hover:bg-fill-primary-transparent-hover after:pointer-events-none after:absolute after:-inset-px after:rounded-[inherit] after:[corner-shape:inherit] aria-pressed:border-text aria-pressed:after:inset-ring-2 aria-pressed:after:inset-ring-text",
  primary:
    "border-(--ck-palette-border) bg-fill-primary-solid not-disabled:not-aria-disabled:hover:bg-text/80 [&[data-state=open],&[data-popup-open]]:bg-text/80 text-text-strong-solid",
  solidPrimary:
    "border-transparent bg-fill-primary-solid bg-clip-padding text-text-strong-solid not-disabled:not-aria-disabled:hover:bg-[color-mix(in_srgb,var(--ck-palette-ink)_90%,var(--ck-palette-surface-surface))] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-text",
  shareDestination:
    "border-transparent bg-transparent text-text-muted not-disabled:not-aria-disabled:hover:bg-transparent [&>.share-destination-icon]:bg-text/5 [&>.share-destination-icon]:text-text not-disabled:not-aria-disabled:hover:[&>.share-destination-icon]:bg-text/10 not-disabled:not-aria-disabled:active:[&>.share-destination-icon]:bg-text/10",
  secondary:
    "text-text bg-text/5 not-disabled:not-aria-disabled:hover:bg-text/10 [&[data-state=open],&[data-popup-open]]:bg-text/10 border-transparent",
  secondarySurface: `${SURFACE_TINT} border-(--ck-palette-border) bg-panel text-text`,
  elevatedSurface: `${SURFACE_TINT} border-(--ck-palette-border) bg-panel-elevated text-text`,
  tinted:
    "bg-current/10 not-disabled:not-aria-disabled:hover:bg-current/15 [&[data-state=open],&[data-popup-open]]:bg-current/15 border-transparent",
  segmentedSelected:
    "text-text bg-text/5 not-disabled:not-aria-disabled:hover:bg-text/10 [&[data-state=open],&[data-popup-open]]:bg-text/10 border-transparent",
  segmentedInsetSelected:
    "border-transparent bg-panel text-text shadow-sm not-disabled:not-aria-disabled:hover:bg-panel not-disabled:not-aria-disabled:active:bg-panel [&[data-state=open],&[data-popup-open]]:bg-panel",
  segmentedFormSelected:
    "border-transparent bg-transparent text-text forced-colors:z-20 forced-colors:outline forced-colors:outline-[Highlight]",
  segmentedFormUnselected:
    "border-transparent bg-transparent text-text-muted not-disabled:not-aria-disabled:hover:text-text [&[data-state=open],&[data-popup-open]]:text-text",
  segmentedFieldSelected:
    "text-text border-[color:light-dark(transparent,var(--ck-palette-border))] bg-[light-dark(var(--ck-palette-surface-surface),var(--theme-background-control-opaque))] inset-ring-1 inset-ring-[color:light-dark(var(--ck-palette-border),transparent)] not-disabled:not-aria-disabled:hover:bg-[light-dark(var(--ck-palette-surface-surface),var(--theme-background-control-opaque))] not-disabled:not-aria-disabled:active:bg-[light-dark(var(--ck-palette-surface-surface),var(--theme-background-control-opaque))] [&[data-state=open],&[data-popup-open]]:bg-[light-dark(var(--ck-palette-surface-surface),var(--theme-background-control-opaque))] dark:bg-clip-padding",
} as const;

const sizeClasses = {
  catalogAction: "h-9 shrink-0 px-3.75 py-0 text-sm leading-none font-medium",
  catalogBack:
    "h-7 shrink-0 gap-1.5 px-2.25 py-0 text-sm leading-none font-medium",
  onboardingAction:
    "h-11.5 justify-center px-4 py-2 text-[14px] tracking-[-0.15px] leading-[calc(20/14)] leading-4 font-medium",
  activityOption: "px-4 py-2 text-[14px] leading-4 font-medium",
  auth: "min-h-13 justify-center gap-2 px-5 py-3 text-base leading-6 font-medium",
  authUpsell:
    "min-h-11 justify-center gap-1.5 px-4 py-2 text-[0.875rem] tracking-[-0.15px] leading-5 font-medium",
  giftCard: "h-12 justify-center px-6 text-base leading-[26px] font-medium",
  compact: "h-6 px-2 py-0 text-xs leading-4",
  cardAction:
    "h-7 min-h-7 shrink-0 justify-center px-3 py-0 text-sm leading-5 font-medium pointer-coarse:min-h-10",
  composer: "h-7 px-2 py-0 text-sm leading-[18px]",
  composerDictation: "h-7 shrink-0 gap-0 border-0 p-0",
  composerWithBadge:
    "h-7 ps-2 pe-[calc((calc(var(--spacing)*7)-var(--spacing)*5)/2-1px)] py-0 text-sm leading-[18px]",
  composerPill: "h-7 py-0 ps-3 pe-3.5 text-base leading-relaxed",
  composerAuxiliary: "h-7 px-2 py-0 text-sm leading-[18px]",
  composerPermissions:
    "h-7 min-w-7 justify-center px-1.5 py-0 text-sm leading-[18px]",
  composerSm: "h-7 px-1.5 py-0 text-sm leading-[18px]",
  composerSmLabel: "h-7 px-2.5 py-0 text-sm leading-[18px]",
  default: "px-2 py-0.5 text-sm leading-[18px]",
  secondaryAction:
    "min-h-8.5 shrink-0 justify-center px-3 py-0 text-control-label",
  actionSm:
    "min-h-7 shrink-0 justify-center px-2.5 py-0 text-xs leading-4 font-medium pointer-coarse:min-h-10",
  sidebarOffer:
    "min-h-9 shrink-0 justify-center px-4 py-0 text-xs leading-5 font-medium pointer-coarse:min-h-10",
  dialog: "min-h-9 px-3 text-sm font-medium",
  dialogAction: "min-h-9 shrink-0 px-4 text-sm font-medium",
  formAction:
    "min-h-10.5 shrink-0 justify-center px-4 py-2 text-sm leading-5 font-medium",
  entityAction: "min-h-9 shrink-0 justify-center px-5 text-sm font-medium",
  responsiveDialogAction:
    "min-h-12 w-full shrink-0 justify-center px-6 py-3 text-base leading-6 font-medium sm:min-h-9 sm:w-auto sm:px-4 sm:py-0 sm:text-sm sm:leading-normal",
  modalPrimary:
    "min-h-12 justify-center border-0 px-6 py-3 text-[17px] leading-6 font-medium tracking-[-0.44px]",
  pageAction: "h-8 shrink-0 px-4 py-0 text-sm font-medium",
  addAction:
    "h-9 shrink-0 justify-center gap-1.5 border-0 ps-2 pe-4 py-0 text-[14px] tracking-[-0.15px] leading-[calc(20/14)] font-[510]",
  formDisclosure:
    "min-h-12 justify-start gap-1 border-0 px-3.5 py-0 text-[0.875rem] tracking-[-0.15px] leading-5 font-normal motion-safe:transition-[min-height] motion-safe:duration-(--motion-duration-slow) motion-safe:ease-[cubic-bezier(.23,1,.32,1)] aria-expanded:min-h-10.5",
  formValue:
    "min-h-10 gap-2 border-0 px-0 py-0 text-[0.875rem] tracking-[-0.15px] leading-5 font-normal",
  entityRowAction:
    "min-h-9 shrink-0 justify-center gap-1.5 px-3 py-0 text-[14px] tracking-[-0.15px] leading-[calc(20/14)] font-medium",
  recoveryAction:
    "min-h-9 shrink-0 justify-center px-3 text-sm leading-5 font-medium",
  panelAction:
    "min-h-12 shrink-0 justify-center px-8 text-sm leading-5 font-medium",
  detailAction: "min-h-10 justify-center px-4 text-base font-medium",
  setupAction: "min-h-11 justify-center px-5 text-sm font-medium",
  beaconAction: "min-h-11 justify-center px-4 text-sm font-medium",
  responsiveBeaconAction:
    "min-h-14 justify-center px-5 text-base font-semibold sm:min-h-11 sm:px-4 sm:text-sm sm:font-medium",
  takeoverHeroAction:
    "min-h-11 justify-center px-4 text-[14px] leading-5 font-medium",
  expressiveBeaconAction:
    "min-h-9 justify-center px-5 text-[14px] leading-5 font-medium",
  promotionalAction:
    "min-h-11.5 justify-center border-0 px-4 py-3.25 text-[14px] tracking-[-0.15px] leading-[calc(20/14)] font-medium",
  promotionalLink:
    "min-h-9 justify-center border-0 px-0 py-2 text-[14px] tracking-[-0.15px] leading-[calc(20/14)] font-semibold tracking-[-0.01125rem] underline decoration-from-font [text-underline-position:from-font]",
  workNux: "min-h-11 min-w-29 justify-center px-6 text-sm font-medium",
  workPopover: "min-h-8 justify-center px-3 text-sm font-normal",
  beaconCarousel: "h-9 min-w-30 justify-center px-4 text-sm font-medium",
  conversationFollowup: "h-10 shrink-0 px-4 py-0 text-sm leading-5",
  conversationPill:
    "min-h-12 gap-1.5 px-4 py-3 text-base leading-5.5 font-medium",
  conversationPillAction: "min-h-9 px-3 py-0 text-base leading-5.5 font-medium",
  actionChip:
    "min-h-9 gap-1.5 border-0 py-2 ps-4 pe-2.5 text-[14px] leading-5 font-normal tracking-[-0.14px]",
  actionChipWithIcon:
    "min-h-11 gap-2 border-0 py-2 ps-2 pe-7 text-[14px] leading-5 font-normal tracking-[-0.14px] has-[>svg:last-child]:pe-2",
  paginationDot: "h-6 w-3.5 shrink-0 justify-center border-0 p-0",
  paginationSegment:
    "h-6 w-6 min-w-0 max-w-6 shrink justify-center border-0 p-0",
  dialogGhost: "min-h-9 gap-1.5 px-3 text-sm leading-5",
  messageChip: "min-h-9 gap-1.5 px-3 text-sm leading-5",
  avatarGroup: "h-full border-0 px-1 text-sm leading-5",
  avatarGroupAction: "h-full border-0 ps-0 pe-3 text-sm leading-5",
  entityHeader:
    "size-9 shrink-0 justify-center border-0 p-0 pointer-coarse:min-h-10 pointer-coarse:min-w-10",
  dragHandle: "h-7 w-6 shrink-0 justify-center p-0",
  formatToolbar: "h-7 border-0 px-1.5 py-0 text-sm leading-5",
  formatToolbarIcon: "size-7 shrink-0 justify-center border-0 p-0",
  field: "h-8 min-w-0 px-2 py-0 text-sm leading-4.5",
  fieldControl: "h-full w-8 shrink-0 justify-center border-0 p-0",
  fieldSegment:
    "h-8 min-w-0 justify-center border-0 px-2 py-0 text-sm leading-4.5 dark:border",
  icon: "p-1 button-icon flex items-center justify-center",
  iconCircle: "flex size-8 items-center justify-center p-0",
  iconCircleLg: "flex size-9 items-center justify-center p-0",
  iconTouch: "flex size-11 shrink-0 items-center justify-center p-0",
  iconCircleSm: "flex size-5 items-center justify-center p-0",
  iconLarge: "flex size-16 items-center justify-center p-0",
  iconMd: "flex size-5 items-center justify-center p-0.5 [&>svg]:icon-2xs",
  iconSm: "flex h-4 w-4 items-center justify-center p-0.5 [&>svg]:icon-2xs",
  imageToolbar: "h-9 gap-1.5 border-0 px-2 py-0 text-sm leading-5",
  imageAction:
    "h-9 justify-center border-0 px-3 py-0 text-sm leading-4.5 font-medium",
  imageActionIcon: "size-7 justify-center border-0 p-1",
  floatingAction:
    "h-14 justify-center overflow-clip border-0 px-6 py-0 text-sm leading-5 font-medium shadow-(--shadow-command)",
  inline: "border-0 p-0",
  inputIcon: "size-9 justify-center border-0 p-0",
  inputSegment:
    "h-full w-10 shrink-0 justify-center border-e-(--ck-palette-border) p-0",
  inputSelect: "h-full min-w-28 shrink-0 gap-2 border-0 px-3 text-sm",
  inputControl: "h-10 shrink-0 px-4 py-0 text-sm leading-5",
  formField:
    "h-9.5 min-w-0 px-3 py-2 text-sm leading-5 font-normal aria-invalid:border-[color:var(--color-status-danger)] aria-invalid:ring-2 aria-invalid:ring-[color:light-dark(color-mix(in_oklab,var(--color-status-danger)_20%,transparent),color-mix(in_oklab,var(--color-status-danger)_20%,transparent))]",
  large: "px-5 py-2 text-base leading-[18px]",
  medium: "px-4 py-1.5 text-base leading-[18px]",
  menuRow: "h-7 px-2 py-0 text-xs leading-4",
  settingsSelect: "h-9 px-2 py-1 text-sm leading-none",
  settingsOption: "min-h-9 gap-2 px-2 py-2 text-sm leading-5",
  settingsAction: "h-7 px-2 py-0 text-base leading-5",
  shareDestination:
    "min-w-20 flex-col gap-3 border-0 p-0 text-xs max-sm:min-w-0",
  surveyOption: "gap-3 border-0 p-4 text-base leading-6 font-normal",
  surveyCard: "gap-3 p-4 text-sm leading-5 font-normal",
  selectionTile:
    "h-16 min-w-0 flex-col justify-center px-2 py-2 text-xs leading-4 font-normal",
  imageTile: "relative h-16 min-w-0 w-full justify-center overflow-hidden p-0",
  tabStripAction:
    "h-[calc(calc(var(--spacing)*7)+6px)] px-2 py-0 text-base leading-[18px]",
  toolbar:
    "h-(--ck-compose-button-spacing) px-(--ck-toolbar-button-spacing-inline) py-0 text-sm leading-[18px]",
  toolbarLabel:
    "h-(--ck-compose-button-spacing) px-(--ck-toolbar-button-spacing-inline) py-0 text-sm leading-[18px]",
  headerUpsell:
    "h-8.5 px-3 py-0 text-sm leading-5 font-medium pointer-coarse:h-10",
} as const;

const radiusClasses = {
  catalogAction: "rounded-full",
  catalogBack: "rounded-lg",
  onboardingAction: "rounded-full",
  activityOption: "rounded-full",
  auth: "rounded-full",
  authUpsell: "rounded-full",
  giftCard: "rounded-full",
  compact: "rounded-lg",
  cardAction: "rounded-full",
  default: "rounded-full",
  secondaryAction: "rounded-full",
  actionSm: "rounded-full",
  sidebarOffer: "rounded-full",
  dialog: "rounded-full",
  dialogAction: "rounded-full",
  formAction: "rounded-full",
  entityAction: "rounded-full",
  responsiveDialogAction: "rounded-full",
  modalPrimary: "rounded-full",
  pageAction: "rounded-full",
  addAction: "rounded-full",
  formDisclosure: "rounded-xl",
  formValue: "rounded-md",
  recoveryAction: "rounded-full",
  panelAction: "rounded-full",
  detailAction: "rounded-full",
  setupAction: "rounded-full",
  beaconAction: "rounded-full",
  responsiveBeaconAction: "rounded-full",
  expressiveBeaconAction: "rounded-full",
  takeoverHeroAction: "rounded-full",
  promotionalAction: "rounded-full",
  promotionalLink: "rounded-full",
  workNux: "rounded-full",
  workPopover: "rounded-full",
  beaconCarousel: "rounded-full",
  conversationFollowup: "rounded-full",
  conversationPill: "rounded-full",
  conversationPillAction: "rounded-full",
  actionChip: "rounded-full",
  actionChipWithIcon: "rounded-full",
  paginationDot: "rounded-full",
  paginationSegment: "rounded-full",
  dialogGhost: "rounded-lg",
  messageChip: "rounded-lg",
  avatarGroup: "rounded-full",
  avatarGroupAction: "rounded-full",
  entityHeader: "rounded-xl",
  entityRowAction: "rounded-full",
  dragHandle: "rounded-lg",
  formatToolbar: "rounded-md",
  formatToolbarIcon: "rounded-md",
  field: "rounded-lg",
  fieldControl: "rounded-none",
  fieldSegment: "rounded-lg",
  icon: "rounded-md",
  iconCircle: "rounded-full",
  iconCircleLg: "rounded-full",
  iconTouch: "rounded-full",
  iconCircleSm: "rounded-full",
  iconLarge: "rounded-2xl",
  iconMd: "rounded-md",
  iconSm: "rounded-md",
  inputSegment: "rounded-none",
  inputSelect: "rounded-none",
  inputControl: "rounded-xl",
  formField: "rounded-lg",
  imageToolbar: "rounded-full",
  imageAction: "rounded-lg",
  imageActionIcon: "rounded-full",
  floatingAction: "rounded-full",
  inline: "rounded-none",
  inputIcon: "rounded-s-lg rounded-e-none",
  large: "rounded-full",
  medium: "rounded-lg",
  menuRow: "rounded-lg",
  settingsSelect: "rounded-md",
  settingsOption: "rounded-lg",
  settingsAction: "rounded-lg",
  composer: "rounded-full",
  composerDictation: "rounded-full",
  composerWithBadge: "rounded-full",
  composerPill: "rounded-full",
  composerAuxiliary: "rounded-full",
  composerPermissions: "rounded-full",
  composerSm: "rounded-full",
  composerSmLabel: "rounded-full",
  shareDestination: "rounded-full",
  surveyOption: "rounded-lg",
  surveyCard: "rounded-xl",
  selectionTile: "rounded-xl",
  imageTile: "rounded-xl",
  tabStripAction: "rounded-lg",
  toolbar: "rounded-lg",
  toolbarLabel: "rounded-lg",
  headerUpsell: "rounded-lg",
} as const;

const radiusOverrides = {
  full: "rounded-full",
  messageBubble: "rounded-[var(--ck-bubble-radius,var(--radius-pill))]",
  extraLarge: "rounded-2xl",
  large: "rounded-lg",
  small: "rounded-md",
} as const;

export type ButtonColor = keyof typeof colorClasses;

export type ButtonSize = keyof typeof sizeClasses;

export type ButtonRadius = "default" | keyof typeof radiusOverrides;

export type ButtonFocusRing =
  | "default"
  | "inset"
  | "native"
  | "none"
  | "surface";

export type ButtonContentLayout = "balanced" | "default" | "dropdown";

export type ButtonDisabledAppearance = "dimmed" | "none";

export interface ButtonStyleProps {
  allowShrink?: boolean;
  color?: ButtonColor;
  contentLayout?: ButtonContentLayout;
  disabledAppearance?: ButtonDisabledAppearance;
  focusRing?: ButtonFocusRing;
  radius?: ButtonRadius;
  size?: ButtonSize;
  /** Labels that reserve the widest label's width so the button does not resize. */
  sizingLabels?: ReactNode;
  /** Square, icon-only button. */
  uniform?: boolean;
  /**
   * Square below the md breakpoint. The component applies it with a
   * `browser:` variant, so the Electron theme gives it no effect.
   */
  uniformAtMobile?: boolean;
  /** Drops the color, size and radius classes and keeps only behaviour. */
  unstyled?: boolean;
}

// Hook class: `a.button-link{color:revert-layer}` cancels
// unlayered anchor colors. This project has no such rule; the class stays.
// oxlint-disable-next-line shadcn/no-unknown-classes -- hook class kept as a styling target.
const LINK_MARKER = "button-link";

const NO_GAP_SIZES = new Set<ButtonSize>([
  "composerPill",
  "authUpsell",
  "composerDictation",
  "headerUpsell",
  "entityRowAction",
  "addAction",
  "conversationPill",
  "actionChip",
  "actionChipWithIcon",
  "surveyCard",
  "settingsOption",
]);

const WRAPPING_SIZES = new Set<ButtonSize>([
  "auth",
  "authUpsell",
  "surveyOption",
  "surveyCard",
  "selectionTile",
  "settingsOption",
]);

const UNIFORM_LG_SIZES = new Set<ButtonSize>([
  "toolbar",
  "compact",
  "medium",
  "dialogGhost",
]);

const INSET_RING_SIZES = new Set<ButtonSize>(["inputSegment", "fieldControl"]);

const OPEN_SURFACE =
  "group-data-[transparent=true]/entity-header:not-disabled:not-aria-disabled:hover:bg-panel group-data-[transparent=true]/entity-header:focus-visible:bg-panel group-data-[transparent=true]/entity-header:[&[data-state=open],&[data-popup-open]]:bg-panel";

const focusRingClasses = (
  focusRing: ButtonFocusRing | undefined,
  color: ButtonColor
) => {
  if (focusRing === "surface") {
    return "focus:outline-none focus-visible:bg-fill-primary-transparent-hover forced-colors:focus-visible:bg-[Highlight] forced-colors:focus-visible:text-[HighlightText] forced-colors:focus-visible:forced-color-adjust-none";
  }

  if (focusRing === "native") {
    return "focus-visible:outline-auto";
  }

  return cn(
    color !== "solidPrimary" && "focus:outline-hidden",
    focusRing !== "none" &&
      "focus-visible:ring-2 focus-visible:ring-(--ck-palette-border-focus) focus-visible:ring-offset-0"
  );
};

const radiusClassName = (
  radius: ButtonRadius,
  size: ButtonSize,
  uniform: boolean
) => {
  if (radius !== "default") {
    return radiusOverrides[radius];
  }

  return uniform && UNIFORM_LG_SIZES.has(size)
    ? "rounded-lg"
    : radiusClasses[size];
};

const styledClassName = ({
  color,
  contentLayout,
  radius,
  size,
  uniform,
}: {
  color: ButtonColor;
  contentLayout: ButtonContentLayout;
  radius: ButtonRadius;
  size: ButtonSize;
  uniform: boolean;
}) => {
  let border: string | false = "border";

  if (size === "composerPill") {
    border = cn("gap-1.5", color === "limited" ? "border" : "border-0");
  } else if (size === "addAction") {
    border = false;
  }

  const colorKey =
    color === "segmentedInsetSelected" && size === "fieldSegment"
      ? "segmentedFieldSelected"
      : color;

  return cn(
    border,
    !NO_GAP_SIZES.has(size) && "gap-1",
    size === "headerUpsell" && "gap-0.75",
    radiusClassName(radius, size, uniform),
    colorClasses[colorKey],
    sizeClasses[size],
    size === "entityHeader" && color === "ghostActive" && OPEN_SURFACE,
    contentLayout === "dropdown" && "pe-1"
  );
};

const dimmedClasses = (
  appearance: ButtonDisabledAppearance,
  color: ButtonColor
) => {
  if (appearance !== "dimmed") {
    return false;
  }

  return color === "cardAction"
    ? "disabled:opacity-50 aria-disabled:opacity-50"
    : "disabled:opacity-40 aria-disabled:opacity-40";
};

const insetRing = (focusRing: ButtonFocusRing | undefined, size: ButtonSize) =>
  size === "fieldSegment" ||
  focusRing === "inset" ||
  (!isPresent(focusRing) && INSET_RING_SIZES.has(size));

/** The class list ButtonBase builds for the given props. */
export const buttonClassName = ({
  allowShrink = false,
  className,
  color = "primary",
  contentLayout = "default",
  disabledAppearance = "dimmed",
  focusRing,
  radius = "default",
  size = "default",
  sizingLabels,
  uniform = false,
  unstyled = false,
}: ButtonStyleProps & { className?: string }) =>
  cn(
    "cursor-default items-center select-none [-webkit-app-region:no-drag] disabled:cursor-default aria-disabled:cursor-default",
    focusRingClasses(focusRing, color),
    dimmedClasses(disabledAppearance, color),
    WRAPPING_SIZES.has(size) ? "whitespace-normal" : "whitespace-nowrap",
    contentLayout === "balanced" ? "grid grid-cols-[1fr_auto_1fr]" : "flex",
    !unstyled &&
      styledClassName({ color, contentLayout, radius, size, uniform }),
    insetRing(focusRing, size) && "focus-visible:ring-inset",
    allowShrink && "min-w-0",
    isPresent(sizingLabels) && "max-w-full min-w-0",
    uniform && "aspect-square shrink-0 items-center justify-center px-0!",
    className
  );

const LimitedOutline = () => (
  <svg
    aria-hidden="true"
    className="pointer-events-none absolute -inset-px h-[calc(100%+2px)] w-[calc(100%+2px)] text-stroke-strong"
    focusable="false"
  >
    <rect
      fill="none"
      height="calc(100% - 1px)"
      rx="calc(var(--spacing) * 7 / 2 - 0.5px)"
      stroke="currentColor"
      strokeDasharray="2 2"
      strokeWidth="1"
      width="calc(100% - 1px)"
      x="0.5"
      y="0.5"
    />
  </svg>
);

interface ButtonContentProps {
  children?: ReactNode;
  color: ButtonColor;
  loading: boolean;
  size: ButtonSize;
  sizingLabels?: ReactNode;
  unstyled: boolean;
}

const ButtonContent = ({
  children,
  color,
  loading,
  size,
  sizingLabels,
  unstyled,
}: ButtonContentProps) => {
  const spinner = (
    <Spinner
      className={
        size === "imageActionIcon" || size === "floatingAction"
          ? undefined
          : "size-3"
      }
    />
  );

  const content = (
    <>
      {!unstyled && color === "limited" ? <LimitedOutline /> : null}
      {loading ? spinner : null}
      {children}
    </>
  );

  if (!isPresent(sizingLabels)) {
    return content;
  }

  const labels = Array.isArray(sizingLabels) ? sizingLabels : [sizingLabels];

  return (
    <span className="grid min-w-0 text-center whitespace-normal">
      {labels.map((label, index) => (
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 flex min-w-0 items-center justify-center gap-1"
          key={index}
        >
          {spinner}
          <span className="min-w-0 break-words">{label}</span>
        </span>
      ))}
      <span className="col-start-1 row-start-1 flex min-w-0 items-center justify-center gap-1">
        {content}
      </span>
    </span>
  );
};

export interface ButtonProps
  extends Omit<ComponentProps<"button">, "color" | "ref">, ButtonStyleProps {
  /** Disables the button and shows the spinner before the children. */
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * ButtonBase: a native `<button>` (type "button" by default). `disabled` and
 * `loading` both set the native disabled attribute.
 */
export const ButtonBase = ({
  allowShrink,
  children,
  className,
  color = "primary",
  contentLayout,
  disabled = false,
  disabledAppearance,
  focusRing,
  loading = false,
  radius,
  size = "default",
  sizingLabels,
  uniform,
  uniformAtMobile: _uniformAtMobile,
  unstyled = false,
  ...props
}: ButtonProps) => (
  <ButtonPrimitive
    className={buttonClassName({
      allowShrink,
      className,
      color,
      contentLayout,
      disabledAppearance,
      focusRing,
      radius,
      size,
      sizingLabels,
      uniform,
      unstyled,
    })}
    data-slot="button"
    disabled={disabled || loading}
    {...props}
  >
    <ButtonContent
      color={color}
      loading={loading}
      size={size}
      sizingLabels={sizingLabels}
      unstyled={unstyled}
    >
      {children}
    </ButtonContent>
  </ButtonPrimitive>
);

/** The app's Button: ButtonBase with the same props. */
export const Button = (props: ButtonProps) => <ButtonBase {...props} />;

type LinkRenderProps = ComponentProps<"a">;

/** A destination given as parts, like the router's `Partial<Path>`. */
export interface ButtonLinkPath {
  hash?: string;
  pathname?: string;
  search?: string;
}

/**
 * The Next.js Link props the router options map to. The platform link
 * component receives them when it is not a plain anchor.
 */
interface RouterLinkProps extends LinkRenderProps {
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
}

export interface ButtonLinkProps
  extends Omit<ComponentProps<"a">, "color" | "ref">, ButtonStyleProps {
  disabled?: boolean;
  /** Disables the link and shows the spinner before the children. */
  loading?: boolean;
  /**
   * `"none"` (the default) never prefetches the destination, which is
   * Next.js `prefetch={false}`. `"viewport"` prefetches when the link enters
   * the viewport, which is `prefetch={true}`.
   */
  prefetch?: "none" | "viewport";
  /** Accepted for API compatibility; routed navigation keeps its scroll position. */
  preventScrollReset?: boolean;
  /** Renders a plain anchor, so the browser loads the destination itself. */
  reloadDocument?: boolean;
  ref?: Ref<HTMLAnchorElement>;
  /**
   * Custom link element. Called with the anchor props unless the link is
   * disabled or loading.
   */
  renderLink?: (props: LinkRenderProps) => ReactElement;
  /** Replaces the current history entry instead of adding one. */
  replace?: boolean;
  /** Destination rendered through the platform link component. */
  to?: ButtonLinkPath | string;
}

// The router's parsePath: "#hash" and "?search" split off the end of the
// string, the rest is the pathname.
const parseLinkPath = (to: string): ButtonLinkPath => {
  const path: ButtonLinkPath = {};
  let rest = to;
  const hashIndex = rest.indexOf("#");

  if (hashIndex !== -1) {
    path.hash = rest.slice(hashIndex);
    rest = rest.slice(0, hashIndex);
  }

  const searchIndex = rest.indexOf("?");

  if (searchIndex !== -1) {
    path.search = rest.slice(searchIndex);
    rest = rest.slice(0, searchIndex);
  }

  if (rest) {
    path.pathname = rest;
  }

  return path;
};

// The router's resolveTo and createPath: an omitted pathname resolves to
// the current one, so `{ hash: "x" }` and "#x" drop the current search. Then
// pathname, search with a leading "?" and hash with a leading "#".
const destinationPath = (
  to: ButtonLinkPath | string,
  currentPathname: string
) => {
  const {
    hash = "",
    pathname,
    search = "",
  } = typeof to === "string" ? parseLinkPath(to) : to;

  const resolved =
    isPresent(pathname) && pathname !== "" ? pathname : currentPathname;

  return `${resolved}${search && !search.startsWith("?") ? "?" : ""}${search}${hash && !hash.startsWith("#") ? "#" : ""}${hash}`;
};

// `to` goes through the platform link component with the router options as
// Next.js Link props. A plain anchor takes none of them.
const renderRouterLink = (
  LinkComponent: PlatformLinkComponent,
  anchorProps: LinkRenderProps,
  options: {
    prefetch: "none" | "viewport";
    replace: boolean | undefined;
  }
) => {
  if (typeof LinkComponent === "string") {
    return createElement("a", anchorProps);
  }

  const routerLinkProps: RouterLinkProps = {
    ...anchorProps,
    prefetch: options.prefetch === "viewport",
    replace: options.replace,
    scroll: false,
  };

  // SAFETY: the platform link component is an anchor-like component, and the
  // router options are the Next.js Link props every such component in this
  // library forwards to its link. ComponentType<PlatformLinkProps> only lacks
  // them in its declared props.
  return createElement(
    LinkComponent as ComponentType<RouterLinkProps>,
    routerLinkProps
  );
};

/**
 * ButtonBase rendered as a link (`as="a"`). While disabled or loading it
 * drops `href`, becomes `role="link"` with `aria-disabled`, leaves the tab
 * order and swallows click, auxclick and Enter/Space.
 */
export const ButtonLink = ({
  allowShrink,
  children,
  className,
  color = "primary",
  contentLayout,
  disabled = false,
  disabledAppearance,
  focusRing,
  href,
  loading = false,
  onAuxClick,
  onClick,
  onKeyDown,
  prefetch = "none",
  preventScrollReset: _preventScrollReset,
  radius,
  reloadDocument = false,
  renderLink,
  replace,
  role,
  size = "default",
  sizingLabels,
  tabIndex,
  to,
  uniform,
  uniformAtMobile: _uniformAtMobile,
  unstyled = false,
  ...props
}: ButtonLinkProps) => {
  const LinkComponent = useLinkComponent();
  const inactive = disabled || loading;
  const currentPathname = usePathname() ?? "/";

  const destination = isPresent(to)
    ? destinationPath(to, currentPathname)
    : href;

  const anchorProps: LinkRenderProps = {
    ...props,
    "aria-disabled": inactive ? true : props["aria-disabled"],
    children: (
      <ButtonContent
        color={color}
        loading={loading}
        size={size}
        sizingLabels={sizingLabels}
        unstyled={unstyled}
      >
        {children}
      </ButtonContent>
    ),
    className: cn(
      buttonClassName({
        allowShrink,
        className,
        color,
        contentLayout,
        disabledAppearance,
        focusRing,
        radius,
        size,
        sizingLabels,
        uniform,
        unstyled,
      }),
      LINK_MARKER
    ),
    href: inactive ? undefined : destination,
    onAuxClick: (event) => {
      if (inactive) {
        event.preventDefault();
      } else {
        onAuxClick?.(event);
      }
    },
    onClick: (event) => {
      if (inactive) {
        event.preventDefault();
      } else {
        onClick?.(event);
      }
    },
    onKeyDown: (event) => {
      if (inactive) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
        }
      } else {
        onKeyDown?.(event);
      }
    },
    role: inactive ? "link" : role,
    tabIndex: inactive ? -1 : tabIndex,
  };

  if (isPresent(renderLink) && !inactive) {
    return renderLink(anchorProps);
  }

  if (isPresent(to) && !inactive && !reloadDocument) {
    return renderRouterLink(LinkComponent, anchorProps, {
      prefetch,
      replace,
    });
  }

  return createElement("a", anchorProps);
};
