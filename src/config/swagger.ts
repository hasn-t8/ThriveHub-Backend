import { OpenAPIV3 } from 'openapi-types';

const swaggerOptions: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'API Documentation',
    version: '1.0.0',
    description: 'API documentation for your project',
  },
  servers: [
    {
      url: 'http://localhost:3000', // Replace with your server's base URL
      description: 'Local server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {}, // Will be populated via swagger-jsdoc
};

export default swaggerOptions;
