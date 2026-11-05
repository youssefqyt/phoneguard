import { Controller, Get, Header } from '@nestjs/common';
import { collectDefaultMetrics, register } from 'prom-client';
import { Public } from '../common/decorators/public.decorator';

collectDefaultMetrics({ register });

@Controller()
export class MetricsController {
  @Public()
  @Get('metrics')
  @Header('Content-Type', register.contentType)
  getMetrics(): Promise<string> {
    return register.metrics();
  }
}