import { pipe } from 'fp-ts/function'
import * as RR from 'fp-ts/ReadonlyRecord'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { end, lit, Parser, Route, then, type, zero } from 'fp-ts-routing'
import * as H from 'hyper-ts'
import * as t from 'io-ts'
import connect from 'connect'
import { toRequestHandler } from '../src'
import * as http from 'http'

const HttpMethod = t.keyof({
  get: null,
  post: null,
  patch: null,
  put: null,
})
type HttpMethod = t.TypeOf<typeof HttpMethod>

class NotFound {
  readonly _type = 'NotFound'
}
class MethodNotAllowed {
  readonly _type = 'MethodNotAllowed'
}
class SomeException {
  readonly _type = 'SomeException'
  constructor(readonly error: Error) {}
}
type RouterError = NotFound | MethodNotAllowed | SomeException

const decodeMethod: H.Middleware<
  H.StatusOpen,
  H.StatusOpen,
  RouterError,
  HttpMethod
> = pipe(
  H.decodeMethod((s) => HttpMethod.decode(s.toLowerCase())),
  H.mapLeft(() => new MethodNotAllowed()),
)

const fromParser = <A extends object>(
  parser: Parser<A>,
): H.Middleware<H.StatusOpen, H.StatusOpen, RouterError, A> =>
  H.fromConnection((c) =>
    pipe(
      parser.run(Route.parse(c.getOriginalUrl())),
      O.map(([a]) => E.right(a)),
      O.getOrElse(() => E.left(new NotFound())),
    ),
  )

const sendStatus = (
  status: H.Status,
): H.Middleware<H.StatusOpen, H.ResponseEnded, never, void> =>
  pipe(
    H.status(status),
    H.ichain(() => H.closeHeaders()),
    H.ichain(() => H.end()),
  )

const sendJson = (
  status: H.Status,
  body: unknown,
): H.Middleware<H.StatusOpen, H.ResponseEnded, never, void> =>
  pipe(
    H.status(status),
    H.ichain(() =>
      H.json(body, (err) =>
        err instanceof Error
          ? new SomeException(err)
          : new SomeException(new Error(String(err))),
      ),
    ),
    H.orElse(() => sendStatus(H.Status.InternalServerError)),
  )

export interface RouteHandler
  extends H.Middleware<H.StatusOpen, H.ResponseEnded, RouterError, void> {}

type Handlers<A extends Record<'_type', string>> = {
  [L in A['_type']]: Partial<
    Record<HttpMethod, (params: Extract<A, Record<'_type', L>>) => RouteHandler>
  >
}

const handleRoute = <A extends Record<'_type', string>, H extends Handlers<A>>(
  route: A,
  method: HttpMethod,
  handlers: H,
): RouteHandler => {
  const routeHandlers: Partial<Record<HttpMethod, RouteHandler>> = pipe(
    (handlers as any)[route._type],
    RR.map((h: any): RouteHandler => h(route)),
  )
  return routeHandlers[method] ?? sendStatus(H.Status.MethodNotAllowed)
}

const routerMiddleware = <
  A extends Record<'_type', string>,
  M extends Handlers<A>,
>(
  routes: Parser<A>,
  handlers: M,
): H.Middleware<H.StatusOpen, H.ResponseEnded, never, void> =>
  pipe(
    fromParser(routes),
    H.bindTo('route'),
    H.bind('method', () => decodeMethod),
    H.ichain(({ route, method }) => handleRoute(route, method, handlers)),
    H.orElse((err) =>
      err instanceof MethodNotAllowed
        ? sendStatus(H.Status.MethodNotAllowed)
        : sendStatus(H.Status.NotFound),
    ),
  )

class Health {
  readonly _type = 'Health'
}

class Users {
  readonly _type = 'Users'
}

class User {
  readonly _type = 'User'
  constructor(readonly username: string) {}
}

type Location = Health | Users | User

const healthMatch = pipe(lit('health'), then(end))
const usersMatch = pipe(lit('users'), then(end))
const userMatch = pipe(lit('user'), then(type('username', t.string)), then(end))

const router = zero<Location>()
  .alt(healthMatch.parser.map(() => new Health()))
  .alt(usersMatch.parser.map(() => new Users()))
  .alt(userMatch.parser.map((params) => new User(params.username)))

interface UserR {
  username: string
  email: string
}

const users: Readonly<Record<string, UserR>> = {
  ninkasi: {
    username: 'ninkasi',
    email: 'ninkasi@bee.rs',
  },
}

const getUsersHandler = (): RouteHandler =>
  sendJson(H.Status.OK, Object.values(users))

const getUserHandler = (params: { username: string }): RouteHandler =>
  pipe(
    users,
    RR.lookup(params.username),
    O.match(
      () => sendStatus(H.Status.NotFound),
      (user) => sendJson(H.Status.OK, user),
    ),
  )

export const handlers: {
  [L in Location['_type']]: Partial<
    Record<
      HttpMethod,
      (params: Extract<Location, Record<'_type', L>>) => RouteHandler
    >
  >
} = {
  Health: { get: () => sendStatus(H.Status.OK) },
  Users: { get: getUsersHandler },
  User: { get: getUserHandler },
}

const app = connect()
app.use(toRequestHandler(routerMiddleware(router, handlers)))
http.createServer(app).listen(3000)
