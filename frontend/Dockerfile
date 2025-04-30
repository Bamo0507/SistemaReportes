# Usa Nginx para servir contenido estático
FROM nginx:stable-alpine

# Copia tu index.html al directorio por defecto de Nginx
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]