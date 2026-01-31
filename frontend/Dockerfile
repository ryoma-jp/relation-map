
# frontend/Dockerfile (single-stage for reliable installs)
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
# Install all dependencies (including typescript and react-scripts)
RUN npm install --silent
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
