"use client";

import AvatarUpload from "@/components/AvatarUpload";

type Props = {
  profileId: string;
  currentUrl?: string | null;
};

export default function ProfileAvatarSection({ profileId, currentUrl }: Props) {
  return (
    <div className="card p-4 mb-6">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        Foto de perfil
      </h2>
      <div className="flex items-center gap-4">
        <AvatarUpload
          currentUrl={currentUrl}
          entityType="profile"
          entityId={profileId}
          size={72}
        />
        <div className="text-sm text-gray-500">
          <p>Haz clic para cambiar la foto.</p>
          <p className="text-xs text-gray-400 mt-1">Formatos: JPG, PNG, WebP. Máximo 2MB.</p>
        </div>
      </div>
    </div>
  );
}
