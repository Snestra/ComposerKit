import { ReasoningGalleryExample } from "@/examples/chat-parts-examples";

import { loadChatPartRecordings } from "../../../../examples/chat-parts-recordings";

const ReasoningPage = async () => (
  <ReasoningGalleryExample recordings={await loadChatPartRecordings()} />
);

export default ReasoningPage;
