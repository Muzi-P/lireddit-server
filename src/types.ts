import { Redis } from 'ioredis';
import { Request, Response } from 'express';
export type MyContext = {
  req: Request
  res: Response;
  redis: Redis;
};

declare module 'express-session' {
  export interface SessionData {
    userId: number;
  }
}