import { ToolCallGalleryExample } from "@/examples/chat-parts-examples";

import { loadChatPartRecordings } from "../../../../examples/chat-parts-recordings";

const ToolCallPage = async () => (
  <ToolCallGalleryExample recordings={await loadChatPartRecordings()} />
);

export default ToolCallPage;
