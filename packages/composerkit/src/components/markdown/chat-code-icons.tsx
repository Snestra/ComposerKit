import {
  Check,
  Code,
  Copy,
  Maximize2,
  MoveRight,
  WrapText,
} from "lucide-react";
import type { ComponentProps } from "react";

export const ChatCodeIcon = (props: ComponentProps<"svg">) => (
  <Code width="1em" height="1em" strokeWidth={1.5} {...props} />
);

export const ChatCodeCopyIcon = (props: ComponentProps<"svg">) => (
  <Copy width="1em" height="1em" strokeWidth={1.5} {...props} />
);

export const ChatCodeCheckIcon = (props: ComponentProps<"svg">) => (
  <Check width="1em" height="1em" strokeWidth={1.5} {...props} />
);

export const ChatCodeWrapOnIcon = (props: ComponentProps<"svg">) => (
  <WrapText width="1em" height="1em" strokeWidth={1.5} {...props} />
);

export const ChatCodeWrapOffIcon = (props: ComponentProps<"svg">) => (
  <MoveRight width="1em" height="1em" strokeWidth={1.5} {...props} />
);

export const ChatTableExpandIcon = (props: ComponentProps<"svg">) => (
  <Maximize2 width="1em" height="1em" strokeWidth={1.5} {...props} />
);

export const ChatTableExpandIconLarge = (props: ComponentProps<"svg">) => (
  <Maximize2 width="1em" height="1em" strokeWidth={1.5} {...props} />
);
