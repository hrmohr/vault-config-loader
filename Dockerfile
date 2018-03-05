FROM node:8.9.4-alpine
USER node
COPY --chown=node:node package.json yarn.lock wait-for /app/
WORKDIR /app/
RUN yarn install --production --frozen-lockfile --non-interactive && chmod +x wait-for
COPY --chown=node:node index.js .
VOLUME /config
CMD ["./wait-for", "vault:8200", "-t", "10", "--", "node", "index.js"]