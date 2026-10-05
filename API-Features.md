# API Features — Natours

## Overview

When building a REST API that serves collections of data (like tours), clients need ways to **filter**, **sort**, **select specific fields**, and **paginate** through results. Without these features, every request would return the entire dataset — which is slow, wasteful, and unusable for any real-world front-end.

We encapsulated all of these query features inside a reusable **`APIFeatures`** class located in [`utils/APIFeatures.js`](utils/APIFeatures.js). This class wraps a Mongoose query and applies transformations to it based on the query string parameters sent by the client.

---

## The `APIFeatures` Class

### Why a class?

Before introducing the class, all filtering / sorting / pagination logic lived directly inside the `getAllTours` controller. This had two problems:

1. **The controller was bloated** — it mixed business logic with query-building logic.
2. **It wasn't reusable** — if we later add `getAllUsers`, `getAllReviews`, etc., we'd have to copy-paste the same code.

By extracting it into a class, we get a **single, chainable, reusable** utility that works with _any_ Mongoose model.

### Constructor

```js
class APIFeatures {
  constructor(query, queryString) {
    this.query = query;         // A Mongoose Query object, e.g. Tour.find()
    this.queryString = queryString; // The Express req.query object
  }
}
```

- **`query`** — the Mongoose query we build upon. We pass in `Model.find()` (which returns a query, _not_ the results) so we can keep chaining methods on it before executing.
- **`queryString`** — the raw query string from the request (`req.query`). Each method reads the relevant parameters from here.

### Method chaining

Every method returns `this`, which allows us to chain calls:

```js
const features = new APIFeatures(Tour.find(), req.query)
  .filter()
  .sort()
  .limitFields()
  .paginate();

const tours = await features.query; // execute the final query
```

---

## 1. Filtering

### Concept

Filtering lets the client retrieve only documents that match specific criteria. For example, _"give me only easy tours"_ or _"tours cheaper than $500"_.

### Basic filtering

The client sends field-value pairs as query parameters:

```
GET /api/v1/tours?difficulty=easy&duration=5
```

We copy `req.query`, remove reserved parameters (`page`, `sort`, `limit`, `fields`) that aren't actual filter fields, and pass the rest to `Tour.find()`.

### Advanced filtering (comparison operators)

MongoDB supports operators like `$gte`, `$gt`, `$lte`, `$lt`. The client writes them without the `$`:

```
GET /api/v1/tours?price[gte]=500&ratingsAverage[gte]=4.5
```

Express parses this into: `{ price: { gte: '500' }, ratingsAverage: { gte: '4.5' } }`

We use a regex to prepend `$` to the operator keywords so Mongoose understands them:

```js
queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
// Result: { price: { $gte: '500' }, ratingsAverage: { $gte: '4.5' } }
```

### Implementation

```js
filter() {
  const queryObj = { ...this.queryString };
  const excludedFields = ['page', 'sort', 'limit', 'fields'];
  excludedFields.forEach((el) => delete queryObj[el]);

  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

  this.query = this.query.find(JSON.parse(queryStr));
  return this;
}
```

---

## 2. Sorting

### Concept

Sorting lets the client control the order of the results. For example, _"show me the cheapest tours first"_ or _"show the highest-rated tours first"_.

### How the client uses it

```
GET /api/v1/tours?sort=price          → ascending by price
GET /api/v1/tours?sort=-price         → descending by price (the - prefix)
GET /api/v1/tours?sort=-price,ratingsAverage → first by price desc, then by ratingsAverage asc (tie-breaker)
```

Mongoose's `.sort()` expects fields separated by spaces (`-price ratingsAverage`), but URLs use commas. So we split by comma and join by space.

### Default sort

If the client doesn't specify a sort, we default to `-createdAt` (newest first) so that newly added documents always appear at the top.

### Implementation

```js
sort() {
  if (this.queryString.sort) {
    const sortBy = this.queryString.sort.split(',').join(' ');
    this.query = this.query.sort(sortBy);
  } else {
    this.query = this.query.sort('-createdAt');
  }
  return this;
}
```

