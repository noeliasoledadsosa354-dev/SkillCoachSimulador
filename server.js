import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(__dirname, "public")));

const apiKey = process.env.OPENAI_API_KEY;
const openai = apiKey && apiKey !== "PEGA_TU_API_KEY_AQUI"
  ? new OpenAI({ apiKey })
  : null;

app.get("/api/status", (_req, res) => {
  res.json({ aiConfigured: Boolean(openai) });
});

app.post("/api/analyze", async (req, res) => {
  if (!openai) {
    return res.status(503).json({
      error: "Falta configurar OPENAI_API_KEY en el archivo .env."
    });
  }

  const { profile = {}, questions = [], answers = [] } = req.body || {};
  if (!Array.isArray(questions) || !Array.isArray(answers) ||
      questions.length > 15 || answers.length > 15) {
    return res.status(400).json({ error: "Los datos de la entrevista no son válidos." });
  }

  const transcript = questions.map((question, i) => ({
    pregunta: String(question).slice(0, 1200),
    respuesta: String(answers[i] || "").slice(0, 4000)
  }));

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions: `Sos SkillCoach AR, un orientador de entrevistas laborales. Evaluá las respuestas con criterio constructivo, respetuoso y específico para el puesto. No inventes experiencias ni atribuyas habilidades que no aparecen. No evalúes personalidad, emociones, apariencia, acento ni lenguaje corporal. Considerá que una respuesta breve puede ser válida si responde bien. No penalices a la persona por no tener experiencia laboral; valorá ejemplos académicos, voluntariado o proyectos si aparecen. Devolvé SOLO JSON válido con esta estructura:
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
Usá español rioplatense claro. Si hay respuestas vacías, indicá que faltó información y no inventes contenido.`,
      input: JSON.stringify({
        perfil: {
          carrera: String(profile.career || "").slice(0, 200),
          puesto: String(profile.job || "").slice(0, 200),
          experiencia: String(profile.experience || "").slice(0, 100),
          dificultad: String(profile.level || "").slice(0, 50)
        },
        entrevista: transcript
      }),
      max_output_tokens: 1100
    });

    const raw = response.output_text || "";
    const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const result = JSON.parse(clean);
    res.json({ analysis: result });
  } catch (error) {
    console.error("Error al analizar con OpenAI:", error?.message || error);
    res.status(502).json({
      error: "No se pudo obtener el análisis de IA. Revisá la conexión, la API Key y la facturación de tu cuenta."
    });
  }
});

// Vercel importa esta aplicación como una función. Localmente, Node la inicia en el puerto configurado.
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`SkillCoach AR disponible en http://localhost:${port}`);
  });
}

export default app;
