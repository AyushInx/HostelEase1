FROM node:20-slim

WORKDIR /app

# Install openssl for Prisma query engine
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
COPY backend/prisma ./prisma/
COPY backend/prisma.config.ts ./

RUN npm install

COPY backend/ .

RUN npx prisma generate

EXPOSE 5000

CMD ["node", "src/index.js"]
