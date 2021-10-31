---
title: index.ts
nav_order: 1
parent: Modules
---

## index overview

Added in v0.1.0

---

<h2 class="text-delta">Table of contents</h2>

- [Model](#model)
  - [ConnectConnection (class)](#connectconnection-class)
    - [chain (method)](#chain-method)
    - [getRequest (method)](#getrequest-method)
    - [getBody (method)](#getbody-method)
    - [getHeader (method)](#getheader-method)
    - [getParams (method)](#getparams-method)
    - [getQuery (method)](#getquery-method)
    - [getOriginalUrl (method)](#getoriginalurl-method)
    - [getMethod (method)](#getmethod-method)
    - [setCookie (method)](#setcookie-method)
    - [clearCookie (method)](#clearcookie-method)
    - [setHeader (method)](#setheader-method)
    - [setStatus (method)](#setstatus-method)
    - [setBody (method)](#setbody-method)
    - [pipeStream (method)](#pipestream-method)
    - [endResponse (method)](#endresponse-method)
    - [\_S (property)](#_s-property)
- [utils](#utils)
  - [fromRequestHandler](#fromrequesthandler)
  - [toRequestHandler](#torequesthandler)

---

# Model

## ConnectConnection (class)

**Signature**

```ts
export declare class ConnectConnection<S> {
  constructor(
    readonly req: IncomingMessage,
    readonly res: ServerResponse,
    readonly actions: LL.List<Action> = LL.nil,
    readonly ended: boolean = false
  )
}
```

Added in v0.1.0

### chain (method)

**Signature**

```ts
public chain<T>(action: Action, ended = false): ConnectConnection<T>
```

Added in v0.1.0

### getRequest (method)

**Signature**

```ts
public getRequest(): IncomingMessage
```

Added in v0.1.0

### getBody (method)

**Signature**

```ts
public getBody(): unknown
```

Added in v0.1.0

### getHeader (method)

**Signature**

```ts
public getHeader(name: string): unknown
```

Added in v0.1.0

### getParams (method)

`connect` doesn't have a router, so this will always return `undefined`.
For a type safe router, see [fp-ts-routing](https://github.com/gcanti/fp-ts-routing).

**Signature**

```ts
public getParams(): unknown
```

Added in v0.1.0

### getQuery (method)

**Signature**

```ts
public getQuery(): unknown
```

Added in v0.1.0

### getOriginalUrl (method)

**Signature**

```ts
public getOriginalUrl(): string
```

Added in v0.1.0

### getMethod (method)

**Signature**

```ts
public getMethod(): string
```

Added in v0.1.0

### setCookie (method)

Not implemented.

**Signature**

```ts
public setCookie(
    name: string,
    value: string,
    options: H.CookieOptions,
  ): ConnectConnection<H.HeadersOpen>
```

Added in v0.1.0

### clearCookie (method)

Not implemented.

**Signature**

```ts
public clearCookie(
    name: string,
    options: H.CookieOptions,
  ): ConnectConnection<H.HeadersOpen>
```

Added in v0.1.0

### setHeader (method)

**Signature**

```ts
public setHeader(
    name: string,
    value: string,
  ): ConnectConnection<H.HeadersOpen>
```

Added in v0.1.0

### setStatus (method)

**Signature**

```ts
public setStatus(status: H.Status): ConnectConnection<H.HeadersOpen>
```

Added in v0.1.0

### setBody (method)

**Signature**

```ts
public setBody(body: string | Buffer): ConnectConnection<H.ResponseEnded>
```

Added in v0.1.0

### pipeStream (method)

**Signature**

```ts
public pipeStream(
    stream: NodeJS.ReadableStream,
  ): ConnectConnection<H.ResponseEnded>
```

Added in v0.1.0

### endResponse (method)

**Signature**

```ts
public endResponse(): ConnectConnection<H.ResponseEnded>
```

Added in v0.1.0

### \_S (property)

**Signature**

```ts
readonly _S: S
```

Added in v0.1.0

# utils

## fromRequestHandler

**Signature**

```ts
export declare const fromRequestHandler: <I = H.StatusOpen, E = never, A = never>(
  requestHandler: C.NextHandleFunction,
  f: (req: IncomingMessage) => E.Either<E, A>,
  onError: (reason: unknown) => E
) => M.Middleware<I, I, E, A>
```

Added in v0.1.0

## toRequestHandler

**Signature**

```ts
export declare const toRequestHandler: <I, O, L>(middleware: M.Middleware<I, O, L, void>) => C.NextHandleFunction
```

Added in v0.1.0
