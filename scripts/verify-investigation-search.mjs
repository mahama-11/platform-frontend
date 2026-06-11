#!/usr/bin/env node
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/modules/operator-workbench/support/investigationSearch.ts', import.meta.url), 'utf8')
const expectations = [
  ['runtime job deterministic route', "path: `/runtime/jobs/${encoded}`"],
  ['charge session deterministic route', "path: `/billing/charge-sessions/${encoded}`"],
  ['settlement deterministic route', "path: `/billing/settlements/${encoded}`"],
  ['request route uses request_id param', "path: `/workbench/audit?request_id=${encodeURIComponent(requestID)}`"],
  ['trace route uses trace_id param', "path: `/workbench/audit?trace_id=${encodeURIComponent(traceID)}`"],
  ['unknown falls back to runtime jobs query', "path: `/runtime/jobs?query=${encoded}`"],
  ['URL/query param parser present', 'function extractParamOrRaw'],
]
const missing = expectations.filter(([, needle]) => !source.includes(needle))
if (missing.length) {
  console.error('investigationSearch static verifier failed')
  for (const [name, needle] of missing) console.error(`- ${name}: missing ${needle}`)
  process.exit(1)
}
console.log(JSON.stringify({ status: 'PASS', checks: expectations.map(([name]) => name) }, null, 2))
