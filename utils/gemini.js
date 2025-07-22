import axios from "axios";

export const fetchGeminiData = async (id) => {
  const prompt = `Search the websites and provide detailed and exact information for the ACGME ${id}. For the key "nrmpProgramCode", search primarily on site:freida.ama-assn.org. Fill the following JSON only, no extra text:\n\n{\n  "state": "",\n  "city": "",\n  "program_name": "",\n  "accreditation_id": "",\n  "specialty": "",\n  "nrmpProgramCode": "",\n  "programCode": "",\n  "Program location": "",\n  "Website address": ""\n}`;

  const response = await axios.post(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=AIzaSyCvGNXgWtofAhl5iSgysvaD_L8d5MX5SCo",
    {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }, { url_context: {} }],
    }
  );

  const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  console.log(text.replace(/```/g, "").replace(/json/g, ""));
  return JSON.parse(text.replace(/```/g, "").replace(/json/g, ""));
};
