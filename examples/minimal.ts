import connect from 'connect'
import { pipe } from 'fp-ts/function'
import * as H from 'hyper-ts'
import { toRequestHandler } from '../src'
import * as http from 'http'

const app = connect()
app.use(
  toRequestHandler(
    pipe(
      H.status(H.Status.OK),
      H.ichain(() => H.closeHeaders()),
      H.ichain(() => H.end()),
    ),
  ),
)
http.createServer(app).listen(3000)
