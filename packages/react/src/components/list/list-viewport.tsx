import { cn } from "@workspace/react/lib/utils";
import type { ComponentProps } from "react";

import styles from "./list-viewport.module.css";

/*
 * ListViewport: the
 * scroll box of a summary list. The fade mask and its scroll timeline live in
 * list-viewport.module.css.
 */
const ListViewport = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    {...props}
    className={cn(
      styles.viewport,
      "-mx-2 max-h-52 overflow-x-hidden overflow-y-auto overscroll-contain px-2",
      className
    )}
  />
);

export { ListViewport };
