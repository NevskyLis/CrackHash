FROM node:16

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY src/ ./src/

CMD ["npm", "run", "start:manager"]
