import { notFound } from "next/navigation";
import CoachChatPreview from "@/components/CoachChatPreview";

export default function CoachPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  const modelConfigured = Boolean(openAiApiKey && openAiApiKey !== "your_openai_key_here");
  const modelName = process.env.OPENAI_MODEL?.trim() || "gpt-5.5";

  return (
    <main className="px-5 py-6">
      <CoachChatPreview modelConfigured={modelConfigured} modelName={modelName} />
    </main>
  );
}
