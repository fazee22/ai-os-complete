import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-display text-lg font-semibold">
              AI Personal OS
            </span>
          </div>
          {children}
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-primary/5 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.25),transparent_55%),radial-gradient(circle_at_80%_80%,hsl(var(--success)/0.18),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-end p-16">
          <blockquote className="max-w-md text-balance text-2xl font-medium leading-snug text-foreground">
            &ldquo;Everything I work on lives in one calm, fast place now.&rdquo;
          </blockquote>
          <p className="mt-3 text-sm text-muted-foreground">
            Chat, notes, tasks, calendar and files — one workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
