import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las tipografías del PDF se leen del disco al renderizar. Sin esto, el trazado de
  // dependencias no las ve —nadie las importa— y en producción la ruta falla.
  outputFileTracingIncludes: {
    '/api/reportes/pdf': ['./assets/fonts/**/*'],
  },
};

export default nextConfig;
