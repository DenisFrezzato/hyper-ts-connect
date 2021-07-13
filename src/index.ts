/**
 * @since 0.1.0
 */
import * as C from 'connect'
import * as LL from 'fp-ts-contrib/lib/List'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { IncomingMessage, ServerResponse } from 'http'
import * as H from 'hyper-ts'
import { Readable } from 'stream'
import * as qs from 'qs'

/**
 * @internal
 */
export type Action =
  | { type: 'setBody'; body: unknown }
  | { type: 'endResponse' }
  | { type: 'setStatus'; status: H.Status }
  | { type: 'setHeader'; name: string; value: string }
  | { type: 'clearCookie'; name: string; options: H.CookieOptions }
  | { type: 'setCookie'; name: string; value: string; options: H.CookieOptions }
  | { type: 'pipeStream'; stream: Readable }

const endResponse: Action = { type: 'endResponse' }

/**
 * @category Model
 * @since 0.1.0
 */
export class ConnectConnection<S> implements H.Connection<S> {
  /**
   * @since 0.1.0
   */
  public readonly _S!: S
  constructor(
    readonly req: IncomingMessage,
    readonly res: ServerResponse,
    readonly actions: LL.List<Action> = LL.nil,
    readonly ended: boolean = false,
  ) {}
  /**
   * @since 0.1.0
   */
  public chain<T>(action: Action, ended = false): ConnectConnection<T> {
    return new ConnectConnection<T>(
      this.req,
      this.res,
      LL.cons(action, this.actions),
      ended,
    )
  }
  /**
   * @since 0.1.0
   */
  public getRequest(): IncomingMessage {
    return this.req
  }
  /**
   * @since 0.1.0
   */
  public getBody(): unknown {
    return (this.req as any).body
  }
  /**
   * @since 0.1.0
   */
  public getHeader(name: string): unknown {
    return this.req.headers[name]
  }
  /**
   * @since 0.1.0
   */
  public getParams(): unknown {
    return undefined
  }
  /**
   * @since 0.1.0
   */
  public getQuery(): unknown {
    return qs.parse(this.req.url!.split('?')[1])
  }
  /**
   * @since 0.1.0
   */
  public getOriginalUrl(): string {
    return this.req.url!
  }
  /**
   * @since 0.1.0
   */
  public getMethod(): string {
    return this.req.method!
  }
  /**
   * @since 0.1.0
   */
  public setCookie(
    name: string,
    value: string,
    options: H.CookieOptions,
  ): ConnectConnection<H.HeadersOpen> {
    return this.chain({ type: 'setCookie', name, value, options })
  }
  /**
   * @since 0.1.0
   */
  public clearCookie(
    name: string,
    options: H.CookieOptions,
  ): ConnectConnection<H.HeadersOpen> {
    return this.chain({ type: 'clearCookie', name, options })
  }
  /**
   * @since 0.1.0
   */
  public setHeader(
    name: string,
    value: string,
  ): ConnectConnection<H.HeadersOpen> {
    return this.chain({ type: 'setHeader', name, value })
  }
  /**
   * @since 0.1.0
   */
  public setStatus(status: H.Status): ConnectConnection<H.HeadersOpen> {
    return this.chain({ type: 'setStatus', status })
  }
  /**
   * @since 0.1.0
   */
  public setBody(body: unknown): ConnectConnection<H.ResponseEnded> {
    return this.chain({ type: 'setBody', body }, true)
  }
  /**
   * @since 0.1.0
   */
  public pipeStream(stream: Readable): ConnectConnection<H.ResponseEnded> {
    return this.chain({ type: 'pipeStream', stream }, true)
  }
  /**
   * @since 0.1.0
   */
  public endResponse(): ConnectConnection<H.ResponseEnded> {
    return this.chain(endResponse, true)
  }
}

const run = (res: ServerResponse, action: Action): ServerResponse => {
  switch (action.type) {
    case 'clearCookie':
      console.warn('clearCookie is not implemented')
      return res
    case 'endResponse':
      res.end()
      return res
    case 'setBody':
      res.end(action.body)
      return res
    case 'setCookie':
      console.warn('setCookie is not implemented')
      return res
    case 'setHeader':
      res.setHeader(action.name, action.value)
      return res
    case 'setStatus':
      res.statusCode = action.status
      return res
    case 'pipeStream':
      return action.stream.pipe(res)
  }
}

const exec =
  <I, O, L>(middleware: H.Middleware<I, O, L, void>) =>
  (
    req: IncomingMessage,
    res: ServerResponse,
    next: C.NextFunction,
  ): Promise<void> =>
    H.execMiddleware(middleware, new ConnectConnection<I>(req, res))().then(
      E.fold(next, (c) => {
        const { actions: list, res, ended } = c as ConnectConnection<O>
        const len = list.length
        const actions = LL.toReversedArray(list)
        for (let i = 0; i < len; i++) {
          run(res, actions[i])
        }
        if (!ended) {
          next()
        }
      }),
    )

/**
 * @since 0.1.0
 */
export const toRequestHandler = <I, O, L>(
  middleware: H.Middleware<I, O, L, void>,
): C.NextHandleFunction => exec(middleware)

/**
 * @since 0.1.0
 */
export const fromRequestHandler =
  <I = H.StatusOpen, E = never, A = never>(
    requestHandler: C.NextHandleFunction,
    f: (req: IncomingMessage) => E.Either<E, A>,
    onError: (reason: unknown) => E,
  ): H.Middleware<I, I, E, A> =>
  (c) =>
  () =>
    new Promise((resolve) => {
      const { req, res } = c as ConnectConnection<I>
      requestHandler(req, res, (err: unknown) =>
        err
          ? resolve(E.left(onError(err)))
          : pipe(
              req,
              f,
              E.map((a): [A, H.Connection<I>] => [a, c]),
              resolve,
            ),
      )
    })
