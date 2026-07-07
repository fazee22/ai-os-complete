import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--primary)/0.18),transparent_60%)]" />

      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>

      <h1 className="max-w-2xl text-balance text-center font-display text-4xl font-semibold tracking-tight sm:text-5xl">
        One place for your notes, tasks, chats, and files.
      </h1>
      <p className="mt-4 max-w-lg text-balance text-center text-muted-foreground">
        AI Personal OS brings your AI chat, notes, tasks, calendar, and files
        into a single, fast workspace.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Button asChild size="lg">
          <Link href="/register">Get started free</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
