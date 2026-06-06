"use client";
import { useState, useRef } from "react";
import { Upload, Video, Image as ImageIcon, X } from "lucide-react";
import toast from "react-hot-toast";

/**
 * CloudinaryUpload — shared file upload component for the Kryros Admin Panel.
 *
 * Uploads ALL files (images AND videos, any size) directly to Cloudinary
 * from the browser — files NEVER pass through the Next.js or NestJS server.
 *
 * Usage (single):
 *   <CloudinaryUpload
 *     value={imageUrl}
 *     onChange={(url) => setImageUrl(url)}
 *     folder="kryros/categories"
 *   />
 *
 * Usage (multiple — products):
 *   <CloudinaryUpload
 *     multiple
 *     onChange={(url) => setImages(imgs => [...imgs, url])}
 *     folder="kryros/products"
 *     showUrlInput={false}
 *   />
 */
export interface CloudinaryUploadProps {
  value?: string;
  onChange?: (url: string, filename?: string) => void;
  onUrlChange?: (url: string) => void;
  accept?: string;
  multiple?: boolean;
  folder?: string;
  showUrlInput?: boolean;
  isDark?: boolean;
  border?: string;
  surface?: string;
  textMuted?: string;
  textMain?: string;
}

export default function CloudinaryUpload({
  value = "",
  onChange,
  onUrlChange,
  accept = "image/*,video/*",
  multiple = false,
  folder = "kryros/general",
  showUrlInput = true,
  isDark = true,
  border = "#1E293B",
  surface = "#101826",
  textMuted = "#8E9AAF",
  textMain = "#FFFFFF",
}: CloudinaryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ name: string; type: string; url: string } | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  // ── Direct-to-Cloudinary upload ──────────────────────────────────────────
  async function uploadToCloudinary(file: File): Promise<string> {
    const encodedFolder = encodeURIComponent(folder);
    // Use the BFF route — it reads the httpOnly kryros_token cookie and
    // forwards the request to the backend with proper Authorization header.
    const sigRes = await fetch(`/api/bff/cloudinary-sign?folder=${encodedFolder}`);
    if (!sigRes.ok) throw new Error("Could not get upload signature");
    const { signature, timestamp, cloudName, apiKey, folder: signedFolder } = await sigRes.json();

    const resourceType = file.type.startsWith("video/") ? "video" : "image";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", signedFolder);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      { method: "POST", body: formData }
    );
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error((err as any)?.error?.message || "Cloudinary upload failed");
    }
    const data = await uploadRes.json();
    return (data as any).secure_url;
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;
    e.target.value = "";

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const label = files.length > 1 ? ` (${i + 1}/${files.length})` : "";
        setUploadProgress(
          file.type.startsWith("video/")
            ? `Uploading video${label}...`
            : `Uploading image${label}...`
        );
        const url = await uploadToCloudinary(file);
        onChange?.(url, file.name);
        onUrlChange?.(url);
        // Update preview for single-file mode
        if (!multiple) {
          const isVideo = file.type.startsWith("video/");
          setPreview({ name: file.name, type: isVideo ? "video" : "image", url });
          setUrlInput("");
        }
        if (files.length === 1) toast.success(`${file.name} uploaded!`);
      }
      if (files.length > 1) toast.success(`${files.length} files uploaded!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed. Please try again.";
      toast.error(msg);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  // ── URL paste handling ───────────────────────────────────────────────────
  const getYouTubeId = (url: string): string | null => {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([-\w]{11})/);
    return m ? m[1] : null;
  };

  const handleUrlChange = (url: string) => {
    setUrlInput(url);
    if (!url.trim()) { setPreview(null); onChange?.("", ""); onUrlChange?.(""); return; }
    const ytId = getYouTubeId(url);
    if (ytId) {
      const thumbUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      setPreview({ name: "YouTube Video", type: "image", url: thumbUrl });
      onChange?.(url, url);
      onUrlChange?.(url);
      return;
    }
    const isVideo = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i.test(url);
    setPreview({ name: url, type: isVideo ? "video" : "image", url });
    onChange?.(url, url);
    onUrlChange?.(url);
  };

  const clearAll = () => {
    setPreview(null);
    setUrlInput("");
    onChange?.("", "");
    onUrlChange?.("");
  };

  // Use passed-in value for display if no local preview
  const displayUrl = preview?.url || value;
  const displayType = preview?.type || (displayUrl && /\.(mp4|mov|webm|ogg)(\?.*)?$/i.test(displayUrl) ? "video" : "image");

  return (
    <div>
      {/* Preview — only in single-file mode */}
      {!multiple && displayUrl && (
        <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", marginBottom: "8px", border: `1px solid ${border}` }}>
          {displayType === "image"
            ? <img src={displayUrl} alt="" style={{ width: "100%", maxHeight: "180px", objectFit: "cover", display: "block" }} onError={(e: any) => { e.target.style.opacity = "0.3"; }} />
            : <video src={displayUrl} controls style={{ width: "100%", maxHeight: "180px", display: "block" }} />
          }
          <div style={{ position: "absolute", top: 8, right: 8 }}>
            <button onClick={clearAll} style={{ width: "26px", height: "26px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={13} color="white" />
            </button>
          </div>
          <div style={{ padding: "6px 10px", background: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.9)", fontSize: "11px", color: textMuted, display: "flex", alignItems: "center", gap: "6px" }}>
            {displayType === "video" ? <Video size={11} /> : <ImageIcon size={11} />}
            {(preview?.name || value).startsWith("data:") ? "Uploaded file" : (preview?.name || value).slice(0, 50)}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={() => { if (!uploading) inputRef.current?.click(); }}
        style={{ border: `2px dashed ${uploading ? "#1FA89A" : border}`, borderRadius: "10px", padding: "16px", textAlign: "center", cursor: uploading ? "default" : "pointer", background: surface, transition: "border-color 0.15s", marginBottom: "8px" }}
        onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = "#1FA89A"; }}
        onMouseLeave={e => { if (!uploading) e.currentTarget.style.borderColor = border; }}
      >
        {uploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", padding: "4px 0" }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid rgba(31,168,154,0.2)", borderTopColor: "#1FA89A", borderRadius: "50%", animation: "cwSpin 0.8s linear infinite" }} />
            <p style={{ fontSize: "12px", color: "#1FA89A", margin: 0, fontWeight: 600 }}>{uploadProgress || "Uploading..."}</p>
            <style>{`@keyframes cwSpin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(31,168,154,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Upload size={16} color="#1FA89A" />
              </div>
              {accept.includes("video") && (
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Video size={16} color="#6366f1" />
                </div>
              )}
            </div>
            <p style={{ fontSize: "13px", color: textMuted, margin: "0 0 2px" }}>
              <span style={{ color: "#1FA89A", fontWeight: 600 }}>Click to upload</span>
              {accept.includes("video") ? " image or video" : " image"}
              {multiple ? " (multiple)" : ""}
            </p>
            <p style={{ fontSize: "11px", color: textMuted, margin: 0 }}>
              {accept.includes("video") ? "PNG, JPG, GIF, MP4, MOV — any size" : "PNG, JPG, GIF, WEBP — any size"}
            </p>
          </>
        )}
      </div>

      {/* URL paste input */}
      {showUrlInput && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <div style={{ flex: 1, height: "1px", background: border }} />
            <span style={{ fontSize: "10px", color: textMuted, fontWeight: 500, whiteSpace: "nowrap" }}>OR PASTE URL</span>
            <div style={{ flex: 1, height: "1px", background: border }} />
          </div>
          <input
            type="text"
            value={urlInput}
            onChange={e => handleUrlChange(e.target.value)}
            placeholder="Paste image URL, video URL, or YouTube link"
            style={{ width: "100%", padding: "8px 10px", borderRadius: "7px", background: surface, border: `1px solid ${border}`, color: textMuted, fontSize: "12px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
        </>
      )}

      <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleFile} style={{ display: "none" }} />
    </div>
  );
}
