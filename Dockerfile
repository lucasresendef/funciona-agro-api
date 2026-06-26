FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# DATABASE_URL placeholder: o postinstall roda "prisma generate" no build e o
# Prisma 7 le a datasource via prisma.config.ts (env DATABASE_URL). O valor real
# e injetado em runtime pelo Coolify e sobrescreve este placeholder.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 3099

CMD ["node", "dist/server.js"]
