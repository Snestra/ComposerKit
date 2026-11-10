"use client";

import {
  CheckIcon,
  CloseIcon,
  SearchIcon,
  StatusBadgeIcon,
} from "composerkit/components/icon";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface IconFacts {
  ariaHidden: string;
  ariaLabel: string;
  ariaLabelledBy: string;
  focusable: string;
  ids: string[];
  paint: string;
  role: string;
}

const none = "(absent)";

const readFacts = (svg: SVGSVGElement): IconFacts => ({
  ariaHidden: svg.getAttribute("aria-hidden") ?? none,
  ariaLabel: svg.getAttribute("aria-label") ?? none,
  ariaLabelledBy: svg.getAttribute("aria-labelledby") ?? none,
  focusable: svg.getAttribute("focusable") ?? none,
  ids: [...svg.querySelectorAll("[id]")].map((element) => element.id),
  paint: svg.dataset.iconP3 ?? none,
  role: svg.getAttribute("role") ?? none,
});

/** Reads the attributes the rendered svg actually carries. */
const useIconFacts = () => {
  const ref = useRef<HTMLSpanElement>(null);
  const [facts, setFacts] = useState<IconFacts | null>(null);

  useEffect(() => {
    const svg = ref.current?.querySelector("svg");

    if (svg) {
      setFacts(readFacts(svg));
    }
  }, []);

  return { facts, ref };
};

const IconRow = ({
  children,
  hidden = false,
  label,
}: {
  children: ReactNode;
  hidden?: boolean;
  label: string;
}) => {
  const { facts, ref } = useIconFacts();

  return (
    <tr className="border-b align-middle">
      <th className="py-2 pe-3 text-start font-medium" scope="row">
        {label}
      </th>
      <td className="py-2 pe-3">
        <span
          className={hidden ? "hidden" : "inline-flex size-8 items-center"}
          ref={ref}
        >
          {children}
        </span>
      </td>
      <td className="py-2 pe-3">{facts?.ariaHidden}</td>
      <td className="py-2 pe-3">{facts?.role}</td>
      <td className="py-2 pe-3">{facts?.ariaLabel}</td>
      <td className="py-2 pe-3">{facts?.ariaLabelledBy}</td>
      <td className="py-2 pe-3">{facts?.paint}</td>
      <td className="py-2 break-all" data-testid="icon-ids">
        {facts?.ids.join(" ")}
      </td>
    </tr>
  );
};

const recolored =
  "[--status-badge-end:var(--ck-palette-accent-purple)] [--status-badge-start:var(--ck-palette-decoration-deleted)]";

const IconExample = () => (
  <section
    aria-labelledby="icons-heading"
    className="flex flex-col gap-3"
    id="icons"
  >
    <h2 className="text-title-md font-semibold" id="icons-heading">
      Icons
    </h2>
    <p className="text-sm text-muted-foreground">
      Each row is a live icon instance. The columns are read from the rendered
      svg: an icon is hidden from assistive technology until it has a label, and
      a multicolor icon carries data-icon-p3 and gives every instance its own
      gradient and clip path ids.
    </p>
    <div className="overflow-x-auto">
      <table className="w-full min-w-3xl border-collapse text-xs">
        <thead>
          <tr className="border-b text-start text-muted-foreground">
            <th className="py-2 pe-3 text-start font-medium" scope="col">
              Instance
            </th>
            <th className="py-2 pe-3 text-start font-medium" scope="col">
              Icon
            </th>
            <th className="py-2 pe-3 text-start font-medium" scope="col">
              aria-hidden
            </th>
            <th className="py-2 pe-3 text-start font-medium" scope="col">
              role
            </th>
            <th className="py-2 pe-3 text-start font-medium" scope="col">
              aria-label
            </th>
            <th className="py-2 pe-3 text-start font-medium" scope="col">
              aria-labelledby
            </th>
            <th className="py-2 pe-3 text-start font-medium" scope="col">
              data-icon-p3
            </th>
            <th className="py-2 text-start font-medium" scope="col">
              ids inside the svg
            </th>
          </tr>
        </thead>
        <tbody>
          <IconRow label="Decorative">
            <CheckIcon />
          </IconRow>
          <IconRow label="aria-label">
            <SearchIcon aria-label="Search" />
          </IconRow>
          <IconRow label="aria-labelledby">
            <CloseIcon aria-labelledby="icons-heading" />
          </IconRow>
          <IconRow label="Role overridden">
            <CheckIcon role="presentation" />
          </IconRow>
          <IconRow label="aria-hidden overridden">
            <SearchIcon aria-hidden={false} aria-label="Visible to readers" />
          </IconRow>
          <IconRow label="Multicolor, first">
            <StatusBadgeIcon aria-label="Done" />
          </IconRow>
          <IconRow label="Multicolor, second">
            <StatusBadgeIcon />
          </IconRow>
          <IconRow hidden label="Multicolor, third (not displayed)">
            <StatusBadgeIcon />
          </IconRow>
          <IconRow label="Multicolor, recolored by variables">
            <StatusBadgeIcon className={recolored} />
          </IconRow>
        </tbody>
      </table>
    </div>
    <p className="text-sm text-muted-foreground">
      The third multicolor instance is not displayed. The first two still paint
      their gradient because no id is shared with it. Every id in the last
      column is different.
    </p>
  </section>
);

export { IconExample };
