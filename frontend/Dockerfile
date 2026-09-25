# ─── Frontend — Dockerfile ───────────────────────────────────────────────────
# Imagem NGINX que serve os arquivos estáticos do frontend.
# ─────────────────────────────────────────────────────────────────────────────

FROM nginx:1.27-alpine

# Remove a config padrão do NGINX
RUN rm /etc/nginx/conf.d/default.conf

# Copia a configuração personalizada
# Copia a config personalizada. O contexto do build e a raiz do repositorio.
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copia os arquivos estáticos do frontend
COPY frontend /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
