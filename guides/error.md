# Error handling in this Express app

This guide follows an error from the first request to the final response. It explains the files that take part in that flow, what each one does, and why the project handles errors in more than one place.

## The short version

For an API request, the usual path is:

```text
server.js
  -> app.js middleware
  -> route file
  -> controller
  -> model or database
  -> catchAsync or next(error)
  -> controllers/errorController.js
  -> JSON response
```

An error can begin at several points. A request can contain invalid JSON, a route may not exist, a database ID may have the wrong shape, a model rule may reject a value, or a unique database field may already be in use. The app turns known errors into safe, useful responses. Unknown programming errors get a generic response in production so internal details are not sent to a client.

## File order: from starting the app to handling a request

The files have different jobs. Read and follow them in this order:

```text
package.json
  -> server.js
      -> app.js
          -> routes/tourRoutes.js
              -> controllers/tourController.js
                  -> utils/catchAsync.js
                  -> models/tourModel.js
          -> controllers/errorController.js
              -> utils/appError.js
```

`package.json` names the command. For example, `npm start:dev` (written as `npm run start:dev`) uses Nodemon to run `server.js`. The server loads settings, connects to MongoDB, then tells the app to listen for requests. The app sets up middleware and mounts routes. A route chooses a controller. The controller does the work, often by calling the Tour model. If the work fails, the error goes back through Express to the shared error controller. The error controller may use `AppError`, then writes a JSON response.

The order inside `app.js` is also important:

```text
read JSON -> log request -> add request time -> check routes
  -> if no route matched, create 404 -> shared error controller
```

Malformed JSON fails at the first step. Since `express.json()` is already followed by the shared error controller in the middleware stack, its parsing error can still be formatted even though no route ran.

## Follow one request in order

### 1. `server.js` starts the process

`server.js` is the entry point used by the start scripts in `package.json`.

1. It loads `config.env` with `dotenv` so values such as `DATABASE`, `PORT`, and `NODE_ENV` are available.
2. It imports the Express app from `app.js`.
3. It connects Mongoose to MongoDB.
4. After the database connection succeeds, it starts listening for HTTP requests with `app.listen()`.
5. If the connection fails, it logs the error and exits with a failure code. It does not start an API server that cannot use its database.
6. It listens for `unhandledRejection` and `uncaughtException`. These are process-level errors that were not handled by normal request code. The server logs the problem and shuts down.

The `unhandledRejection` event is for a Promise that fails without a `.catch()`. The `uncaughtException` event is for a synchronous error that escapes all `try/catch` blocks. These are last-resort process handlers. Normal request errors should go through Express instead.

### 2. `app.js` prepares the Express request flow

`app.js` creates the Express app and adds middleware in order. Middleware order matters because Express runs middleware from top to bottom.

1. `express.json()` reads a JSON request body. If the body is malformed, this middleware creates a parsing error before a route controller runs.
2. Morgan logs incoming requests.
3. A small middleware adds `req.requestTime`.
4. The app mounts the tour routes at `/api/v1/tours` and user routes at `/api/v1/users`.
5. A final `app.all('*', ...)` handles requests that did not match any route. It creates an `AppError` with status `404` and passes it to Express with `next(error)`.
6. `errorController` is mounted last. Express recognizes it as an error middleware because it has four parameters: `(err, req, res, next)`.

The error controller must come after the routes and the not-found handler. Otherwise, an error raised by those earlier steps would not reach it.

### 3. A route file chooses a controller

`routes/tourRoutes.js` connects HTTP methods and URL patterns to functions in `controllers/tourController.js`. For example, `GET /api/v1/tours/:id` calls `getTour`; `PATCH` and `DELETE` for the same path call their matching controller functions.

The more specific tour routes (such as `/top-5-cheap` and `/tour-stats`) are listed before `/:id`. This keeps Express from treating those route names as an ID.

`routes/userRoutes.js` connects user URLs to `controllers/userController.js`. Those controller functions are placeholders today: they send their own `500` JSON response with `not defined yet`. Since they send a response directly, that placeholder response does not pass through the shared error controller.

### 4. A controller runs the request work

`controllers/tourController.js` contains the tour request handlers. The handlers for database operations use `catchAsync` from `utils/catchAsync.js`.

