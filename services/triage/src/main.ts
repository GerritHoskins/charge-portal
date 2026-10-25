import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { APP_CONFIG, type AppConfig } from './config'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)
  app.enableShutdownHooks()
  const { port, host } = app.get<AppConfig>(APP_CONFIG)
  await app.listen(port, host)
  new Logger('Triage').log(`GraphQL listening on http://${host}:${port}/graphql`)
}

bootstrap().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
