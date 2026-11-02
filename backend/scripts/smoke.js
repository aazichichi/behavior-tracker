// end-to-end test that hits basically every endpoint on a running API with the
// real db. only uses node's built-in fetch (node 20+), so nothing to install.
//
//   npm run smoke                                          (http://localhost:5000)
//   npm run smoke -- https://mernbehaviortracker.xyz:5000  (the droplet)
//
// what it does: registers a throwaway user (smoke<timestamp>), makes a student with
// some behaviors, runs a session, records events, checks the chart + summary, then
// deletes the student and everything under it. heads up, the throwaway user itself
// stays in the Users collection (there's no delete-account endpoint)

const BASE = (process.argv[2] || process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');

let passed = 0;
let failed = 0;
let token = null;

async function call(method, path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
}

function check(name, res, expectedStatus, extra) {
  const ok = res.status === expectedStatus && (!extra || extra(res.body));
  if (ok) {
    passed += 1;
    console.log(`  PASS  ${name} (${res.status})`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}: expected ${expectedStatus}, got ${res.status}`);
    console.log(`        ${JSON.stringify(res.body)}`);
  }
  return ok;
}

async function main() {
  console.log(`Smoke test against ${BASE}\n`);
  const stamp = Date.now();
  const login = `smoke${stamp}`;
  const password = 'SmokeTest123!';

  console.log('Health and accounts');
  check('GET /ping', await call('GET', '/ping'), 200);

  let res = await call('POST', '/users', {
    firstName: 'Smoke',
    lastName: 'Test',
    email: `${login}@example.com`,
    login,
    password,
    role: 'teacher'
  });
  if (!check('POST /users (register)', res, 201, (b) => b.message === 'User registered successfully' && b.token)) {
    throw new Error('Registration failed, so the rest of the test cannot run');
  }
  const userId = res.body.user._id;

  check('POST /users duplicate login -> 409', await call('POST', '/users', {
    firstName: 'A', lastName: 'B', email: `other${stamp}@example.com`, login, password
  }), 409);

  check('POST /auth/login wrong password -> 401', await call('POST', '/auth/login', { login, password: 'nope-nope' }), 401);

  res = await call('POST', '/auth/login', { login, password });
  check('POST /auth/login', res, 200, (b) => b.token && b.user.Login === login);
  token = res.body.token;

  check('GET /auth/me', await call('GET', '/auth/me'), 200, (b) => b._id === userId);
  check('GET /users/:userId', await call('GET', `/users/${userId}`), 200);
  check('PATCH /users/:userId (name)', await call('PATCH', `/users/${userId}`, { firstName: 'Smoky' }), 200,
    (b) => b.FirstName === 'Smoky');
  check('POST /auth/forgot-password', await call('POST', '/auth/forgot-password', { email: `${login}@example.com` }), 200);
  check('POST /auth/reset-password bad token -> 400', await call('POST', '/auth/reset-password', {
    token: 'not-a-real-token', password: 'Whatever123!'
  }), 400);

  console.log('\nStudents');
  res = await call('POST', '/students', { firstName: 'Test', lastName: 'Student', gradeLevel: '3', notes: 'smoke test' });
  check('POST /students', res, 201);
  const studentId = res.body._id;

  check('GET /students', await call('GET', '/students'), 200, (b) => b.some((s) => s._id === studentId));
  check('GET /students?search=test', await call('GET', '/students?search=test'), 200, (b) => b.length >= 1);
  check('GET /students/:studentId', await call('GET', `/students/${studentId}`), 200);
  check('PATCH /students/:studentId', await call('PATCH', `/students/${studentId}`, { gradeLevel: '4' }), 200,
    (b) => b.GradeLevel === '4');
  check('POST /students missing name -> 400', await call('POST', '/students', { firstName: 'Only' }), 400);
  check('GET /students/<bad id> -> 400', await call('GET', '/students/not-an-id'), 400);
  check('GET /students/<someone else> -> 404', await call('GET', '/students/6ad21fd00002000000000001'), 404);

  console.log('\nBehaviors');
  res = await call('POST', `/students/${studentId}/behaviors`, { name: 'Vocal outburst', code: 'v', color: '#F3A712' });
  check('POST /students/:id/behaviors', res, 201, (b) => b.Code === 'V');
  const behaviorV = res.body._id;
  res = await call('POST', `/students/${studentId}/behaviors`, { name: 'Hand raise', code: 'H' });
  check('POST second behavior', res, 201);
  const behaviorH = res.body._id;
  check('POST duplicate code -> 409', await call('POST', `/students/${studentId}/behaviors`, { name: 'Other', code: 'V' }), 409);
  check('GET /students/:id/behaviors', await call('GET', `/students/${studentId}/behaviors`), 200, (b) => b.length === 2);
  check('PATCH /behaviors/:id', await call('PATCH', `/behaviors/${behaviorH}`, { description: 'Replacement behavior' }), 200);
  check('GET /behaviors/:id', await call('GET', `/behaviors/${behaviorH}`), 200, (b) => b.Description === 'Replacement behavior');

  console.log('\nSessions and events');
  res = await call('POST', `/students/${studentId}/sessions`, { intervalSeconds: 60, notes: 'smoke session' });
  check('POST /students/:id/sessions (start)', res, 201, (b) => b.Status === 'active');
  const sessionId = res.body._id;
  check('POST second active session -> 409', await call('POST', `/students/${studentId}/sessions`, {}), 409);

  res = await call('POST', `/sessions/${sessionId}/events`, { behaviorId: behaviorV });
  check('POST /sessions/:id/events', res, 201, (b) => b.IntervalIndex === 0);
  const eventId = res.body._id;
  check('POST another event', await call('POST', `/sessions/${sessionId}/events`, { behaviorId: behaviorH }), 201);
  check('POST third event', await call('POST', `/sessions/${sessionId}/events`, { behaviorId: behaviorV }), 201);
  check('POST event bad behavior -> 404', await call('POST', `/sessions/${sessionId}/events`, {
    behaviorId: '6ad2200c0003000000000001'
  }), 404);

  check('GET /sessions/:id/events', await call('GET', `/sessions/${sessionId}/events`), 200, (b) => b.length === 3);
  check('GET /events/:id', await call('GET', `/events/${eventId}`), 200);
  check('DELETE /events/:id (undo)', await call('DELETE', `/events/${eventId}`), 200);

  check('PATCH /sessions/:id (end)', await call('PATCH', `/sessions/${sessionId}`, { status: 'ended', notes: 'done' }), 200,
    (b) => b.Status === 'ended' && b.EndTime);
  check('POST event after end -> 409', await call('POST', `/sessions/${sessionId}/events`, { behaviorId: behaviorV }), 409);
  check('GET /sessions/:id', await call('GET', `/sessions/${sessionId}`), 200, (b) => b.events.length === 2);
  check('GET /sessions/:id/chart', await call('GET', `/sessions/${sessionId}/chart`), 200,
    (b) => b.totals.find((t) => t.Code === 'V').count === 1 && b.intervals.length >= 1);
  check('GET /students/:id/sessions', await call('GET', `/students/${studentId}/sessions?status=ended`), 200,
    (b) => b.length === 1);
  check('GET /students/:id/summary', await call('GET', `/students/${studentId}/summary`), 200,
    (b) => b.sessions.length === 1 && b.behaviors.length === 2);

  check('DELETE /behaviors/:id with events -> archived', await call('DELETE', `/behaviors/${behaviorV}`), 200,
    (b) => b.archived === true);

  console.log('\nAuth protection');
  const saved = token;
  token = null;
  check('GET /students without token -> 401', await call('GET', '/students'), 401);
  token = 'not.a.real.token';
  check('GET /students with bad token -> 401', await call('GET', '/students'), 401);
  token = saved;

  console.log('\nCleanup');
  check('DELETE /students/:id (and everything under it)', await call('DELETE', `/students/${studentId}`), 200,
    (b) => b.deleted.sessions === 1);
  check('GET deleted student -> 404', await call('GET', `/students/${studentId}`), 404);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(`\nStopped: ${err.message}`);
  if (err.cause) console.error(`Cause: ${err.cause.message || err.cause}`);
  console.log(`${passed} passed, ${failed + 1} failed`);
  process.exit(1);
});
