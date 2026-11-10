import { PreferencesScreen } from "@/components/preferences-screen";

const PreferencesPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string }>;
}) => {
  const { panel } = await searchParams;

  return <PreferencesScreen initialKeyCommands={panel === "key-commands"} />;
};

export default PreferencesPage;