`catchAsync` wraps an async controller. If the controller's Promise rejects, it calls `next(error)`. That hands the error back to Express, which searches for the next error middleware: `controllers/errorController.js`.

This wrapper is useful because a rejected database query does not get lost or leave the request without a response. The controller can focus on the successful case, while one shared handler formats errors.

The `getTour`, `updateTour`, and `deleteTour` controllers check whether the database returned a tour. A valid ID that does not match any record becomes an `AppError` with status `404` and message `No tour found with that ID`. That differs from an invalid ID: an invalid ID cannot be converted to the database ID type at all.

The update controller sets `runValidators: true`. This asks Mongoose to check model rules for values in an update. For example, a rating greater than five is rejected by the model and becomes a validation error.

### 5. The model can reject database input

`models/tourModel.js` defines the Tour schema and its rules. Those rules can cause errors that the error controller recognizes:

- `_id` is expected to be a MongoDB ObjectId. A value like `bad-id` causes a Mongoose `CastError`.
- The tour name is marked `unique`. If MongoDB already contains that name, MongoDB reports duplicate-key error code `11000`.
- Required fields, allowed difficulty values, string checks, rating minimum and maximum, and the discount rule can cause Mongoose validation errors.
- The rating range is 1 through 5. Sending `ratingAvg: 6` causes the message `Rating should be 5 or less`.

Mongoose validation errors and MongoDB duplicate-key errors are different. A duplicate-key error comes from the database index; `unique: true` is not a normal Mongoose validator. That is why the error controller checks for error code `11000` separately.

## How an error is created and written to the response

There are two common ways an error enters the shared flow.

**The app already knows what went wrong.** A controller or `app.js` creates an `AppError` directly. For example:

```js
return next(new AppError('No tour found with that ID', 404));
```

`next(error)` tells Express to skip normal middleware and move to an error middleware. The error is not written to the response at this point; it is passed along for the shared handler to format.

**A library or middleware reports the problem.** Mongoose may reject a query with a `CastError` or `ValidationError`; MongoDB may reject a duplicate value with code `11000`; JSON parsing may fail in `express.json()`. In an async tour controller, `catchAsync` catches a rejected Promise and calls `next(error)`. For malformed JSON, Express passes the parser error to the same error middleware without calling a controller.

The shared handling and response-writing flow is:

```text
original error
  -> errorController calls handleError(err)
  -> handleError selects a conversion helper, if needed
  -> helper returns an AppError with a message and status code
  -> errorController selects development or production output
  -> sendErrorDev / sendErrorProd calls res.status(...).json(...)
  -> Express sends that JSON to the client
```

For example, when a request contains `ratingAvg: 6`, Mongoose rejects the update because the model's maximum is 5. `catchAsync` passes that validation error to Express. `handleError` recognizes `ValidationError`; `handleValidationErrorDB` collects its message and makes an `AppError` with status `400`. In production, `sendErrorProd` sees that this is an expected error (`isOperational` is true) and sends the status and message as JSON.

This separation is useful: controllers describe what happened, conversion helpers make known database errors easier to read, and the send functions decide how much detail the client should receive.

### Adding another error type

When a new library error needs a friendlier response, follow the existing pattern:

1. Find the source error and the property that identifies it, such as `err.code` or `err.name`.
2. Write a small helper that accepts that error and returns an `AppError` with a clear message and the right status code.
3. Add a matching check in `handleError(err)` so it calls that helper.
4. Keep response writing in `sendErrorDev` and `sendErrorProd`. Do not send a response inside the conversion helper.

For an error the app creates itself, such as “tour not found,” use `next(new AppError(message, 404))` in the controller. For an async database failure, let the error reach `catchAsync` and the shared error controller. Avoid sending a response and calling `next(error)` for the same request; that can attempt to send two responses.

## What `controllers/errorController.js` does

This is the shared API error handler. It has small helper functions so each kind of known error can be translated in one place.

### Error conversion helpers

- `handleCastErrorDB(err)` changes a database cast error into a `400` response. It uses the bad value in the message. Mongoose calls the ID path `_id`, so the helper calls it `id` in the response.
- `handleDuplicateFieldsDB(err)` checks MongoDB error code `11000`. It reads `err.keyValue` to name the duplicate field and value. If MongoDB did not include that detail, it uses a general duplicate-value message.
- `handleValidationErrorDB(err)` collects the individual messages from a Mongoose `ValidationError` and returns them as one `400` message.
- `handleJSONParseError()` turns Express/body-parser's `entity.parse.failed` error into a short `400` message for malformed JSON.
- `handleError(err)` selects the matching helper. If the error is not one of these types, it returns the original error unchanged.

