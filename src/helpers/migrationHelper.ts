import { Pool } from "pg";

/**
 * Generalized helper to manage migrations for columns.
 * @param pool - Database connection pool.
 * @param entity - The name of the column.
 * @param action - The migration action ('create' | 'drop' | 'update').
 * @param details - Additional details for the operation.
 */
export const runColumnMigration = async (
  pool: Pool,
  entity: string,
  action: "create" | "drop" | "update",
  details: {
    tableName: string; // Table where the column belongs
    columnDefinition?: string; // Column definition (required for 'create' and 'update')
    defaultValue?: string; // Default value (optional)
  }
): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const sanitizedColumn = sanitizeIdentifier(entity);
    const sanitizedTable = sanitizeIdentifier(details.tableName);

    if (action === "create") {
      if (!details.columnDefinition) {
        throw new Error("Column definition is required for column creation.");
      }

      const columnExistsQuery = `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = '${sanitizedTable}' AND column_name = '${sanitizedColumn}'
        );
      `;
      console.log(`Checking if column exists: ${columnExistsQuery}`);
      const columnExists = await client.query(columnExistsQuery);

      if (columnExists.rows[0].exists) {
        console.log(
          `Column "${sanitizedColumn}" already exists in table "${sanitizedTable}". Skipping.`
        );
      } else {
        const addColumnQuery = `
          ALTER TABLE ${sanitizedTable}
          ADD COLUMN ${sanitizedColumn} ${details.columnDefinition};
        `;
        console.log(`Executing Query: ${addColumnQuery}`);
        await client.query(addColumnQuery);
        console.log(`Column "${sanitizedColumn}" added to table "${sanitizedTable}".`);
      }
    } else if (action === "drop") {
      const dropColumnQuery = `
        ALTER TABLE ${sanitizedTable}
        DROP COLUMN IF EXISTS ${sanitizedColumn};
      `;
      console.log(`Executing Query: ${dropColumnQuery}`);
      await client.query(dropColumnQuery);
      console.log(`Column "${sanitizedColumn}" removed from table "${sanitizedTable}".`);
    } else if (action === "update") {
      if (!details.columnDefinition) {
        throw new Error("Column definition is required for column updates.");
      }

      const alterColumnQuery = `
        ALTER TABLE ${sanitizedTable}
        ALTER COLUMN ${sanitizedColumn} SET ${details.columnDefinition};
      `;
      console.log(`Executing Query: ${alterColumnQuery}`);
      await client.query(alterColumnQuery);
      console.log(`Column "${sanitizedColumn}" in table "${sanitizedTable}" updated.`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(
      `Error during column migration (${action} "${entity}" in table "${details.tableName}"):`,
      (error as any)?.message
    );
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Sanitize identifiers (table or column names) to prevent SQL injection.
 */
const sanitizeIdentifier = (identifier: string): string => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
  return identifier;
};
