
const $ = (id) => document.getElementById(id);
const views = ["profileView", "interviewView", "analysisView", "planView"];
const stepEls = [...document.querySelectorAll(".step")];

let profile = {};
let questions = [];
let answers = [];
let current = 0;
let recognition = null;
let listening = false;
let cameraStream = null;
let startedAt = null;
let timerInterval = null;
let reportData = null;

const questionSets = {
  marketing: [
    "Contame brevemente sobre vos y tu recorrido profesional.",
    "¿Cómo investigarías las necesidades de un público objetivo antes de lanzar un producto?",
    "Si una campaña no alcanza los resultados esperados, ¿qué analizarías y qué decisiones tomarías?",
    "¿Cómo explicarías una estrategia para posicionar una marca frente a sus competidores?",
    "Contame una situación en la que hayas trabajado con otras personas para alcanzar un objetivo."
  ],
  administration: [
    "Contame brevemente sobre vos y tu recorrido profesional.",
    "¿Cómo organizás prioridades cuando tenés varias tareas urgentes?",
    "¿Qué información analizarías antes de tomar una decisión administrativa?",
    "¿Cómo actuarías si detectás un error en un proceso de trabajo?",
    "Contame cómo colaborarías para mejorar la organización de un equipo."
  ],
  rrhh: [
    "Contame brevemente sobre vos y tu recorrido profesional.",
    "¿Qué aspectos tendrías en cuenta para seleccionar a una persona para un puesto?",
    "¿Cómo abordarías un desacuerdo entre dos integrantes de un equipo?",
    "¿Qué acciones propondrías para mejorar el clima laboral?",
    "¿Cómo resguardarías la confidencialidad de la información de los colaboradores?"
  ],
  tecnologia: [
    "Contame brevemente sobre vos y tu recorrido profesional.",
    "Describí cómo abordarías un problema técnico que no conocés.",
    "¿Cómo explicás una solución técnica a alguien sin conocimientos especializados?",
    "¿Cómo organizás tu trabajo cuando cambian las prioridades de un proyecto?",
    "Contame una experiencia de colaboración para resolver un desafío."
  ],
  ventas: [
    "Contame brevemente sobre vos y tu recorrido profesional.",
    "¿Cómo identificarías las necesidades de un cliente potencial?",
    "¿Qué harías ante una objeción de precio?",
    "¿Cómo construirías una relación de largo plazo con un cliente?",
    "¿Qué indicadores utilizarías para evaluar tu desempeño comercial?"
  ],
  general: [
    "Contame brevemente sobre vos y tu recorrido profesional.",
    "¿Cuáles considerás que son tus principales fortalezas para este puesto?",
    "Describí un desafío que hayas enfrentado y cómo lo resolviste.",
    "¿Cómo trabajás en equipo y recibís comentarios sobre tu desempeño?",
    "¿Por qué te interesa este puesto y qué podrías aportar?"
  ]
};

function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timeout);
  notify.timeout = setTimeout(() => toast.classList.remove("show"), 2800);
}

