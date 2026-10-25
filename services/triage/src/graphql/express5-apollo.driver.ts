import { ApolloServer, type ApolloServerOptions, type BaseContext } from '@apollo/server'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo'
import { Injectable } from '@nestjs/common'
import { expressMiddleware } from '@as-integrations/express5'

/**
 * ApolloDriver that imports `@as-integrations/express5` from THIS package instead of letting
 * `@nestjs/apollo` require it.
 *
 * Why: npm hoists `@nestjs/apollo` to the repo-root node_modules, but `@as-integrations/express5`
 * (peer `express ^5`) stays in services/triage/node_modules because the root already holds express 4
 * for @lhci/cli. A package hoisted to the root cannot see a sibling that is nested in a workspace, so
 * the stock driver fails with 'The "@as-integrations/express5" package is missing'. The body below is
 * `ApolloBaseDriver.registerExpress` from @nestjs/apollo 13.4.5 with only the import changed.
 * Remove this file when the dependency tree allows the stock `ApolloDriver` (check on upgrades).
 */
@Injectable()
export class Express5ApolloDriver extends ApolloDriver {
  protected override async registerExpress(
    options: ApolloDriverConfig,
    { preStartHook }: { preStartHook?: () => void } = {},
  ): Promise<void> {
    const { path, typeDefs, resolvers, schema } = options
    const httpAdapter = this.httpAdapterHost.httpAdapter
    // The Apollo express middleware requires `req.body`; body-parser leaves it unset for empty payloads.
    httpAdapter.use(path, (req: { body?: unknown }, _res: unknown, next: () => void) => {
      req.body = req.body ?? {}
      next()
    })
    const app = httpAdapter.getInstance()
    const drainHttpServerPlugin = ApolloServerPluginDrainHttpServer({ httpServer: httpAdapter.getHttpServer() })
    preStartHook?.()
    // Nest hands over a loosely typed options bag (typeDefs may be undefined when `schema` is set).
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      schema,
      ...options,
      plugins: options.plugins ? options.plugins.concat([drainHttpServerPlugin]) : [drainHttpServerPlugin],
    } as ApolloServerOptions<BaseContext>)
    await server.start()
    app.use(path, expressMiddleware(server, { context: options.context }))
    this.apolloServer = server
  }
}
