// Πραγματικοί HTTP / SignalR clients: ελέγχουμε συμπεριφορά, όχι μόνο αν ανοίγει μια θύρα.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { HubConnectionBuilder, LogLevel } = require('@microsoft/signalr');
const base = process.env.API_URL ?? 'http://127.0.0.1:5080';
const connections = [];
let passed = 0;
function check(condition, description) { assert.ok(condition, description); console.log(`✓ ${description}`); passed++; }
async function request(path, method = 'GET', data, key) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(key ? { 'X-Quiz-Key': key } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  return { status: response.status, data: await response.json().catch(() => null) };
}
async function client() {
  const hub = new HubConnectionBuilder().withUrl(`${base}/hubs/quiz`).configureLogging(LogLevel.None).build();
  const result = { hub, state: null };
  hub.on('RoomUpdated', state => { result.state = state; });
  await hub.start(); connections.push(hub); return result;
}
async function until(predicate, timeout = 3000) {
  const start = Date.now();
  while (!predicate()) { if (Date.now() - start > timeout) throw new Error('Timed out waiting for state'); await new Promise(r => setTimeout(r, 20)); }
}
async function rejects(action, description) { await assert.rejects(action); passed++; console.log(`✓ ${description}`); }
try {
  const health = await request('/health'); check(health.data.status === 'ok', `API health (${health.data.storage})`);
  check((await request('/quizzes', 'POST', { title: '', questions: [] })).status === 400, 'Rejects invalid quiz');
  const payload = { title: 'Integration test', questions: [0, 1, 2].map((index) => ({ text: `Question ${index + 1}`, options: ['A', 'B', 'C', 'D'], correctIndex: index, seconds: 10 })) };
  const created = await request('/quizzes', 'POST', payload);
  check(created.status === 201, 'Creates quiz');
  const quiz = created.data;
  check((await request(`/quizzes/${quiz.id}`)).status === 401, 'Protects correct answers with owner key');
  check((await request(`/quizzes/${quiz.id}/sessions`, 'POST', {}, 'wrong')).status === 401, 'Rejects unauthorized session creation');
  const stored = await request(`/quizzes/${quiz.id}`, 'GET', null, quiz.ownerKey);
  check(stored.data.questions.length === 3 && stored.data.questions[1].correctIndex === 1, 'Reads stored questions in order');
  const session = (await request(`/quizzes/${quiz.id}/sessions`, 'POST', {}, quiz.ownerKey)).data;
  check(/^\d{6}$/.test(session.pin), 'Creates six-digit PIN');
  const host = await client();
  const intruder = await client();
  await rejects(() => intruder.hub.invoke('JoinHost', session.pin, 'wrong'), 'Rejects forged host key');
  await host.hub.invoke('JoinHost', session.pin, session.hostToken);
  await rejects(() => host.hub.invoke('HostAction', 'start'), 'Prevents starting empty lobby');
  const alice = await client();
  const bob = await client();
  const a = await alice.hub.invoke('JoinPlayer', session.pin, 'Alice', null);
  const b = await bob.hub.invoke('JoinPlayer', session.pin, 'Bob', null);
  await rejects(() => intruder.hub.invoke('JoinPlayer', session.pin, 'Alice', null), 'Rejects duplicate names');
  await until(() => host.state?.players.length === 2);
  check(host.state.players.length === 2, 'Broadcasts lobby participants');
  await rejects(() => alice.hub.invoke('HostAction', 'start'), 'Players cannot control game');
  // Η επεξεργασία του quiz δεν αλλάζει τις ερωτήσεις ενός ήδη ανοιχτού δωματίου.
  check((await request(`/quizzes/${quiz.id}`, 'PUT', { ...payload, title: 'Edited', questions: [{ ...payload.questions[0], text: 'Changed' }] }, quiz.ownerKey)).status === 200, 'Edits persisted quiz');
  await host.hub.invoke('HostAction', 'start');
  await until(() => alice.state?.phase === 'question');
  check(alice.state.question.text === 'Question 1' && alice.state.totalQuestions === 3, 'Live session retains original quiz snapshot');
  check(alice.state.question.correctIndex === null, 'Hides correct answer during question');
  await rejects(() => intruder.hub.invoke('JoinPlayer', session.pin, 'Late', null), 'Rejects new players after start');
  await rejects(() => alice.hub.invoke('Answer', 2, 0), 'Rejects answer for wrong question number');
  await rejects(() => alice.hub.invoke('Answer', 1, 5), 'Rejects invalid answer index');
  await alice.hub.invoke('Answer', 1, 0);
  await until(() => host.state.answerCount === 1);
  check(host.state.players.every(p => p.score === 0 && p.lastPoints === 0), 'Scores do not leak correct answers before reveal');
  await rejects(() => alice.hub.invoke('Answer', 1, 1), 'Rejects duplicate answer');
  // Σύνδεση με το ίδιο token επαναφέρει την απάντηση χωρίς να δημιουργεί νέο παίκτη.
  const aliceAgain = await client();
  const resumed = await aliceAgain.hub.invoke('JoinPlayer', session.pin, 'Ignored', a.playerToken);
  check(resumed.playerId === a.playerId && resumed.answer === 0 && resumed.state.players.length === 2, 'Reconnect restores player, answer and identity');
  await rejects(() => alice.hub.invoke('Answer', 1, 0), 'Old connection cannot act after replacement');
  await bob.hub.invoke('Answer', 1, 2);
  await until(() => host.state.phase === 'results');
  check(host.state.question.correctIndex === 0 && host.state.distribution[0] === 1 && host.state.distribution[2] === 1, 'Reveals results when all players answer');
  const winner = host.state.players.find(p => p.id === a.playerId);
  check(winner.score >= 500 && winner.score <= 1000 && host.state.players[0].id === a.playerId, 'Server computes speed-based score and leaderboard');
  check(host.state.players.find(p => p.id === b.playerId).score === 0, 'Wrong answer earns zero');
  await host.hub.invoke('HostAction', 'next');
  await until(() => host.state.phase === 'question' && host.state.questionNumber === 2);
  await rejects(() => aliceAgain.hub.invoke('Answer', 1, 0), 'Rejects stale answer from previous round');
  await until(() => host.state.phase === 'results', 12000);
  check(host.state.answerCount === 0 && host.state.distribution.every(n => n === 0), 'Server timer closes unanswered question');
  await rejects(() => bob.hub.invoke('Answer', 2, 1), 'Rejects answers after deadline');
  await host.hub.invoke('HostAction', 'next');
  await until(() => host.state.questionNumber === 3 && host.state.phase === 'question');
  await host.hub.invoke('HostAction', 'reveal');
  await until(() => host.state.phase === 'results');
  check(host.state.phase === 'results', 'Host can close a question early');
  await host.hub.invoke('HostAction', 'next');
  await until(() => host.state.phase === 'finished');
  check(host.state.players[0].id === a.playerId, 'Finishes with final leaderboard');
  await rejects(() => host.hub.invoke('HostAction', 'start'), 'Cannot restart finished session');
  const hostAgain = await client();
  const final = await hostAgain.hub.invoke('JoinHost', session.pin, session.hostToken);
  check(final.state.phase === 'finished', 'Host reconnect retrieves final state');
  console.log(`\n${passed} integration checks passed.`);
} finally { await Promise.all(connections.map(hub => hub.stop())); }
