import { Pool } from 'pg';
import { runColumnMigration } from '../helpers/migrationHelper';

export const up = async (pool: Pool) => {
  await runColumnMigration(pool, 'updated_at', 'create', {
    tableName: 'users',
    columnDefinition: 'TIMESTAMP DEFAULT NOW()',
  });
};

export const down = async (pool: Pool) => {
  await runColumnMigration(pool, 'updated_at', 'drop', {
    tableName: 'users',
  });
};
