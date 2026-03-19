// netlify/functions/notify.js

export default async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  // LINE Webhook 驗證（Verify 按鈕會送 GET）
  if (req.method === "GET") {
    return new Response("OK", { status: 200, headers });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers });
  }

  // LINE Webhook 送來的格式會有 body.events
  if (body.events) {
    for (const event of body.events) {
      if (event.type !== "message") continue;

      const senderUserId = event.source?.userId ?? "未知";
      const msgText =
        event.message?.type === "text"
          ? event.message.text
          : `[非文字訊息：${event.message?.type}]`;

      const lineMessage = [
        "📩 接單小哥收到新訊息",
        "─────────────",
        `來自 userId：${senderUserId}`,
        `內容：${msgText}`,
      ].join("\n");

      await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: process.env.LINE_ADMIN_USER_ID,
          messages: [{ type: "text", text: lineMessage }],
        }),
      });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  // 表單送出通知
  const { name, phone, email, message } = body;

  const lineMessage = [
    "📋 新訂單通知",
    "─────────────",
    `姓名：${name || "（未填）"}`,
    `電話：${phone || "（未填）"}`,
    `Email：${email || "（未填）"}`,
    "─────────────",
    `內容：\n${message || "（無內容）"}`,
  ].join("\n");

  const lineRes = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: process.env.LINE_ADMIN_USER_ID,
      messages: [{ type: "text", text: lineMessage }],
    }),
  });

  if (!lineRes.ok) {
    const errText = await lineRes.text();
    console.error("LINE API error:", errText);
    return new Response(
      JSON.stringify({ error: "LINE 發送失敗" }),
      { status: 500, headers }
    );
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};

export const config = { path: "/api/notify" };
```

貼上後記得 Webhook URL 要填完整網址，例如：
```
https://egg-re-back.netlify.app/.netlify/functions/notify
