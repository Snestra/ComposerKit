import { AppearanceControl } from "@/components/appearance-control";
import { ButtonGalleryExample } from "@/examples/button-examples";

const ButtonPage = () => (
  <main className="gallery flex flex-col gap-8">
    <header className="flex flex-col gap-3">
      <h1>Button</h1>
      <AppearanceControl id="button-appearance" />
    </header>
    <ButtonGalleryExample />
  </main>
);

export default ButtonPage;
