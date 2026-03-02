
# frontend/Dockerfile (single-stage for reliable installs)
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
# Install all dependencies (including typescript and react-scripts)
RUN npm install --legacy-peer-deps
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
