const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');
const app = require('../app');

test('API returns useful production errors for invalid requests', async (t) => {
  const previousEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const request = (method, path, body) =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: server.address().port,
          method,
          path,
          headers: { 'Content-Type': 'application/json' },
        },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (err) {
              reject(err);
            }
          });
        },
      );
      req.on('error', reject);
      req.setTimeout(5000, () => req.destroy(new Error('Request timed out')));
      req.end(body);
    });

  try {
    await t.test('invalid ID returns 400', async () => {
      const res = await request('GET', '/api/v1/tours/bad-id');
      assert.equal(res.status, 400);
      assert.deepEqual(res.body, {
        status: 'fail',
        message: 'Invalid id : bad-id',
      });
    });

    await t.test(
      'rating above the maximum returns a validation message',
      async () => {
        const res = await request(
          'PATCH',
          '/api/v1/tours/6ac644f9fe21c09b43ace141',
          '{"ratingAvg":6}',
        );
        assert.equal(res.status, 400);
        assert.deepEqual(res.body, {
          status: 'fail',
          message: 'Invalid input data. Rating should be 5 or less',
        });
      },
    );

    await t.test(
      'non-breaking space in JSON returns a parsing message',
      async () => {
        const res = await request(
          'PATCH',
          '/api/v1/tours/6ac644f9fe21c09b43ace141',
          '{\n\u00a0 "ratingAvg":6\n}',
        );
        assert.equal(res.status, 400);
        assert.deepEqual(res.body, {
          status: 'fail',
          message: 'Invalid JSON body. Use valid JSON with ordinary spaces.',
        });
      },
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
  }
});
