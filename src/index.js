#! /usr/bin/env node
const { readFileSync, writeFileSync, existsSync } = require('fs');
const {
  formatAst,
  parsePrismaSchema,
} = require('@loancrate/prisma-schema-parser');
const { execSync } = require('child_process');

function getRunner() {
  try {
    execSync('npx --version', { stdio: 'ignore' });
    return 'npx';
  } catch (e) {}

  try {
    execSync('bun --version', { stdio: 'ignore' });
    return 'bunx';
  } catch (e) {}

  try {
    execSync('deno --version', { stdio: 'ignore' });
    return 'deno run -A';
  } catch (e) {}

  throw new Error('No suitable runner found. Install bun, deno, or npx.');
}

const runner = getRunner();

const path = require('path');

execSync(`${runner} prisma format`, { stdio: 'inherit' });

const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
const history = path.join(process.cwd(), 'prisma', 'history.prisma');

const {
  deleteHistoryModels,
  createHistoryModel,
  getModels,
  getEnums,
  getHistoryfeilds,
  getExcludedModels,
} = require('./lib');

const ast = parsePrismaSchema(readFileSync(schemaPath, { encoding: 'utf8' }));
let historyfeilds = [];
let excludedModels = [];
if (existsSync(history)) {
  historyfeilds = getHistoryfeilds(
    parsePrismaSchema(readFileSync(history, { encoding: 'utf8' }))
  );
  excludedModels = getExcludedModels(
    parsePrismaSchema(readFileSync(history, { encoding: 'utf8' }))
  );
}

writeFileSync(
  path.join(__dirname, './excluded.json'),
  JSON.stringify(excludedModels, null, 2)
);

deleteHistoryModels(ast);
const enums = getEnums(ast);
const models = getModels(ast);

for ([model, value] of Object.entries(models)) {
  if (excludedModels.includes(model)) {
    continue;
  }
  createHistoryModel(ast, enums, value, historyfeilds);
}

writeFileSync(schemaPath, formatAst(ast));

execSync(`${runner} prisma generate`, { stdio: 'inherit' });
