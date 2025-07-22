import axios from "axios";

const keys = [
  "AIzaSyDqWjnjux0zzPIYiRpaSSDvg-4HrwnWjko", // backup 3
  "AIzaSyBteEijrByy0dj71lZfJukh2ob9Kd2J3dU", // eduwire
  "AIzaSyBFxOTr9HvI4JWsCceDxVIVSiQKn30XHvE", //educonds
  "AIzaSyAOygVX4Lc6JBEqPxMtWe2FMWVTOAhankM", // backup 2
  "AIzaSyBkrbeSICamobucK0Pr-OCpb3RVyiSQRq0", // shreya
  "AIzaSyDPVAEBlwI_votV9jlClNl2E9nb2qJFbPw", // arya 1
  "AIzaSyCTm2JaYYiI84KA2Gd1u8I7BR8DmeJed_o", // arya 2
  "AIzaSyATwIVFcgzAhmItK27YDm0km89_sMYRwZM", // cooldude
  "AIzaSyA46kGpd-0ZP3nm6J8g3VQ3KFZjESmJa1E", // yashjjaain
  "AIzaSyBO712mMFObZPJ0dY-CMJ5g9nM03R8K82w", // jain family
  "AIzaSyCvGNXgWtofAhl5iSgysvaD_L8d5MX5SCo", // yaashjainn
];

export const fetchGeminiData = async (id) => {
  const prompt = `Search the websites and provide detailed and exact information for the ACGME ${id}. For the key "nrmpProgramCode", search primarily on site:freida.ama-assn.org. Fill the following JSON only, no extra text:

{
  "state": "",
  "city": "",
  "program_name": "",
  "accreditation_id": "",
  "specialty": "",
  "nrmpProgramCode": "",
  "programCode": "",
  "Program location": "",
  "Website address": ""
}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }, { url_context: {} }],
  };

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${key}`;

    console.log(`🔑 Trying Gemini key ${i + 1} of ${keys.length}...`);

    try {
      const response = await axios.post(url, body);

      const rawText =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      const cleanedText = rawText
        .replace(/```/g, "")
        .replace(/json/g, "")
        .trim();

      let parsed = {};
      try {
        parsed = JSON.parse(cleanedText);
      } catch (jsonErr) {
        console.error(
          "❌ Failed to parse Gemini response as JSON",
          jsonErr.message
        );
      }

      console.log(`✅ Gemini success with key ${i + 1}`);
      return parsed;
    } catch (err) {
      const code = err?.response?.status;
      const message = err?.response?.data?.error?.message || err.message;

      console.warn(`⚠️ Key ${i + 1} failed: ${message}`);

      // If it's not a quota/rate-limit error, don't try other keys
      if (code !== 429) {
        console.error(
          "❌ Non-retryable Gemini error:",
          err.response?.data || err.message
        );
        break;
      }
    }
  }

  console.error("❌ All Gemini keys failed or quota exhausted.");
  return {};
};
