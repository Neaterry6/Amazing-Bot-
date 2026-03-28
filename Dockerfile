ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine

LABEL maintainer="Ilom <contact@ilom.tech>"
LABEL version="1.0.0"
LABEL description="🧠 Amazing Bot 🧠 v1 created by Ilom - Advanced WhatsApp Bot"

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    pixman-dev \
    ffmpeg \
    imagemagick \
    && rm -rf /var/cache/apk/*

COPY package*.json ./

RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi && \
    npm cache clean --force && \
    rm -rf /tmp/*

COPY . .

RUN mkdir -p logs temp session media backups && \
    chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

ENV NODE_ENV=production
ENV PORT=5000

VOLUME ["/app/logs", "/app/session", "/app/media", "/app/backups"]

CMD ["node", "index.js"]
