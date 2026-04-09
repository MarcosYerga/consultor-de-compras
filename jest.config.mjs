/** @type {import('jest').Config} */
const baseProject = {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.base.json',
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@consultor/api-types$': '<rootDir>/packages/api-types/src/index.ts',
    '^@consultor/connectors$': '<rootDir>/packages/connectors/src/index.ts',
  },
};

/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      ...baseProject,
      displayName: 'api',
      testMatch: ['<rootDir>/apps/api/src/**/*.test.ts'],
    },
    {
      ...baseProject,
      displayName: 'connectors',
      testMatch: ['<rootDir>/packages/connectors/src/**/*.test.ts'],
    },
    {
      ...baseProject,
      displayName: 'web',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/apps/web/src/**/*.test.ts', '<rootDir>/apps/web/src/**/*.test.tsx'],
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: '<rootDir>/apps/web/tsconfig.json',
          },
        ],
      },
    },
  ],
};

export default config;