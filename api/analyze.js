const DEFAULT_MODEL = "gemini-2.5-flash";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "PEGA_TU_API_KEY_AQUI") {
    return res.status(503).json({
      error: "Falta configurar GEMINI_API_KEY como variable privada del servidor."
    });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const { profile = {}, questions = [], answers = [] } = req.body || {};

  if (!Array.isArray(questions) || !Array.isArray(answers) ||
      questions.length > 15 || answers.length > 15) {
    return res.status(400).json({ error: "Los datos de la entrevista no son válidos." });
  }

  const transcript = questions.map((question, i) => ({
    pregunta: String(question).slice(0, 1200),
    respuesta: String(answers[i] || "").slice(0, 4000)
  }));

  const prompt = `Sos SkillCoach AR, un orientador de entrevistas laborales. Evaluá las respuestas con criterio constructivo, respetuoso y específico para el puesto. No inventes experiencias ni atribuyas habilidades que no aparecen. No evalúes personalidad, emociones, apariencia, acento ni lenguaje corporal. Considerá que una respuesta breve puede ser válida si responde bien. No penalices a la persona por no tener experiencia laboral; valorá ejemplos académicos, voluntariado o proyectos si aparecen. Devolvé SOLO JSON válido, sin Markdown ni bloques de código, con esta estructura:
{
 "resumen":"máximo 80 palabras",
 "fortalezas":["hasta 3 observaciones concretas"],
 "mejoras":["hasta 4 mejoras concretas"],
 "recomendaciones":["hasta 4 acciones prácticas"],
 "plan5dias":[
  {"dia":"Día 1","titulo":"...","actividad":"..."},
  {"dia":"Día 2","titulo":"...","actividad":"..."},
  {"dia":"Día 3","titulo":"...","actividad":"..."},
  {"dia":"Día 4","titulo":"...","actividad":"..."},
  {"dia":"Día 5","titulo":"...","actividad":"..."}
 ]
}
Usá español rioplatense claro. Si hay respuestas vacías, indicá que faltó información y no inventes contenido.

Datos de la entrevista:
${JSON.stringify({
  perfil: {
    carrera: String(profile.career || "").slice(0, 200),
    puesto: String(profile.job || "").slice(0, 200),
    experiencia: String(profile.experience || "").slice(0, 100),
    dificultad: String(profile.level || "").slice(0, 50)
  },
  entrevista: transcript
})}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
            maxOutputTokens: 1400
          }
        })
      }
    );

    const payload = await response.json();
    if (!response.ok) {
      const apiMessage = payload?.error?.message || `HTTP ${response.status}`;
      console.error("Gemini API error:", response.status, apiMessage);
      return res.status(502).json({
        error: response.status === 429
          ? "Se alcanzó el límite gratuito de uso de Gemini. Probá nuevamente más tarde."
          : "Gemini no pudo responder. Revisá la API Key, el modelo y los permisos de la API."
      });
    }

    const raw = payload?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "").join("") || "";
    if (!raw) throw new Error("Gemini devolvió una respuesta vacía.");

    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const analysis = JSON.parse(clean);
    return res.status(200).json({ analysis });
  } catch (error) {
    console.error("Error al analizar con Gemini:", error?.message || error);
    return res.status(502).json({
      error: "No se pudo obtener el análisis de IA. Revisá la conexión y la configuración de Gemini."
    });
  }
}
