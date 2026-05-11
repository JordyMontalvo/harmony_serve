/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para Heroku
  env: {
    PORT: process.env.PORT || 3000,
  },
  
  // Configuración del servidor
  serverRuntimeConfig: {
    port: process.env.PORT || 3000,
  },
  
  async headers() {
    return [
      {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          // Evitar * + Credentials (inválido en navegadores); las rutas API siguen aplicando CORS en lib/midd.
          { key: "Access-Control-Allow-Origin", value: "*" },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
