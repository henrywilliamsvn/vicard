// Generate ElevenLabs "Adam" voiceovers for the in-app product tour.
//
// WHY: the site tour normally uses the browser's built-in voice. This script
// pre-generates Adam clips so the tour speaks in the same voice as the videos.
//
// HOW TO RUN (Windows PowerShell, from the CardApp folder):
//   $env:ELEVENLABS_API_KEY="sk_your_key"; node scripts/generate-tour-audio.mjs
// Or drop your key in a file the script can find:
//   CardApp\eleven-key.txt   (or it will also look in ..\MeoVideos\eleven-key.txt)
//
// OUTPUT: public/tour-audio/step-0.mp3 … step-3.mp3
// THEN:   upload the public/tour-audio/ folder to GitHub and redeploy.
//         (If the clips are missing the tour just falls back to the browser voice.)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// "Adam" — ElevenLabs default voice. If your account's Adam is a custom/cloned
// voice, replace this ID with the one from ElevenLabs → Voices → Adam → "ID".
const VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam
const MODEL = "eleven_v3"; // matches Henry's playground. If the API rejects v3, change to "eleven_multilingual_v2".
const LANGUAGE = "vi"; // Vietnamese language override (matches the playground)
const STABILITY = 0.5; // 0.0 Creative · 0.5 Natural · 1.0 Robust — match the playground slider

// Keep in sync with DEFAULT_TOUR_STEPS[].body in
// src/components/tour/ProductTour.tsx (order matters → step-0..3).
const STEPS = [
  "Nhập tên sản phẩm hoặc dán link từ Shopee, Lazada, Tiki vào đây để bắt đầu quét ưu đãi nhé!",
  "Hệ thống sẽ gợi ý thẻ có phần trăm hoàn tiền cao nhất. Hãy vào tab 'Ví Thẻ' để chọn những thẻ bạn đang sở hữu nhé!",
  "Đừng quên chọn thêm các kênh tích điểm đối tác (như ShopBack, ví điện tử) để chồng thêm nhiều tầng giảm giá cùng lúc.",
  "Chưa muốn mua ngay? Đặt mức giá bạn mong muốn tại đây. MeoSanSales sẽ thông báo ngay khi giá chạm sàn để bạn vào chốt đơn!",
];

function readKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const candidates = [
    path.join(ROOT, "eleven-key.txt"),
    path.resolve(ROOT, "..", "MeoVideos", "eleven-key.txt"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return fs.readFileSync(c, "utf8").trim();
  }
  throw new Error(
    "No ElevenLabs API key found. Set ELEVENLABS_API_KEY, or create CardApp\\eleven-key.txt."
  );
}

async function main() {
  const key = readKey();
  const outDir = path.join(ROOT, "public", "tour-audio");
  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < STEPS.length; i++) {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: STEPS[i],
          model_id: MODEL,
          language_code: LANGUAGE,
          voice_settings: { stability: STABILITY, similarity_boost: 0.75 },
        }),
      }
    );
    if (!res.ok) {
      console.error(`Step ${i} failed: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(path.join(outDir, `step-${i}.mp3`), buf);
    console.log(`✓ step-${i}.mp3 (${buf.length} bytes)`);
  }
  console.log("\nDone. Upload public/tour-audio/ to GitHub and redeploy.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