function showView(id, step) {
  views.forEach(v => $(v).classList.toggle("hidden", v !== id));
  stepEls.forEach(el => {
    const n = Number(el.dataset.step);
    el.classList.toggle("active", n === step);
    el.classList.toggle("done", n < step);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fileName(id) {
  return $(id).files[0]?.name || "No adjuntado";
}

$("cvFile").addEventListener("change", updateFileStatus);
$("jobFile").addEventListener("change", updateFileStatus);
function updateFileStatus() {
  const cv = fileName("cvFile");
  const job = fileName("jobFile");
  $("fileStatus").textContent = `CV: ${cv} · Aviso: ${job}. Los archivos se seleccionan localmente; esta demo no lee su contenido.`;
}

$("profileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  profile = {
    career: $("career").value.trim(),
    job: $("job").value.trim(),
    experience: $("experience").value,
    level: $("level").value,
    cv: fileName("cvFile"),
    vacancy: fileName("jobFile")
  };
  if (!profile.career || !profile.job) return notify("Completá tu carrera y el puesto al que aspirás.");
  const job = profile.job.toLowerCase();
  let key = "general";
  if (/market|comercial|brand|marketing/.test(job)) key = "marketing";
  else if (/admin|contab|finanz|operac/.test(job)) key = "administration";
  else if (/recursos humanos|rrhh|talent|selecci/.test(job)) key = "rrhh";
  else if (/sistem|software|desarroll|program|tecnolog|it\b/.test(job)) key = "tecnologia";
  else if (/venta|vendedor|comercial|account|asesor/.test(job)) key = "ventas";
  questions = [...(questionSets[key] || questionSets.general)];
  if (profile.level === "Avanzada") {
    questions[3] = "Describí una decisión compleja relacionada con el puesto y explicá cómo medirías sus resultados.";
  } else if (profile.level === "Básica") {
    questions[3] = "¿Qué te gustaría aprender durante tus primeros meses en este puesto?";
  }
  answers = Array(questions.length).fill("");
  current = 0;
  $("interviewSubtitle").textContent = `${profile.job} · ${profile.experience} · Dificultad ${profile.level}`;
  renderQuestion();
  showView("interviewView", 2);
  startTimer();
});

function renderQuestion() {
  $("questionText").textContent = questions[current];
  $("questionCount").textContent = `PREGUNTA ${current + 1} DE ${questions.length}`;
  $("questionProgress").style.width = `${((current + 1) / questions.length) * 100}%`;
  $("answer").value = answers[current] || "";
  $("nextQuestionBtn").innerHTML = current === questions.length - 1
    ? 'Guardar y ver análisis <i class="bi bi-arrow-right ms-2"></i>'
    : 'Guardar y continuar <i class="bi bi-arrow-right ms-2"></i>';
}

function saveCurrentAnswer() {
  answers[current] = $("answer").value.trim();
}

$("nextQuestionBtn").addEventListener("click", () => {
  saveCurrentAnswer();
  stopRecognition();
  if (current < questions.length - 1) {
    current++;
    renderQuestion();
  } else {
    finishInterview();
  }
});

$("endInterviewBtn").addEventListener("click", () => {
  saveCurrentAnswer();
  stopRecognition();
  finishInterview();
});

function startTimer() {
  clearInterval(timerInterval);
  startedAt = Date.now();
  timerInterval = setInterval(() => {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    $("timer").textContent = `${String(Math.floor(seconds / 60)).padStart(2,"0")}:${String(seconds % 60).padStart(2,"0")}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

$("voiceBtn").addEventListener("click", () => listening ? stopRecognition() : startRecognition());

function startRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    notify("El reconocimiento de voz no está disponible en este navegador. Podés escribir tu respuesta.");
    $("voiceStatus").textContent = "Reconocimiento no disponible. Escribí tu respuesta.";
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "es-AR";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onstart = () => {
    listening = true;
    $("voiceOrb").classList.add("listening");
    $("waveform").classList.add("active");
    $("voiceStatus").textContent = "Escuchando… hablá con naturalidad.";
    $("voiceBtn").innerHTML = '<i class="bi bi-stop-circle me-2"></i>Detener micrófono';
  };
  recognition.onresult = (event) => {
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) finalText += event.results[i][0].transcript + " ";
    }
    if (finalText.trim()) $("answer").value = `${$("answer").value} ${finalText}`.trim();
  };
  recognition.onerror = (event) => {
    $("voiceStatus").textContent = `No se pudo continuar con el micrófono (${event.error}). Podés escribir.`;
    stopRecognition();
  };
  recognition.onend = () => resetVoiceUI();
  try { recognition.start(); } catch (e) { notify("El micrófono ya está iniciado o no está disponible."); }
}

function resetVoiceUI() {
  listening = false;
  $("voiceOrb").classList.remove("listening");
  $("waveform").classList.remove("active");
  $("voiceBtn").innerHTML = '<i class="bi bi-mic me-2"></i>Responder por voz';
  if ($("voiceStatus").textContent.startsWith("Escuchando")) $("voiceStatus").textContent = "Micrófono detenido. Podés seguir escribiendo.";
}
function stopRecognition() {
  if (recognition && listening) {
    try { recognition.stop(); } catch (e) {}
  }
  resetVoiceUI();
}

$("cameraBtn").addEventListener("click", async () => {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    $("cameraVideo").srcObject = null;
    $("cameraVideo").classList.remove("visible");
    $("cameraPlaceholder").style.display = "flex";
    $("cameraBtn").innerHTML = '<i class="bi bi-camera-video me-2"></i>Activar cámara (opcional)';
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) return notify("La cámara requiere HTTPS o localhost en un navegador compatible.");
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    $("cameraVideo").srcObject = cameraStream;
    $("cameraVideo").classList.add("visible");
    $("cameraPlaceholder").style.display = "none";
    $("cameraBtn").innerHTML = '<i class="bi bi-camera-video-off me-2"></i>Desactivar cámara';
  } catch (error) {
    notify("No se pudo acceder a la cámara. Revisá los permisos del navegador.");
  }
});

function finishInterview() {
  stopRecognition();
  stopTimer();
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    $("cameraVideo").srcObject = null;
    $("cameraVideo").classList.remove("visible");
    $("cameraPlaceholder").style.display = "flex";
    $("cameraBtn").innerHTML = '<i class="bi bi-camera-video me-2"></i>Activar cámara (opcional)';
  }
  showView("analysisView", 3);
  $("analysisLoading").classList.remove("hidden");
  $("analysisContent").classList.add("hidden");
  setTimeout(() => buildAnalysis(), 850);
}

async function buildAnalysis() {
  const filled = answers.filter(a => a.length > 0);
  const text = filled.join(" ").toLowerCase();
  const words = text.match(/[a-záéíóúüñ]+/gi) || [];
  const fillers = text.match(/\b(eh+|em+|este|digamos|o sea|bueno)\b/gi) || [];
  const avgWords = filled.length ? words.length / filled.length : 0;
  const completion = filled.length / questions.length;
  // Puntaje heurístico de demostración: no es una evaluación de IA.
  const score = filled.length ? Math.min(100, Math.round(35 + completion * 40 + Math.min(avgWords, 45) * 0.55 - Math.min(fillers.length, 12) * 1.5)) : 0;
  const pace = !filled.length ? "Sin datos" : avgWords >= 35 ? "Desarrolladas" : avgWords >= 12 ? "Intermedias" : "Breves";
  reportData = { score, filled: filled.length, fillers: fillers.length, avgWords: Math.round(avgWords), pace, answers: [...answers], questions: [...questions] };
  $("scoreMetric").textContent = `${score}%`;
  $("answeredMetric").textContent = `${filled.length}/${questions.length}`;
  $("fillerMetric").textContent = fillers.length;
  $("paceMetric").textContent = pace;
  const observations = [];
  if (!filled.length) observations.push(["Empezá por una respuesta", "No registramos respuestas. En la próxima práctica, intentá responder al menos una pregunta."]);
  else {
    observations.push(["Participación", `Respondiste ${filled.length} de ${questions.length} preguntas. ${filled.length === questions.length ? "Completaste toda la práctica." : "Podés volver a practicar las preguntas pendientes."}`]);
    observations.push(["Claridad y desarrollo", avgWords < 12 ? "Tus respuestas fueron breves. Probá explicar la situación, la acción que tomarías y el resultado esperado." : "Tus respuestas tuvieron un desarrollo inicial. Para fortalecerlas, incorporá ejemplos concretos y conectalos con el puesto."]);
    observations.push(["Muletillas", fillers.length > 3 ? `Se encontraron ${fillers.length} posibles muletillas en el texto reconocido. Practicá hacer pausas breves en lugar de usar palabras de relleno.` : `Se encontraron ${fillers.length} posibles muletillas. Seguí prestando atención a las pausas y a la claridad de tus ideas.`]);
  }
  $("analysisFeedback").innerHTML = observations.map(([title, body]) => `<div class="feedback-block"><h4>${escapeHTML(title)}</h4><p>${escapeHTML(body)}</p></div>`).join("");
  $("answerSummary").innerHTML = questions.map((q, i) => `<div class="answer-summary-item"><b>${i+1}. ${escapeHTML(q)}</b><p>${answers[i] ? escapeHTML(answers[i].slice(0,190)) + (answers[i].length > 190 ? "…" : "") : "Sin respuesta registrada."}</p></div>`).join("");
  $("analysisLoading").classList.add("hidden");
  $("analysisContent").classList.remove("hidden");

  // Si el servidor y la API están configurados, enriquecemos el informe con IA.
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, questions, answers })
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      if (response.status !== 503) console.warn(problem.error || "No se pudo conectar con la IA.");
      return; // El análisis local sigue disponible como alternativa.
    }
    const payload = await response.json();
    const ai = payload.analysis;
    if (!ai) return;

    const sections = [];
    if (ai.resumen) sections.push(["Devolución de IA", ai.resumen]);
    if (Array.isArray(ai.fortalezas) && ai.fortalezas.length)
      sections.push(["Fortalezas", ai.fortalezas.join(" · ")]);
    if (Array.isArray(ai.mejoras) && ai.mejoras.length)
      sections.push(["Oportunidades de mejora", ai.mejoras.join(" · ")]);
    if (Array.isArray(ai.recomendaciones) && ai.recomendaciones.length)
      sections.push(["Recomendaciones personalizadas", ai.recomendaciones.join(" · ")]);
    if (sections.length) {
      $("analysisFeedback").innerHTML =
        `<div class="alert alert-success small"><i class="bi bi-stars me-2"></i>Informe complementado con inteligencia artificial. La puntuación numérica sigue siendo orientativa.</div>` +
        sections.map(([title, body]) => `<div class="feedback-block"><h4>${escapeHTML(title)}</h4><p>${escapeHTML(body)}</p></div>`).join("");
    }
    if (Array.isArray(ai.plan5dias) && ai.plan5dias.length) {
      reportData.aiPlan = ai.plan5dias;
      reportData.aiRecommendations = ai.recomendaciones || [];
      reportData.aiSummary = ai.resumen || "";
      reportData.aiStrengths = ai.fortalezas || [];
      reportData.aiImprovements = ai.mejoras || [];
    }
    const status = document.getElementById("aiStatus");
    if (status) {
      status.className = "alert alert-success py-2 small mb-3";
      status.innerHTML = '<i class="bi bi-stars me-2"></i>Inteligencia artificial conectada: devolución personalizada generada para esta entrevista.';
    }
  } catch (error) {
    console.warn("La IA no está disponible; se conserva el análisis local.", error);
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

$("toPlanBtn").addEventListener("click", () => {
  if (!reportData) return;
  buildPlan();
  showView("planView", 4);
});

function buildPlan() {
  const low = reportData.avgWords < 12;
  const manyFillers = reportData.fillers > 3;
  const plan = [
    ["DÍA 1", "Presentación profesional", "Prepará una presentación de 60 segundos: quién sos, qué sabés hacer y qué buscás. Grabala y escuchala."],
    ["DÍA 2", "Respuestas con ejemplos", "Elegí una experiencia y ordenala en cuatro partes: situación, tarea, acción y resultado (método STAR)."],
    ["DÍA 3", "Claridad y pausas", manyFillers ? "Practicá responder sin muletillas. Cuando necesites pensar, hacé una pausa breve y retomá la idea." : "Practicá hablar con frases claras, pausas naturales y un mensaje principal por respuesta."],
    ["DÍA 4", "Preguntas del puesto", `Investigá tres desafíos habituales del puesto de ${profile.job} y prepará posibles respuestas.`],
    ["DÍA 5", "Simulación completa", "Realizá otra entrevista de práctica. Compará la claridad, los ejemplos y el desarrollo de tus respuestas."]
  ];
  const aiPlan = reportData.aiPlan;
  if (Array.isArray(aiPlan) && aiPlan.length) {
    $("dailyPlan").innerHTML = aiPlan.map((item, index) =>
      `<div class="daily-item"><div class="day-badge">D${index + 1}</div><div><h4>${escapeHTML(item.titulo || item.dia || `Día ${index + 1}`)}</h4><p>${escapeHTML(item.actividad || "")}</p></div></div>`
    ).join("");
  } else {
    $("dailyPlan").innerHTML = plan.map(([day,title,desc]) => `<div class="daily-item"><div class="day-badge">${day.replace("DÍA ","D")}</div><div><h4>${title}</h4><p>${desc}</p></div></div>`).join("");
  }
  const goals = [
    low ? "Ampliar las respuestas con ejemplos concretos." : "Mantener respuestas estructuradas y relevantes.",
    manyFillers ? "Reducir muletillas mediante pausas conscientes." : "Sostener un ritmo claro y natural.",
    "Relacionar cada respuesta con las necesidades del puesto.",
    "Practicar el método STAR para preguntas conductuales."
  ];
  const finalGoals = Array.isArray(reportData.aiRecommendations) && reportData.aiRecommendations.length
    ? reportData.aiRecommendations
    : goals;
  $("goalList").innerHTML = finalGoals.map(g => `<div class="goal"><i class="bi bi-check-circle-fill"></i><span>${escapeHTML(g)}</span></div>`).join("");
  $("finalScore").textContent = `${reportData.score}%`;
  $("reportTitle").textContent = reportData.score >= 80 ? "¡Muy buen trabajo!" : reportData.score >= 55 ? "¡Vas por buen camino!" : "Tu práctica recién empieza";
  $("reportDescription").textContent = `Completaste ${reportData.filled} de ${questions.length} respuestas para el puesto de ${profile.job}.`;
  $("profileSummary").textContent = `${profile.job} · ${profile.career} · ${profile.experience}`;
}

$("downloadBtn").addEventListener("click", () => {
  if (!reportData) return;
  const lines = [
    "SKILLCOACH AR - INFORME DE PRÁCTICA",
    `Fecha: ${new Date().toLocaleString("es-AR")}`,
    `Carrera: ${profile.career}`,
    `Puesto: ${profile.job}`,
    `Experiencia: ${profile.experience}`,
    `Desempeño estimado: ${reportData.score}%`,
    `Respuestas: ${reportData.filled}/${questions.length}`,
    `Posibles muletillas: ${reportData.fillers}`,
    `Desarrollo promedio: ${reportData.pace}`,
    "",
    "RESPUESTAS:"
  ];
  questions.forEach((q, i) => lines.push(`${i+1}. ${q}\n${answers[i] || "Sin respuesta"}`));
  if (reportData.aiSummary) {
    lines.push("", "DEVOLUCIÓN DE INTELIGENCIA ARTIFICIAL:", reportData.aiSummary);
    if (reportData.aiStrengths?.length) lines.push("", "FORTALEZAS:", ...reportData.aiStrengths.map(x => `- ${x}`));
    if (reportData.aiImprovements?.length) lines.push("", "OPORTUNIDADES DE MEJORA:", ...reportData.aiImprovements.map(x => `- ${x}`));
    if (reportData.aiRecommendations?.length) lines.push("", "RECOMENDACIONES:", ...reportData.aiRecommendations.map(x => `- ${x}`));
    lines.push("", "NOTA: La devolución fue generada por IA a partir del texto de las respuestas. La puntuación numérica sigue siendo orientativa.");
  } else {
    lines.push("", "NOTA: Informe orientativo generado por reglas locales del prototipo. No se pudo conectar con la IA en esta sesión.");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "informe-skillcoach.txt";
  a.click();
  URL.revokeObjectURL(url);
});

$("restartBtn").addEventListener("click", () => {
  reportData = null;
  answers = [];
  current = 0;
  $("profileForm").reset();
  $("fileStatus").textContent = "Podés continuar sin adjuntar archivos. En esta versión se registra el nombre del archivo, pero no se extrae su contenido.";
  $("timer").textContent = "00:00";
  showView("profileView", 1);
});
$("backAnalysisBtn").addEventListener("click", () => showView("analysisView", 3));

// Al cerrar o abandonar la página, detener dispositivos si siguen activos.
window.addEventListener("beforeunload", () => {
  stopRecognition();
  if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
  stopTimer();
});


// Verificar si el servidor tiene Gemini configurado. La clave nunca se envía al navegador.
(async () => {
  const statusText = document.getElementById("aiStatusText");
  const modeLabel = document.getElementById("modeLabel");
  const statusBox = document.getElementById("aiStatus");
  try {
    const response = await fetch("/api/status");
    const status = await response.json();
    if (status.aiConfigured) {
      statusText.textContent = "IA Gemini conectada. Ya podés realizar una entrevista y recibir una devolución personalizada.";
      modeLabel.textContent = "IA Gemini · Conectada";
      statusBox.classList.remove("alert-secondary", "alert-warning");
      statusBox.classList.add("alert-success");
    } else {
      statusText.textContent = "Modo demostración: el análisis local está disponible, pero falta configurar GEMINI_API_KEY en el servidor.";
      modeLabel.textContent = "MVP · Modo demostración";
      statusBox.classList.remove("alert-success");
      statusBox.classList.add("alert-warning");
    }
  } catch {
    statusText.textContent = "No se pudo comprobar la conexión con el servidor. Abrí la aplicación desde su URL publicada o desde localhost.";
    modeLabel.textContent = "MVP · Sin conexión";
  }
})();