These helpers return an `AppError`. They do not send a response themselves. This keeps error conversion separate from choosing the response format.

### Development and production responses

After conversion, the error middleware ensures an error has a status code and status label. It then chooses a response based on `NODE_ENV`:

- In development, `sendErrorDev` includes the error object, message, and stack. This detail helps the developer find where a bug started. Do not expose this response publicly in production.
- In production, `sendErrorProd` sends the message for an operational `AppError`, such as an invalid ID or validation failure. For an unexpected programming error, it logs the full error on the server and sends only `Something went very wrong` to the client.

`AppError.isOperational` marks errors that the app expects and knows how to explain. It is set by `utils/appError.js`.

## `utils/appError.js`: expected errors

`AppError` is a small custom error class. It extends JavaScript's normal `Error` and adds:

- `statusCode`, such as `400` or `404`;
- `status`, set to `fail` for a 4xx response and `error` for other statuses;
- `isOperational`, set to `true` so production can safely return its message.

Controllers use it for known situations such as a missing tour or missing URL. The error controller also uses it when it converts Mongoose, MongoDB, and JSON parsing errors.

## The test file and test command

`tests/errorHandling.test.js` sends real HTTP requests to the Express app with `NODE_ENV=production`. It checks that:

1. An invalid tour ID returns `400` and includes the ID value.
2. A rating above the model's maximum returns `400` and a validation message.
3. JSON with a non-breaking space returns `400` and a JSON parsing message.

These tests cover the actual middleware and route flow, not just a helper function. `package.json` has a `test` script that runs the files matching `tests/*.test.js` with Node's test runner. The duplicate-key response has been added to the handler; the current test file does not include a duplicate-key test.

## Related files that do not use the shared handler

- `dev-data/data/import-dev-data.js` loads seed data directly into MongoDB. It has its own `try/catch` around the import and logs failures itself. It does not send an HTTP response, so Express's error controller is not involved. Importing the same unique tour names twice can trigger the same MongoDB duplicate-key error.
- `dev-data/templates/errorTemplate.pug` is an older page template with a general error message. The current app does not render it: the API error controller sends JSON instead.
- `utils/APIFeatures.js` builds list-query options such as filter, sort, fields, and pagination. It does not format errors. If a query it builds fails inside an async controller, `catchAsync` passes that failure to the shared error controller.
- `controllers/userController.js` currently sends placeholder errors directly. It does not use `AppError` or the shared handler yet.

## Why the first error looked confusing

The first report described an invalid ID, but the request that was later shared was:

```http
PATCH /api/v1/tours/6ac644f9fe21c09b43ace141
```

That ID has the right ObjectId shape, so it is not an invalid-ID cast error. The request body contained `{"ratingAvg":6}`, but the model allows a maximum rating of 5. Mongoose raised a validation error, and that error type was not handled at the time. Production therefore returned the generic message.

The pasted request body also contained a non-breaking space before the property name. JSON only allows ordinary whitespace, so that character makes the body invalid and causes a parsing error before the controller runs. Both cases now receive their own clear `400` response.

Use an ID that cannot be parsed as an ObjectId, such as `bad-id`, to see the invalid-ID message. Use a valid-looking ID that is not in the database to get the separate `404` no-tour message.

## Error examples

| Problem | Where it starts | Result |
| --- | --- | --- |
| Malformed JSON | `express.json()` in `app.js` | `400`, invalid JSON message |
| Unknown URL | Final `app.all('*')` in `app.js` | `404`, URL does not exist |
| ID has the wrong shape | Mongoose query from `tourController.js` | `400`, `Invalid id : <value>` |
| Valid-shaped ID has no matching tour | Tour controller after query | `404`, `No tour found with that ID` |
| Rating is outside 1–5 | `tourModel.js` validator on update | `400`, validation message |
| A unique value already exists | MongoDB unique index | `400`, duplicate field and value |
| Unexpected programming error | Any request code | `500`; details are logged, generic message is sent in production |
