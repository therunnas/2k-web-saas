"use client";

import { Camera, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type AccountUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN";
  username?: string | null;
  avatarDataUrl?: string | null;
};

type ProfileResponse = {
  status: string;
  message?: string;
  user?: AccountUser;
};

function getInitials(name?: string | null) {
  if (!name) return "AD";

  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "AD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getUsernameFromEmail(email?: string | null) {
  if (!email) return "admin";
  return email.split("@")[0] || "admin";
}

function resizeImageToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      reject(new Error("Use uma imagem PNG, JPG ou WEBP."));
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      reject(new Error("A imagem precisa ter no máximo 6 MB."));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 512;

        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Não foi possível processar a imagem."));
          return;
        }

        const sourceSize = Math.min(image.width, image.height);
        const sourceX = Math.floor((image.width - sourceSize) / 2);
        const sourceY = Math.floor((image.height - sourceSize) / 2);

        context.clearRect(0, 0, size, size);
        context.drawImage(
          image,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          size,
          size,
        );

        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };

      image.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
      image.src = String(reader.result);
    };

    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export function ProfileSettings() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [user, setUser] = useState<AccountUser | null>(null);
  const [name, setName] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [avatarChanged, setAvatarChanged] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "danger">("success");

  const initials = useMemo(() => getInitials(name || user?.name), [name, user?.name]);
  const generatedUsername = useMemo(() => getUsernameFromEmail(user?.email), [user?.email]);

  function closeProfile() {
    router.push("/dashboard");
  }

  async function loadProfile() {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/profile", {
        cache: "no-store",
        credentials: "same-origin",
      });

      const json = (await response.json()) as ProfileResponse;

      if (!response.ok || json.status !== "ok" || !json.user) {
        setMessageTone("danger");
        setMessage(json.message ?? "Não foi possível carregar o perfil.");
        return;
      }

      setUser(json.user);
      setName(json.user.name);
      setAvatarDataUrl(json.user.avatarDataUrl ?? null);
      setUsername(json.user.username ?? getUsernameFromEmail(json.user.email));
      setAvatarChanged(false);
    } catch {
      setMessageTone("danger");
      setMessage("Erro ao conectar com a API de perfil.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setMessage(null);

      const nextAvatarDataUrl = await resizeImageToAvatar(file);

      setAvatarDataUrl(nextAvatarDataUrl);
      setAvatarChanged(true);
      setMessageTone("success");
      setMessage("Imagem carregada. Clique em Salvar para aplicar.");
    } catch (error) {
      setMessageTone("danger");
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar a imagem.");
    } finally {
      event.target.value = "";
    }
  }

  function handleFormKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          name,
          username,
          avatarDataUrl,
        }),
      });

      const json = (await response.json()) as ProfileResponse;

      if (!response.ok || json.status !== "ok" || !json.user) {
        setMessageTone("danger");
        setMessage(json.message ?? "Não foi possível salvar o perfil.");
        return;
      }

      setUser(json.user);
      setName(json.user.name);
      setAvatarDataUrl(json.user.avatarDataUrl ?? null);
      setAvatarChanged(false);

      window.dispatchEvent(
        new CustomEvent("profile-updated", {
          detail: {
            name: json.user.name,
            username: json.user.username ?? null,
            avatarDataUrl: json.user.avatarDataUrl ?? null,
          },
        }),
      );

      setMessageTone("success");
      setMessage("Perfil atualizado com sucesso.");

      router.push("/dashboard");
    } catch {
      setMessageTone("danger");
      setMessage("Erro ao conectar com a API de perfil.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/72 px-4 py-6 backdrop-blur-[7px]"
      role="dialog"
      aria-modal="true"
      aria-label="Editar perfil"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.05),transparent_34%),rgba(0,0,0,0.42)]" />

      <form
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        className="relative z-[91] w-full max-w-[520px] rounded-[18px] border border-white/[0.10] bg-[#202124]/96 p-4 shadow-[0_30px_120px_rgba(0,0,0,0.75)] ring-1 ring-white/[0.04] sm:p-5"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-white">
            Editar perfil
          </h1>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/[0.06] text-slate-300 transition hover:bg-white/[0.10] hover:text-white"
            aria-label="Fechar perfil"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Loader2 className="animate-spin text-cyan-300" size={18} />
              Carregando perfil...
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 flex justify-center">
              <div className="relative">
                <div className="flex h-[150px] w-[150px] items-center justify-center overflow-hidden rounded-full border-[3px] border-white/85 bg-[#f49386] text-[54px] font-light tracking-[0.08em] text-white shadow-[0_0_0_4px_rgba(0,0,0,0.45)]">
                  {avatarDataUrl ? (
                    <img
                      src={avatarDataUrl}
                      alt="Foto de perfil"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-4 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-[#2f3034] text-white shadow-lg transition hover:bg-[#3a3b40]"
                  title="Alterar foto de perfil"
                  aria-label="Alterar foto de perfil"
                >
                  <Camera size={17} />
                </button>
              </div>
            </div>

            <div className="mt-9 grid gap-3">
              <label className="block rounded-[6px] border border-white/15 bg-transparent px-3 py-2.5 transition focus-within:border-white/35">
                <span className="block text-[13px] font-semibold text-white/85">
                  Nome de exibição
                </span>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full border-0 bg-transparent p-0 text-[15px] font-medium text-white outline-none placeholder:text-white/30"
                  placeholder="Administrador"
                  maxLength={80}
                />
              </label>

              <label className="block rounded-[6px] border border-white/15 bg-transparent px-3 py-2.5">
                <span className="block text-[13px] font-semibold text-white/85">
                  Nome de usuário
                </span>

                <input
                  value={username || generatedUsername}
                  onChange={(event) => setUsername(event.target.value)}
                  className="mt-1 w-full border-0 bg-transparent p-0 text-[15px] font-medium text-white outline-none placeholder:text-white/30"
                />
              </label>
            </div>

            <p className="mt-4 px-5 text-center text-[13px] leading-relaxed text-white/55">
              Clique no ícone da câmera para escolher uma imagem. Ela será recortada automaticamente como avatar.
            </p>

            {message ? (
              <div
                className={
                  messageTone === "danger"
                    ? "mt-4 rounded-[8px] border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100"
                    : "mt-4 rounded-[8px] border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100"
                }
              >
                {message}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeProfile}
                className="min-h-10 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/80"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="min-h-10 min-w-[92px] rounded-full bg-white px-5 text-sm font-semibold transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                style={{ color: "#050505" }}
              >
                <span style={{ color: "#050505" }}>
                  {saving ? "Salvando..." : "Salvar"}
                </span>
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}