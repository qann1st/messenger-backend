export const MONGODB_URI =
  process.env.MONGODB_URI ?? 'mongodb://localhost:27017/messenger';
export const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
export const REDIS_PORT = Number(process.env.REDIS_PORT ?? 32768);
