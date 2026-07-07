"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SettingsData = {
  theme: string;
  language: string;
  notifications: boolean;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  groqApiKey: string | null;
  preferredProvider: string;
};

export function SettingsForm({ initial }: { initial: SettingsData }) {
  const { setTheme } = useTheme();
  const [language, setLanguage] = useState(initial.language);
  const [notifications, setNotifications] = useState(initial.notifications);
  const [openaiApiKey, setOpenaiApiKey] = useState(initial.openaiApiKey ?? "");
  const [anthropicApiKey, setAnthropicApiKey] = useState(initial.anthropicApiKey ?? "");
  const [groqApiKey, setGroqApiKey] = useState(initial.groqApiKey ?? "");
  const [preferredProvider, setPreferredProvider] = useState(initial.preferredProvider);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveSettings(patch: Partial<SettingsData>) {
    const res = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error ?? "Could not save settings");
      return false;
    }
    return true;
  }

  async function handlePreferencesSave() {
    setSavingPrefs(true);
    const ok = await saveSettings({ language, notifications });
    setSavingPrefs(false);
    if (ok) toast.success("Preferences saved");
  }

  async function handleThemeChange(value: string) {
    setTheme(value);
    await saveSettings({ theme: value as "light" | "dark" | "system" });
  }

  async function handleKeysSave() {
    setSavingKeys(true);
    const ok = await saveSettings({ openaiApiKey, anthropicApiKey, groqApiKey, preferredProvider });
    setSavingKeys(false);
    if (ok) toast.success("API keys saved");
  }

  async function handlePasswordChange() {
    setSavingPassword(true);
    const res = await fetch("/api/user/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    setSavingPassword(false);

    if (!res.ok) {
      toast.error(json.error ?? "Could not change password");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    toast.success("Password changed");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how AI Personal OS looks on this device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <Select defaultValue={initial.theme} onValueChange={handleThemeChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ur">Urdu</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium">Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get notified about reminders and task due dates.
              </p>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>

          <Button onClick={handlePreferencesSave} disabled={savingPrefs}>
            {savingPrefs && <Loader2 className="h-4 w-4 animate-spin" />}
            Save preferences
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>
            Used for AI Chat and other AI features. Stored per-account; never exposed to the browser after saving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>AI Chat provider</Label>
            <Select value={preferredProvider} onValueChange={setPreferredProvider}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="groq">Groq (free)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="openai-key">OpenAI API key</Label>
            <Input
              id="openai-key"
              type="password"
              placeholder="sk-..."
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anthropic-key">Anthropic API key</Label>
            <Input
              id="anthropic-key"
              type="password"
              placeholder="sk-ant-..."
              value={anthropicApiKey}
              onChange={(e) => setAnthropicApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="groq-key">Groq API key (free)</Label>
            <Input
              id="groq-key"
              type="password"
              placeholder="gsk_..."
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get a free key at{" "}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                console.groq.com/keys
              </a>{" "}
              — no billing required.
            </p>
          </div>
          <Button onClick={handleKeysSave} disabled={savingKeys}>
            {savingKeys && <Loader2 className="h-4 w-4 animate-spin" />}
            Save API keys
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Change your password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button
            onClick={handlePasswordChange}
            disabled={savingPassword || !currentPassword || !newPassword}
          >
            {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            Change password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
