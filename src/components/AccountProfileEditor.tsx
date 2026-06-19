"use client";
import { useState } from "react";
import { updateProfile } from "@/lib/actions";

const AVATAR_COLORS = [
  { name: "sky", bg: "bg-sky-500" },
  { name: "emerald", bg: "bg-emerald-500" },
  { name: "violet", bg: "bg-violet-500" },
  { name: "amber", bg: "bg-amber-500" },
  { name: "rose", bg: "bg-rose-500" },
  { name: "slate", bg: "bg-slate-600" },
] as const;

type ColorName = (typeof AVATAR_COLORS)[number]["name"];

function colorBg(name: string): string {
  return AVATAR_COLORS.find((c) => c.name === name)?.bg ?? "bg-sky-500";
}

interface Props {
  initialDisplayName: string;
  initialAvatarColor: string;
  email: string;
}

export function AccountProfileEditor({ initialDisplayName, initialAvatarColor, email }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarColor, setAvatarColor] = useState<ColorName>(
    (AVATAR_COLORS.find((c) => c.name === initialAvatarColor)?.name ?? "sky") as ColorName
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const initials = (displayName.trim() || email).slice(0, 2).toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const result = await updateProfile(displayName, avatarColor);
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <div className="px-5 py-5 border-t border-slate-100">
      <p className="text-sm font-semibold text-slate-900 mb-4">Profile</p>

      <div className="flex items-center gap-4 mb-5">
        <div
          className={`flex-shrink-0 w-14 h-14 rounded-full ${colorBg(avatarColor)} flex items-center justify-center text-white font-bold text-lg select-none`}
        >
          {initials}
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-2">Choose a color</p>
          <div className="flex gap-2">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => setAvatarColor(c.name)}
                aria-label={c.name}
                className={`w-7 h-7 rounded-full ${c.bg} transition-transform ${
                  avatarColor === c.name
                    ? "scale-125 ring-2 ring-offset-1 ring-slate-400"
                    : "hover:scale-110"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Display name <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={email}
          maxLength={40}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {saveError && (
        <p className="text-xs text-red-600 mb-3">{saveError}</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-700 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
      </button>
    </div>
  );
}
