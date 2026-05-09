FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev
COPY apps/api apps/api
COPY packages/shared packages/shared
EXPOSE 8787
CMD ["npm", "--workspace", "apps/api", "run", "start"]
