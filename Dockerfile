FROM node:20-alpine

WORKDIR /app

COPY package*.json tsconfig.json jest.config.js ./

RUN npm ci

COPY src/ ./src/
COPY tests/ ./tests/

RUN npm run build

RUN mkdir -p /app/dist/database
RUN cp /app/src/database/schema.sql /app/dist/database/

ENV NODE_ENV=production
ENV JWT_ACCESS_SECRET=default_access_secret
ENV JWT_REFRESH_SECRET=default_refresh_secret
ENV SYSTEM_API_KEY=default_system_api_key

RUN npm run init-db

EXPOSE 3000

CMD ["node", "dist/index.js"]