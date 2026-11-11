# SkillCoach AR — paquete listo para GitHub + Vercel

## Estructura
- `public/`: interfaz web (HTML, CSS y JavaScript).
- `server.js`: servidor Express y endpoint `/api/analyze`.
- `package.json`: dependencias del servidor.

## Subir a GitHub
1. Creá un repositorio nuevo en GitHub.
2. Subí el contenido de esta carpeta.
3. No subas nunca `.env` ni pegues tu API Key en archivos del proyecto.
4. El archivo `.gitignore` excluye `.env` y `node_modules`.

## Publicar en Vercel
1. Entrá en https://vercel.com y elegí Add New → Project.
2. Importá el repositorio de GitHub.
3. Vercel detectará el proyecto Express. No hace falta configurar un build command ni output directory.
4. Antes de desplegar (o desde Settings → Environment Variables), agregá:
   - Name: `OPENAI_API_KEY`
   - Value: tu clave privada de OpenAI
   - Environment: Production (y Preview si querés probar previews)
5. Guardá la variable y desplegá. Si la agregás después del primer deploy, hacé Redeploy para que tenga efecto.
6. Abrí el dominio `.vercel.app` que te entrega Vercel.

## Prueba local
Instalá Node.js 20 o superior. En esta carpeta:
1. `npm install`
2. Creá `.env` a partir de `.env.example` y agregá tu clave.
3. `npm start`
4. Abrí http://localhost:3000

## Seguridad y límites
- No subas `.env` a GitHub.
- No pongas la API Key en `public/app.js`, HTML ni CSS.
- La clave debe existir como variable de entorno en Vercel.
- La IA analiza texto de las respuestas; no procesa los archivos CV/oferta laboral en esta versión.
- Las preguntas siguen siendo las programadas; la IA no las genera a partir del aviso laboral todavía.
- La puntuación numérica sigue siendo orientativa y basada en reglas locales.
- La API de OpenAI puede generar cargos. Revisá límites y uso en https://platform.openai.com/usage.
