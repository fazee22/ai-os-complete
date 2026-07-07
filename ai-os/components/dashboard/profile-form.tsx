"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials } from "@/lib/utils";

export function ProfileForm({
  initialName,
  initialImage,
  email,
}: {
  initialName: string;
  initialImage: string | null;
  email: string;
}) {
  const { update } = useSession();
  const [name, setName] = useState(initialName);
  const [image, setImage] = useState(initialImage);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSaveName() {
    setSavingName(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSavingName(false);

    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error ?? "Could not update profile");
      return;
    }

    await update({ name });
    toast.success("Profile updated");
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await fetch("/api/user/avatar", {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    setUploading(false);

    if (!res.ok) {
      toast.error(json.error ?? "Could not upload avatar");
      return;
    }

    setImage(json.image);
    await update({ image: json.image });
    toast.success("Avatar updated");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={image ?? undefined} alt={name} />
            <AvatarFallback className="text-xl">{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload new photo
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              PNG, JPEG, WEBP, or GIF. Max 5MB.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
            <p className="text-xs text-muted-foreground">
              Email changes aren&apos;t supported yet.
            </p>
          </div>
          <Button onClick={handleSaveName} disabled={savingName}>
            {savingName && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
