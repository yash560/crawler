FROM mcr.microsoft.com/playwright:v1.45.0-jammy

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
