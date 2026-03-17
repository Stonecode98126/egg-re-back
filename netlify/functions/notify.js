// netlify/functions/notify.js
// 部署後 URL: https://你的網站.netlify.app/.netlify/functions/notify

export default async (req) => {
  // 只接受 POST
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // CORS headers（讓你的前端網站可以呼叫）
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers });
  }

  const { name, phone, email, message } = body;

  // 組成 LINE 訊息內容
  const lineMessage = [
    "📩 新客戶訊息",
    "─────────────",
    `姓名：${name || "（未填）"}`,
    `電話：${phone || "（未填）"}`,
    `Email：${email || "（未填）"}`,
    "─────────────",
    `留言：\n${message || "（無內容）"}`,
  ].join("\n");

  // 呼叫 LINE Messaging API
  const lineRes = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // LINE_CHANNEL_ACCESS_TOKEN 設定在 Netlify 環境變數
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      // LINE_ADMIN_USER_ID 設定在 Netlify 環境變數
      to: process.env.LINE_ADMIN_USER_ID,
      messages: [{ type: "text", text: lineMessage }],
    }),
  });

  if (!lineRes.ok) {
    const errText = await lineRes.text();
    console.error("LINE API error:", errText);
    return new Response(
      JSON.stringify({ error: "LINE 發送失敗，請檢查 Token 或 User ID" }),
      { status: 500, headers }
    );
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};

// 告訴 Netlify 用新版 Edge Functions 格式（Node 18+）
export const config = { path: "/api/notify" };
