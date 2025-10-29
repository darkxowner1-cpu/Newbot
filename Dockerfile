FROM node:18-alpine

RUN apk add --no-cache \
    bash \
    curl \
    git

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN chmod +x /app/index.js

EXPOSE 3000

CMD ["npm", "start"]
