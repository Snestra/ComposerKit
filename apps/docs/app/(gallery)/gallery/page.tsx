import { ComponentGallery } from "@/components/component-gallery";
import {
  ButtonGalleryExample,
  DialogGalleryExample,
  MenuGalleryExample,
  PopoverGalleryExample,
  SegmentedControlGalleryExample,
  SelectGalleryExample,
  SwitchGalleryExample,
  TabsGalleryExample,
  TooltipGalleryExample,
} from "@/examples/control-examples";
import {
  ChatComposerGalleryExample,
  ChatThreadGalleryExample,
} from "@/examples/conversation-examples";
import { ToastGalleryExample } from "@/examples/toast-examples";

const GalleryPage = () => (
  <ComponentGallery>
    <ButtonGalleryExample />
    <DialogGalleryExample />
    <MenuGalleryExample />
    <PopoverGalleryExample />
    <SelectGalleryExample />
    <SwitchGalleryExample />
    <TooltipGalleryExample />
    <SegmentedControlGalleryExample />
    <TabsGalleryExample />
    <ToastGalleryExample withProvider={false} />
    <ChatComposerGalleryExample />
    <ChatThreadGalleryExample />
  </ComponentGallery>
);

export default GalleryPage;
