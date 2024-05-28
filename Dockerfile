FROM node:20-buster

WORKDIR /app

COPY . .
RUN yarn

RUN yarn build

RUN file="$(ls -la)" && echo $file

EXPOSE 3040
CMD yarn start:prod