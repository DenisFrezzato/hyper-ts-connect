# Changelog

## 0.4.1 - 2026-08-18

### Fixed

- `ConnectConnection#pipeStream` no longer pipes into a destroyed response. Actions are replayed after the middleware
  has completed, so the client may have disconnected in the meanwhile; piping into a destroyed stream threw
  `ERR_STREAM_UNABLE_TO_PIPE` synchronously and leaked the source stream. The source stream is now destroyed instead.
- `toRequestHandler` now declares its actual `Promise<void>` return type, instead of connect's `NextHandleFunction`,
  which types the return as `void`.

## 0.4.0 - 2026-08-11

### Breaking

- Require `hyper-ts` `^0.8.0`, `fp-ts` `^2.14.0` and `fp-ts-contrib` `^0.1.26` as peer dependencies.
- `ConnectConnection#pipeStream` now takes an `onError: (e: unknown) => IO<void>` handler, as required by
  `hyper-ts`'s `Connection` interface. The stream is piped with `stream.pipeline`, so errors are forwarded to the
  handler instead of being unhandled.
- Require Node.js `>=18`.

### Changed

- Updated `qs` to `^6.15.3`.
- Build and type declarations are now emitted with TypeScript `5.9`.

## 0.3.0 - 2026-01-20

### Security

- Updated `qs` package to version 6.14.1 to address security vulnerabilities.

## 0.2.1 - 2021-10-31
