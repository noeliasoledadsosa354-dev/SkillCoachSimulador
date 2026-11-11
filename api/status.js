export default function handler(_req, res) {
  const key = process.env.GEMINI_API_KEY;
  const configured = Boolean(key && key !== "PEGA_TU_API_KEY_AQUI");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    aiConfigured: configured,
    provider: "Gemini"
  });
}
