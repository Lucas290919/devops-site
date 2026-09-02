# ─── Backend — Dockerfile ────────────────────────────────────────────────────

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
# npm install simples — sem lockfile no repositório
RUN npm install --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN rm -f .env .env.example

USER appuser

EXPOSE 3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
