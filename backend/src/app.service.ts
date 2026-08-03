import { Injectable } from '@nestjs/common';

export interface AppInfo {
  name: string;
  status: string;
  docs: string;
}

@Injectable()
export class AppService {
  getInfo(): AppInfo {
    return {
      name: 'Smart Factory API',
      status: 'running',
      docs: '/api/docs',
    };
  }
}
