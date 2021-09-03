import * as assert from 'assert'
import * as E from 'fp-ts/Either'
import { flow, pipe } from 'fp-ts/function'
import * as H from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as t from 'io-ts'
import { failure } from 'io-ts/lib/PathReporter'
import { fromRequestHandler, toRequestHandler } from '../src'
import connect from 'connect'
import supertest from 'supertest'
import * as bodyParser from 'body-parser'
import { Readable } from 'stream'

export const sendStatus = <E>(
  status: H.Status,
): M.Middleware<H.StatusOpen, H.ResponseEnded, E, void> =>
  pipe(
    M.status(status),
    M.ichain(() => M.closeHeaders()),
    M.ichain(() => M.end()),
  )

export const sendOK = <E>() => sendStatus<E>(H.Status.OK)

describe('ConnectConnection', () => {
  describe('getOriginalUrl', () => {
    it('should return the URL', () => {
      const server = connect()
      const somePath = '/users?q=Ninkasi'
      const m = pipe(
        M.fromConnection((c) => E.right(c.getOriginalUrl())),
        M.chain((url) => M.rightIO(() => assert.strictEqual(url, somePath))),
        M.ichain(() => sendOK()),
      )
      server.use(toRequestHandler(m))

      return supertest(server).get(somePath).expect(200)
    })
  })

  describe('status', () => {
    it('should write the status code', () => {
      const server = connect()
      const m = pipe(
        M.status(H.Status.OK),
        M.ichain(() => M.closeHeaders()),
        M.ichain(() => M.end()),
      )
      server.use(toRequestHandler(m))

      return supertest(server).get('/').expect(200)
    })
  })

  describe('header', () => {
    it('should write the headers', () => {
      const server = connect()
      const m = pipe(
        M.status(H.Status.OK),
        M.ichain(() => M.header('name', 'value')),
        M.ichain(() => M.closeHeaders()),
        M.ichain(() => M.end()),
      )
      server.use(toRequestHandler(m))

      return supertest(server).get('/').expect(200).expect('name', 'value')
    })
  })

  describe('send', () => {
    it('should send the content', () => {
      const server = connect()
      const m = pipe(
        M.status(H.Status.OK),
        M.ichain(() => M.closeHeaders()),
        M.ichain(() => M.send('This is the content')),
      )
      server.use(toRequestHandler(m))

      return supertest(server).get('/').expect(200, 'This is the content')
    })
  })

  describe('json', () => {
    it('should add the proper header and send the content', () => {
      const server = connect()
      const m = pipe(
        M.status(H.Status.OK),
        M.ichain(() => M.json({ a: 1 }, E.toError)),
      )
      server.use(toRequestHandler(m))

      return supertest(server)
        .get('/')
        .expect(200, '{"a":1}')
        .expect('content-type', 'application/json')
    })
  })

  describe('contentType', () => {
    it('should add the `Content-Type` header', () => {
      const server = connect()
      const m = pipe(
        M.status(H.Status.OK),
        M.ichain(() => M.contentType(H.MediaType.applicationXML)),
        M.ichain(() => M.closeHeaders()),
        M.ichain(() => M.end()),
      )
      server.use(toRequestHandler(m))

      return supertest(server)
        .get('/')
        .expect(200)
        .expect('content-type', 'application/xml')
    })
  })

  describe('redirect', () => {
    it('should add the correct status / header', () => {
      const server = connect()
      const m = pipe(
        M.redirect('/users'),
        M.ichain(() => M.closeHeaders()),
        M.ichain(() => M.end()),
      )
      server.use(toRequestHandler(m))

      return supertest(server).get('/').expect(302).expect('location', '/users')
    })
  })

  describe('decodeQuery', () => {
    it('should validate a query (success case 1)', () => {
      const Query = t.type({ q: t.string })
      const server = connect()
      const m = pipe(
        M.decodeQuery(Query.decode),
        M.chain((query) =>
          M.rightIO(() => assert.deepStrictEqual(query, { q: 'tobi ferret' })),
        ),
        M.ichain(() => sendOK()),
      )
      server.use(toRequestHandler(m))

      return supertest(server).get('/?q=tobi+ferret').expect(200)
    })

    it('should validate a query (success case 2)', () => {
      const Query = t.type({
        order: t.string,
        shoe: t.type({ color: t.string, type: t.string }),
      })
      const server = connect()
      const m = pipe(
        M.decodeQuery(Query.decode),
        M.chain((query) =>
          M.rightIO(() =>
            assert.deepStrictEqual(query, {
              order: 'desc',
              shoe: { color: 'blue', type: 'converse' },
            }),
          ),
        ),
        M.ichain(() => sendOK()),
      )
      server.use(toRequestHandler(m))

      return supertest(server)
        .get('/?order=desc&shoe[color]=blue&shoe[type]=converse')
        .expect(200)
    })

    it('should validate a query (failure case)', () => {
      const Query = t.type({ q: t.number })
      const server = connect()
      const m = pipe(
        M.decodeQuery(Query.decode),
        M.ichain(() => sendOK()),
        M.orElse((errors) =>
          pipe(
            M.rightIO(() =>
              assert.deepStrictEqual(failure(errors), [
                'Invalid value "tobi ferret" supplied to : { q: number }/q: number',
              ]),
            ),
            M.ichain(() => sendStatus(H.Status.BadRequest)),
          ),
        ),
      )
      server.use(toRequestHandler(m))

      return supertest(server).get('/?q=tobi+ferret').expect(400)
    })
  })

  describe('decodeMethod', () => {
    const HttpMethod = t.keyof({
      GET: null,
      POST: null,
    })

    it('should validate the method (success case)', () => {
      const server = connect()
      const m = pipe(
        M.decodeMethod(HttpMethod.decode),
        M.chain((method) =>
          M.rightIO(() => assert.deepStrictEqual(method, 'GET')),
        ),
        M.ichain(() => sendOK()),
      )
      server.use(toRequestHandler(m))

      return supertest(server).get('/').expect(200)
    })

    it('should validate the method (failure case)', () => {
      const server = connect()
      server.use(bodyParser.json())
      const m = pipe(
        M.decodeMethod(HttpMethod.decode),
        M.ichain(() => sendOK()),
        M.orElse((errors) =>
          pipe(
            M.rightIO(() =>
              assert.deepStrictEqual(failure(errors), [
                'Invalid value "PATCH" supplied to : "GET" | "POST"',
              ]),
            ),
            M.ichain(() => sendStatus(H.Status.MethodNotAllowed)),
          ),
        ),
      )
      server.use(toRequestHandler(m))

      return supertest(server).patch('/').expect(405)
    })
  })

  describe('decodeBody', () => {
    it('should validate the body (success case)', () => {
      const Body = t.type({ x: t.number })
      const server = connect()
      server.use(bodyParser.json())
      const m = pipe(
        M.decodeBody(Body.decode),
        M.chain((body) =>
          M.rightIO(() => assert.deepStrictEqual(body, { x: 42 })),
        ),
        M.ichain(() => sendOK()),
      )
      server.use(toRequestHandler(m))

      return supertest(server).post('/').send({ x: 42 }).expect(200)
    })

    it('should validate the body (failure case)', () => {
      const Body = t.type({ x: t.number })
      const server = connect()
      server.use(bodyParser.json())
      const m = pipe(
        M.decodeBody(Body.decode),
        M.ichain(() => sendOK()),
        M.orElse((errors) =>
          pipe(
            M.rightIO(() =>
              assert.deepStrictEqual(failure(errors), [
                'Invalid value "a" supplied to : number',
              ]),
            ),
            M.ichain(() => sendStatus(H.Status.BadRequest)),
          ),
        ),
      )
      server.use(toRequestHandler(m))

      return supertest(server).post('/').send({ x: 42 }).expect(200)
    })
  })

  describe('decodeHeader', () => {
    it('should validate a header (success case)', () => {
      const server = connect()
      const m = pipe(
        M.decodeHeader('token', t.string.decode),
        M.chain((header) =>
          M.rightIO(() => assert.strictEqual(header, 'mytoken')),
        ),
        M.ichain(() => sendOK()),
      )
      server.use(toRequestHandler(m))

      return supertest(server).get('/').set('token', 'mytoken').expect(200)
    })

    it('should validate a header (failure case)', () => {
      const server = connect()
      const m = pipe(
        M.decodeHeader('token', t.string.decode),
        M.ichain(() => sendOK()),
        M.orElse((errors) =>
          pipe(
            M.rightIO(() =>
              assert.deepStrictEqual(failure(errors), [
                'Invalid value undefined supplied to : string',
              ]),
            ),
            M.ichain(() => sendStatus(H.Status.BadRequest)),
          ),
        ),
      )
      server.use(toRequestHandler(m))

      return supertest(server).get('/').expect(400)
    })
  })

  it('should handle the error', () => {
    const server = connect()
    const m = pipe(
      M.left<H.StatusOpen, string, void>('error'),
      M.ichain(() => sendOK()),
    )
    server.use(toRequestHandler(m))

    return supertest(server).get('/').expect(500)
  })

  describe('fromRequestHandler', () => {
    const jsonMiddleware = fromRequestHandler(
      bodyParser.json(),
      () => E.right(undefined),
      () => 'oops',
    )

    const Body = t.type({ name: t.string })
    const bodyDecoder = pipe(
      jsonMiddleware,
      M.ichain(() =>
        M.decodeBody(
          flow(
            Body.decode,
            E.mapLeft(() => 'invalid body'),
          ),
        ),
      ),
    )

    const helloHandler = pipe(
      bodyDecoder,
      M.ichain(({ name }) =>
        pipe(
          M.status<string>(H.Status.OK),
          M.ichain(() => M.closeHeaders()),
          M.ichain(() => M.send(`Hello ${name}!`)),
        ),
      ),
      M.orElse((err) =>
        pipe(
          M.status(H.Status.BadRequest),
          M.ichain(() => M.closeHeaders()),
          M.ichain(() => M.send(err)),
        ),
      ),
    )

    const server = connect()
    server.use(toRequestHandler(helloHandler))

    it('should return 200', () =>
      supertest(server)
        .post('/')
        .send({ name: 'Ninkasi' })
        .expect(200, 'Hello Ninkasi!'))

    it('should return 400', () =>
      supertest(server).post('/').send({}).expect(400, 'invalid body'))
  })

  describe('pipeStream', () => {
    it('should pipe a stream', () => {
      const server = connect()
      const someStream = (): Readable => {
        const stream = new Readable()
        setTimeout(() => {
          stream.push('a')
          stream.push(null)
        }, 1)
        return stream
      }

      const stream = someStream()
      const m = pipe(
        M.status(H.Status.OK),
        M.ichain(() => M.closeHeaders()),
        M.ichain(() => M.pipeStream(stream)),
      )
      server.use(toRequestHandler(m))

      return supertest(server).get('/').expect(200, 'a')
    })
  })
})
