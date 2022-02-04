FROM node:17.4.0-alpine as build
RUN apk add --no-cache python3 make g++
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:css

FROM node:17.4.0-alpine
WORKDIR /usr/src/app
COPY ./package.json ./package-lock.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules
RUN npm ci --prod && npm cache clean --force
COPY . .
COPY --from=build /usr/src/app/public/styles.css ./public/styles.css
ENV NODE_ENV production
ENV PORT 80
EXPOSE 80
RUN chown -R node:node .
USER node
CMD [ "npm", "start" ]