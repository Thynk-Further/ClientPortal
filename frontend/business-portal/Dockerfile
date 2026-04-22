FROM node:22-alpine AS build
WORKDIR /workspace

COPY business-portal/package*.json ./business-portal/
COPY shared-ui/dist/shared-ui ./shared-ui/dist/shared-ui
COPY shared-ui/design-tokens.css ./shared-ui/design-tokens.css

WORKDIR /workspace/business-portal
RUN npm ci

WORKDIR /workspace
COPY business-portal ./business-portal

WORKDIR /workspace/business-portal
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY ./business-portal/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/business-portal/dist/business-portal/browser /usr/share/nginx/html
EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
