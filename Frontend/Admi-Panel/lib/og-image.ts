export async function fetchCustomUIScreenImage(): Promise<Response | null> {
  const projectId = process.env.NEXT_PUBLIC_UI_PROJECT_ID;
  if (!projectId) return null;
  try {
    const codewordsUrl = process.env.NEXT_PUBLIC_CODEWORDS_APP_URL || "https://codewords.agemo.ai";
    const res = await fetch(
      `${codewordsUrl}/api/custom-ui/screen/${projectId}`
    );
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/png";
    const buffer = await res.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: { "Content-Type": contentType },
    });
  } catch {
    return null;
  }
}
