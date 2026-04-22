FROM node:22-alpine AS build
WORKDIR /workspace

COPY client-portal/package*.json ./client-portal/
COPY shared-ui/dist/shared-ui ./shared-ui/dist/shared-ui
COPY shared-ui/design-tokens.css ./shared-ui/design-tokens.css

WORKDIR /workspace/client-portal
RUN npm ci

WORKDIR /workspace
COPY client-portal ./client-portal

WORKDIR /workspace/client-portal
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY ./client-portal/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/client-portal/dist/client-portal/browser /usr/share/nginx/html
EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
