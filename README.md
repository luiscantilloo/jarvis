# J.A.R.V.I.S. Mk V Ultra — Asistente de IA de Escritorio

Asistente de escritorio inmersivo con temática Iron Man, potenciado por Gemini, Ollama (local), o modo offline completo.

## Características Mk V

- **WebSocket en tiempo real** — Métricas de CPU/RAM actualizadas cada 2 segundos sin polling
- **Soporte Ollama** — LLM local sin internet (`llama3`, `mistral`, etc.)
- **Acceso real al sistema** — Procesos reales, disco real, red real, explorador de archivos del host
- **Comandos seguros del OS** — Lista blanca de comandos reales ejecutables desde la UI
- **Historial de conversación** — Contexto persistente enviado a Gemini/Ollama
- **Markdown renderizado** — Respuestas con formato real, no texto plano
- **Workflows persistentes** — Guardados en JSON, sobreviven reinicios
- **Nueva pestaña "SISTEMA REAL"** — Procesos, interfaces de red, explorador de archivos, comandos reales
- **Rate limiting y headers de seguridad** — Helmet + express-rate-limit

## Inicio rápido

```bash
npm install

# Crea .env con tu API key (ver .env.example)
cp .env.example .env

npm run dev   # Servidor en http://localhost:3000
```

## Modos de IA

1. **Gemini (online)** — Configura `GEMINI_API_KEY` en `.env`
2. **Ollama (offline local)** — Instala [Ollama](https://ollama.ai) + `ollama pull llama3`
3. **Modo offline** — Sin configuración, con respuestas locales inteligentes

## Comandos de voz

- `"Jarvis"` — Activa modo de charla continua hands-free
- `"Escúchame"` — Comando único por voz
- `"Para"` / `"Stop"` — Detiene el modo manos libres

## Scripts

```bash
npm run dev     # Desarrollo con HMR
npm run build   # Build de producción
npm run start   # Servidor de producción
npm run lint    # Verificación de tipos TypeScript
```
