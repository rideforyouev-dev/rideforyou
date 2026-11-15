// Payload matches the existing rental admin's src/utils/whatsapp.js sender.
export function marketingConfig(env = process.env) {
  const config = {
    endpoint: env.WAY2CHATS_URL || "https://app.way2chats.com/api/v2/whatsapp-business/messages",
    key: env.WAY2CHATS_API_KEY,
    phoneId: env.WAY2CHATS_PHONE_ID,
    textTemplate: env.WAY2CHATS_MARKETING_TEXT_TEMPLATE || "custom_broadcast",
    imageTemplate: env.WAY2CHATS_MARKETING_IMAGE_TEMPLATE || "custom_broadcast_media",
    language: env.WAY2CHATS_MARKETING_LANGUAGE || "en_GB",
    origin: env.PUBLIC_ORIGIN,
    basePath: env.BASE_PATH || "",
    test: env.NODE_ENV === "test",
  };
  const reasons = [];
  if (!config.key || !config.phoneId) reasons.push("WhatsApp sender credentials are missing.");
  try {
    const endpoint = new URL(config.endpoint);
    if (endpoint.protocol !== "https:" && !(config.test && endpoint.hostname === "127.0.0.1")) throw Error();
  } catch { reasons.push("The WhatsApp provider endpoint must use HTTPS."); }
  config.ready = reasons.length === 0;
  try {
    const origin = new URL(config.origin);
    config.mediaReady = origin.origin === config.origin && (origin.protocol === "https:" || (config.test && origin.hostname === "127.0.0.1"));
  } catch { config.mediaReady = false; }
  config.reasons = reasons;
  return config;
}

export async function sendMarketing(config, recipient, campaign) {
  const body = {
    to: recipient.phone.slice(1), phoneNoId: config.phoneId, type: "template",
    name: campaign.template, language: campaign.language,
    bodyParams: [recipient.name, campaign.message],
    ...(campaign.image_id ? { headerParams: [{ type: "image", url: `${config.origin}${config.basePath}/campaign-media/${campaign.image_id}` }] } : {}),
  };
  try {
    const response = await fetch(config.endpoint, {
      method: "POST", redirect: "error",
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => null);
    // A timeout, a 5xx or an unrecognised response may have sent the message.
    // Never automatically retry an ambiguous outcome.
    if (response.status >= 500) return { status: "unknown", detail: "Provider error. Check WhatsApp logs before sending again." };
    if (!response.ok || result?.error || result?.success === false || ["error", "failed"].includes(result?.status))
      return { status: "failed", detail: `Provider rejected the message (HTTP ${response.status}). Check the template and account.` };
    const id = result?.id || result?.messages?.[0]?.id || result?.data?.id;
    if (!id || typeof id !== "string") return { status: "unknown", detail: "No message ID returned. Check provider logs; do not resend automatically." };
    return { status: "accepted", providerId: id, detail: "Accepted by provider. Handset delivery is not yet confirmed." };
  } catch {
    return { status: "unknown", detail: "Connection interrupted. Delivery is uncertain; check provider logs before resending." };
  }
}
