FROM node:22-alpine
LABEL org.opencontainers.image.title="@lescribeaudio/mcp — Serveur MCP Officiel Le Scribe Audio"
LABEL org.opencontainers.image.description="Serveur Model Context Protocol (MCP) officiel de transcription audio francophone en 2 passes (https://lescribeaudio.com/integrations-mcp)"
LABEL org.opencontainers.image.url="https://lescribeaudio.com/integrations-mcp"
LABEL org.opencontainers.image.documentation="https://lescribeaudio.readthedocs.io/en/latest/"
LABEL org.opencontainers.image.source="https://github.com/zoulouzaza76/lescribeaudio-mcp"
LABEL org.opencontainers.image.vendor="Le Scribe Audio (https://lescribeaudio.com)"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app
COPY package.json ./
COPY dist ./dist
ENTRYPOINT ["node", "dist/index.js"]
