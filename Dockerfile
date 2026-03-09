FROM node:20-alpine

RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

COPY package*.json ./
RUN npm install --production && apk del python3 make g++

COPY src/ ./src/

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]