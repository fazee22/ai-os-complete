import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  const settings = await prisma.userSettings.upsert({
    where: { userId: session!.user.id },
    update: {},
    create: { userId: session!.user.id },
  });

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your appearance, preferences, and account security.
        </p>
      </div>

      <SettingsForm
        initial={{
          theme: settings.theme,
          language: settings.language,
          notifications: settings.notifications,
          openaiApiKey: settings.openaiApiKey,
          anthropicApiKey: settings.anthropicApiKey,
          groqApiKey: settings.groqApiKey,
          preferredProvider: settings.preferredProvider,
        }}
      />
    </div>
  );
}
