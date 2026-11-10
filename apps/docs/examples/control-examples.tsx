"use client";

import { Button } from "composerkit/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "composerkit/components/ui/dialog";
import {
  NavigationTab as Tab,
  NavigationTabs as Tabs,
  NavigationTabsList as TabsList,
  NavigationTabsPanel as TabsPanel,
} from "composerkit/components/ui/navigation-tabs";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "composerkit/components/ui/popover";
import { Select } from "composerkit/components/ui/select";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "composerkit/components/ui/tooltip";
import { useState } from "react";

const ButtonGalleryExample = () => (
  <section>
    <h2>Button</h2>
    <div className="gallery-row">
      <Button size="dialog">Default</Button>
      <Button color="outline" size="dialog">
        Outline
      </Button>
      <Button color="secondary" size="dialog">
        Secondary
      </Button>
      <Button color="ghostActive" size="dialog">
        Ghost
      </Button>
      <Button color="danger" size="dialog">
        Destructive
      </Button>
      <Button color="ghostAccent" size="dialog">
        Link
      </Button>
      <Button disabled size="dialog">
        Disabled
      </Button>
    </div>
    <div className="gallery-row">
      <Button size="compact">Extra small</Button>
      <Button size="pageAction">Small</Button>
      <Button size="dialog">Default size</Button>
      <Button size="formAction">Large</Button>
      <Button aria-label="Extra small icon" size="compact" uniform>
        +
      </Button>
      <Button aria-label="Small icon" size="iconCircle" uniform>
        +
      </Button>
      <Button aria-label="Icon" size="iconCircleLg" uniform>
        +
      </Button>
      <Button aria-label="Large icon" size="iconTouch" uniform>
        +
      </Button>
    </div>
  </section>
);

const DialogGalleryExample = () => (
  <section>
    <h2>Dialog</h2>
    <Dialog
      size="compact"
      triggerContent={<Button size="dialog">Open dialog</Button>}
    >
      <DialogBody>
        <DialogHeader
          subtitle="A local example."
          title={<DialogTitle className="contents">Example dialog</DialogTitle>}
        />
        <div className="pt-6">
          <DialogFooter>
            <DialogClose render={<Button size="dialog" />}>Close</DialogClose>
          </DialogFooter>
        </div>
      </DialogBody>
    </Dialog>
  </section>
);

const PopoverGalleryExample = () => (
  <section>
    <h2>Popover</h2>
    <Popover>
      <PopoverTrigger render={<Button color="outline" size="dialog" />}>
        Open popover
      </PopoverTrigger>
      <PopoverContent sideOffset={4}>
        <div className="p-3">
          <PopoverTitle>Example popover</PopoverTitle>
          <p>Popover content.</p>
        </div>
      </PopoverContent>
    </Popover>
  </section>
);

const SelectGalleryExample = () => {
  const [value, setValue] = useState("one");

  return (
    <section>
      <h2>Select</h2>
      <Select
        aria-label="Example selection"
        onChange={(option) => {
          setValue(option.value);
        }}
        options={[
          { label: "One", value: "one" },
          { label: "Two", value: "two" },
        ]}
        value={value}
      />
    </section>
  );
};

const TooltipGalleryExample = () => (
  <section>
    <h2>Tooltip</h2>
    <Tooltip>
      <TooltipTrigger render={<Button color="outline" size="dialog" />}>
        Focus or hover
      </TooltipTrigger>
      <TooltipPopup>Additional context</TooltipPopup>
    </Tooltip>
  </section>
);

export {
  ButtonGalleryExample,
  DialogGalleryExample,
  PopoverGalleryExample,
  SelectGalleryExample,
  TooltipGalleryExample,
};

export { SegmentedControlGalleryExample } from "@/examples/segmented-control-examples";

export { SwitchGalleryExample } from "@/examples/switch-examples";

export { ToastGalleryExample } from "@/examples/toast-examples";

const TabsGalleryExample = () => (
  <section>
    <h2>Tabs</h2>
    <Tabs defaultValue="first">
      <TabsList aria-label="Horizontal example">
        <Tab value="first">First</Tab>
        <Tab value="second">Second</Tab>
        <Tab value="disabled" disabled>
          Unavailable
        </Tab>
      </TabsList>
      <TabsPanel value="first">First panel</TabsPanel>
      <TabsPanel value="second">Second panel</TabsPanel>
    </Tabs>
    <Tabs defaultValue="first" orientation="vertical" className="mt-5 flex">
      <TabsList aria-label="Vertical example">
        <Tab value="first">First</Tab>
        <Tab value="second">Second</Tab>
        <Tab value="disabled" disabled>
          Unavailable
        </Tab>
      </TabsList>
      <TabsPanel value="first">First panel</TabsPanel>
      <TabsPanel value="second">Second panel</TabsPanel>
    </Tabs>
  </section>
);

export { TabsGalleryExample };

export { MenuGalleryExample } from "@/examples/menu-examples";
