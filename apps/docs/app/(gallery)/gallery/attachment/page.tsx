import { AttachmentGalleryExample } from "@/examples/chat-parts-examples";

import { loadChatPartRecordings } from "../../../../examples/chat-parts-recordings";

const AttachmentPage = async () => (
  <AttachmentGalleryExample recordings={await loadChatPartRecordings()} />
);

export default AttachmentPage;
