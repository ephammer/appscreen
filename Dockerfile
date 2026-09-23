# App Store Screenshot Generator
# Lightweight nginx container serving static files

FROM nginx:alpine

LABEL maintainer="App Store Screenshot Generator"
LABEL description="Browser-based tool for creating App Store marketing screenshots"

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy application files
# (glob so newly added top-level scripts are never left out of the image)
COPY index.html styles.css *.js /usr/share/nginx/html/

# Copy assets
COPY models/ /usr/share/nginx/html/models/
COPY vendor/ /usr/share/nginx/html/vendor/
COPY img/ /usr/share/nginx/html/img/

# Copy custom nginx configuration for SPA and caching
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
