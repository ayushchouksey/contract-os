import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  health() {
    return {
      status: 'ok',
      service: 'contract-os-backend',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}