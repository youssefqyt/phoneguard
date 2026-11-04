import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  const port = config.get<number>('port', 3000);
  const apiPrefix = config.get<string>('apiPrefix', 'api/v1');
  const corsOrigins = config.get<string[]>('corsOrigins', ['*']);

  app.use(helmet());
  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: true,
  });

  app.setGlobalPrefix(apiPrefix, { exclude: ['health', 'health/ready', ''] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PhoneGuard API')
    .setDescription(
      'Digital wellbeing, screen-time control and parental-control platform. ' +
        'Sync device usage, enforce app limits and schedules, run focus sessions and manage rewards.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('auth', 'Registration, login and token lifecycle')
    .addTag('users', 'Profile and account management')
    .addTag('households', 'Family groups, members and invites')
    .addTag('devices', 'Device pairing and management')
    .addTag('usage', 'Screen-time telemetry and analytics')
    .addTag('rules', 'App limits, blocklists and schedules')
    .addTag('focus', 'Focus sessions')
    .addTag('rewards', 'Points, rewards and redemptions')
    .addTag('notifications', 'In-app and push notifications')
    .addTag('health', 'Service health')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port, '0.0.0.0');

  // eslint-disable-next-line no-console
  console.log(
    `\n  PhoneGuard API ready\n  → http://localhost:${port}/${apiPrefix}\n  → docs: http://localhost:${port}/${apiPrefix}/docs\n`,
  );
}

void bootstrap();
