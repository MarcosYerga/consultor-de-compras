import { execSync } from 'node:child_process';

const PROJECTS = ['apps/api/tsconfig.json', 'packages/connectors/tsconfig.json'];

const IGNORE_PATTERNS = [
  /\(used in module\)/i,
  /[\\/]dist[\\/]/i,
  /[\\/]src[\\/]index\.ts:/i,
];

function runTsPrune(project) {
  const output = execSync(`npx --yes ts-prune -p \"${project}\"`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => IGNORE_PATTERNS.every((re) => !re.test(line)));
}

const findings = [];

for (const project of PROJECTS) {
  try {
    const lines = runTsPrune(project);
    for (const line of lines) {
      findings.push(`${project}: ${line}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Fallo check-dead-exports en ${project}: ${msg}`);
    process.exit(2);
  }
}

if (findings.length > 0) {
  console.error('Se detectaron exports no usados:');
  for (const line of findings) {
    console.error(`- ${line}`);
  }
  process.exit(1);
}

console.log('check-dead-exports: OK (sin exports muertos detectados).');
