#! /usr/bin/env node
const { readFileSync, writeFileSync, existsSync } = require('fs');
const {
  formatAst,
  parsePrismaSchema,
} = require('@loancrate/prisma-schema-parser');
const { execSync } = require('child_process');

const path = require('path');

execSync('npx prisma format', { stdio: 'inherit' });

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

execSync('npx prisma generate', { stdio: 'inherit' });