---

## 3. Field Limiting (Projection)

### Concept

Field limiting (also called **projection**) lets the client choose which fields to include or exclude in the response. This reduces the amount of data transferred over the network — critical for performance on mobile networks or when documents are large.

### How the client uses it

```
GET /api/v1/tours?fields=name,duration,price    → only return these 3 fields
GET /api/v1/tours?fields=-description            → return everything EXCEPT description
```

Again, we convert commas to spaces for Mongoose's `.select()`.

### Default behavior

If no `fields` parameter is provided, we exclude `__v` (the Mongoose version key) by default, since it's an internal field the client doesn't need.

### Implementation

```js
limitFields() {
  if (this.queryString.fields) {
    const fields = this.queryString.fields.split(',').join(' ');
    this.query = this.query.select(fields);
  } else {
    this.query = this.query.select('-__v');
  }
  return this;
}
```

---

## 4. Pagination

### Concept

Pagination divides large result sets into smaller **pages**. Without pagination, a query returning 10,000 documents would overwhelm both the server and client. Pagination lets the client request a specific page of results with a defined page size.

### How the client uses it

```
GET /api/v1/tours?page=2&limit=10
```

This means: _"Give me page 2, with 10 results per page"_ — which translates to **skip the first 10 results, then return the next 10**.

The formula is:

```
skip = (page - 1) * limit
```

| page | limit | skip | Results returned |
|------|-------|------|------------------|
| 1    | 10    | 0    | 1–10             |
| 2    | 10    | 10   | 11–20            |
| 3    | 10    | 20   | 21–30            |

### Default values

- **page** defaults to `1`
- **limit** defaults to `100`

### Implementation

```js
paginate() {
  const page = this.queryString.page * 1 || 1;   // convert to number, default 1
  const limit = this.queryString.limit * 1 || 100; // convert to number, default 100
  const skip = (page - 1) * limit;

  this.query = this.query.skip(skip).limit(limit);
  return this;
}
```

> **Note:** `* 1` is a quick way to convert a string to a number in JavaScript. The `||` provides a fallback default.

---

## 5. Aliasing (Bonus)

### Concept

Aliasing provides **pre-configured shortcuts** for commonly used query combinations. Instead of making clients remember complex query strings, we give them a simple, memorable route.

### Example: Top 5 Cheapest, Highest-Rated Tours

Route:

```
GET /api/v1/tours/top-5-cheap
```

This is handled by a **middleware** that pre-fills `req.query` before the `getAllTours` controller runs:

```js
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};
```

In the router:

```js
router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);
```

The middleware sets the query parameters, then `next()` passes control to `getAllTours`, which uses `APIFeatures` as usual — no special logic needed.

---

## Full Usage in the Controller

```js
const Tour = require('../models/tourModel');
const APIFeatures = require('../utils/APIFeatures');

exports.getAllTours = async (req, res) => {
  try {
    const features = new APIFeatures(Tour.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const tours = await features.query;

    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: { tours },
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err });
  }
};
```

---

## Quick Reference

| Feature        | Query Parameter                 | Example                                          |
|----------------|---------------------------------|--------------------------------------------------|
| Filter         | Any model field                 | `?difficulty=easy&duration=5`                    |
| Advanced Filter| Field with operator             | `?price[gte]=500&ratingsAverage[lt]=4`           |
| Sort           | `sort`                          | `?sort=-price,ratingsAverage`                    |
| Field Limit    | `fields`                        | `?fields=name,price,duration`                    |
| Pagination     | `page`, `limit`                 | `?page=2&limit=10`                               |
| Alias          | Custom route + middleware       | `/top-5-cheap`                                   |

---

## File Structure

```
natours/
├── controllers/
│   └── tourController.js    ← Uses APIFeatures, clean & focused
├── utils/
│   └── APIFeatures.js       ← Reusable query-building class
├── routes/
│   └── tourRoutes.js        ← Defines routes including aliases
└── models/
    └── tourModel.js         ← Tour schema & model
```
