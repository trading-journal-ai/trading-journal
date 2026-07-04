import CoachChatPreview from "@/components/CoachChatPreview";

export default function CoachPage() {
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  const modelConfigured = Boolean(openAiApiKey && openAiApiKey !== "your_openai_key_here");
  const modelName = process.env.OPENAI_MODEL?.trim() || "gpt-5.5";

  return <CoachChatPreview modelConfigured={modelConfigured} modelName={modelName} />;
}
