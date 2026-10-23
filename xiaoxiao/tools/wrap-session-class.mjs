import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../app/logic/session.js');
let t = fs.readFileSync(file, 'utf8');
t = t.replace('function createEngine(options = {}) {', 'function assembleSession(options = {}) {');
if (!t.includes('export default createEngine')) {
  throw new Error('export default createEngine not found');
}
t = t.replace(
  /export default createEngine;\s*$/,
  `export default class BoardSession {
  constructor(options = {}) {
    const api = assembleSession(options);
    Object.setPrototypeOf(api, BoardSession.prototype);
    return api;
  }
}
`
);
fs.writeFileSync(file, t);
console.log('BoardSession wrapped');
