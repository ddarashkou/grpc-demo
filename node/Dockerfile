FROM node:18

WORKDIR /app
COPY node/package.json .
RUN npm install

COPY node/. .

CMD ["node", "index.js"]