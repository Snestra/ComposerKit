"use client";

/* oxlint-disable shadcn/no-restyle -- The route owns its responsive layout. */

/* oxlint-disable react/no-unstable-nested-components -- A row control is a render function of the label and description ids. */

import { Button } from "composerkit/components/ui/button";
import {
  NavigationTab,
  NavigationTabs,
  NavigationTabsList,
  NavigationTabsPanel,
} from "composerkit/components/ui/navigation-tabs";
import { SettingsCard, SettingsRow } from "composerkit/components/ui/settings";
import { Switch } from "composerkit/components/ui/switch";
import { ToastProvider, useToast } from "composerkit/components/ui/toast";
import type { ToastHandle } from "composerkit/components/ui/toast";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "composerkit/components/ui/tooltip";
import { RotateCcw } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRef, useState } from "react";

import { AppearanceControl } from "@/components/appearance-control";
import { KeyCommandsDialog } from "@/components/key-commands-dialog";

const ignoreChange = () => {
  /* The email summary is unavailable in this preview. */
};

const PreferencesContent = ({
  initialKeyCommands,
  initialAlerts = false,
  toastDuration,
}: {
  initialKeyCommands: boolean;
  initialAlerts?: boolean;
  toastDuration?: number;
}) => {
  const { setTheme } = useTheme();
  const toast = useToast();
  const [sound, setSound] = useState(true);
  const [banner, setBanner] = useState(false);
  const [open, setOpen] = useState(initialKeyCommands);
  const opener = useRef<HTMLButtonElement>(null);
  const updateToast = useRef<ToastHandle | null>(null);
  const initialSection = initialKeyCommands ? "keys" : "appearance";

  const update = (which: "sound" | "banner", value: boolean) => {
    const setter = which === "sound" ? setSound : setBanner;
    const previous = !value;
    setter(value);
    updateToast.current = toast.info("Preference updated.", {
      description: which === "sound" ? "Reply sound" : "Task banner",
      duration: toastDuration,
      id: "preference-update",
      primaryAction: {
        dataAttributes: { "data-target": "undo" },
        label: "Undo",
        onClick: () => {
          setter(previous);
          updateToast.current?.close();
        },
      },
    });
  };

  return (
    <main className="preferences-shell">
      <NavigationTabs
        defaultValue={initialAlerts ? "alerts" : initialSection}
        orientation="vertical"
        className="preferences-layout"
      >
        <aside className="preferences-nav">
          <div className="preferences-header">
            <h1 className="preview-heading">Preferences</h1>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    color="ghostActive"
                    size="iconCircleLg"
                    aria-label="Restore defaults"
                    onClick={() => {
                      updateToast.current?.close();
                      setSound(true);
                      setBanner(false);
                      setTheme("system");
                      toast.info("Defaults restored.", {
                        duration: toastDuration,
                      });
                    }}
                  />
                }
              >
                <RotateCcw size={18} />
              </TooltipTrigger>
              <TooltipPopup>Restore defaults</TooltipPopup>
            </Tooltip>
          </div>
          <NavigationTabsList
            aria-label="Preference sections"
            className="preferences-tabs"
          >
            <NavigationTab value="appearance">Appearance</NavigationTab>
            <NavigationTab value="alerts">Alerts</NavigationTab>
            <NavigationTab value="keys">Key commands</NavigationTab>
          </NavigationTabsList>
          <Link href="/preview" className="preferences-back">
            Back to preview
          </Link>
        </aside>
        <div className="preferences-content">
          <NavigationTabsPanel value="appearance">
            <h2>Appearance</h2>
            <p>Choose how the workspace looks.</p>
            <AppearanceControl id="preferences-appearance" />
          </NavigationTabsPanel>
          <NavigationTabsPanel value="alerts">
            <h2>Alerts</h2>
            <p>Changes apply to this preview only.</p>
            <SettingsCard className="max-w-[600px]">
              <SettingsRow
                label="Play a sound when a reply arrives"
                control={(aria) => (
                  <Switch
                    {...aria}
                    id="sound"
                    data-target="sound"
                    checked={sound}
                    onChange={(value) => {
                      update("sound", value);
                    }}
                  />
                )}
              />
              <SettingsRow
                label="Show a banner when a task finishes"
                control={(aria) => (
                  <Switch
                    {...aria}
                    id="banner"
                    checked={banner}
                    onChange={(value) => {
                      update("banner", value);
                    }}
                  />
                )}
              />
              <SettingsRow
                label="Email a weekly summary"
                description="Unavailable in this preview."
                control={(aria) => (
                  <Switch
                    {...aria}
                    id="email"
                    checked={false}
                    disabled
                    onChange={ignoreChange}
                  />
                )}
              />
            </SettingsCard>
          </NavigationTabsPanel>
          <NavigationTabsPanel value="keys">
            <h2>Key commands</h2>
            <p>Review the keys that speed up common actions.</p>
            <Button
              ref={opener}
              className="whitespace-normal"
              size="dialog"
              onClick={() => {
                setOpen(true);
              }}
            >
              Show key commands
            </Button>
          </NavigationTabsPanel>
        </div>
      </NavigationTabs>
      <KeyCommandsDialog open={open} onOpenChange={setOpen} opener={opener} />
    </main>
  );
};

const PreferencesScreen = ({
  initialKeyCommands,
  initialAlerts = false,
  toastContainer,
}: {
  initialKeyCommands: boolean;
  initialAlerts?: boolean;
  toastContainer?: HTMLElement;
}) => (
  <TooltipProvider>
    <ToastProvider container={toastContainer}>
      <PreferencesContent
        initialKeyCommands={initialKeyCommands}
        initialAlerts={initialAlerts}
        toastDuration={toastContainer ? 0 : undefined}
      />
    </ToastProvider>
  </TooltipProvider>
);

export { PreferencesScreen };
