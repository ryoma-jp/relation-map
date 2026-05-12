
# frontend/Dockerfile (single-stage for reliable installs)
FROM node:26-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# Use lockfile-based install to keep Docker resolution identical to CI.
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
