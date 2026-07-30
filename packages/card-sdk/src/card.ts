/**
 * Minimal structure consumed by the Apache-licensed SDK. The AGPL core's
 * CanvasNode is structurally compatible without becoming an SDK dependency.
 */
export interface CardNodeEnvelope<TContent = unknown> {
  readonly id: string;
  readonly type: string;
  readonly content: TContent;
  readonly contentVersion?: number;
}

/**
 * Adapter boundary for Zod, Valibot, JSON Schema, or a hand-written parser.
 * The SDK depends on none of them.
 */
export interface CardSchema<TContent> {
  readonly name?: string;
  parse(input: unknown): TContent;
}

export interface CardMigration {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(content: unknown): unknown;
}

export interface CardDefinition<TContent = unknown> {
  readonly type: string;
  readonly version: number;
  readonly schema: CardSchema<TContent>;
  readonly migrations?: readonly CardMigration[];
  collectAssetIds?(
    content: TContent,
    node: CardNodeEnvelope<TContent>,
  ): Iterable<string>;
}

export function defineCard<TContent>(
  definition: CardDefinition<TContent>,
): CardDefinition<TContent> {
  if (definition.type.trim() === "") {
    throw new TypeError("Card type must not be empty");
  }
  if (!Number.isInteger(definition.version) || definition.version < 1) {
    throw new RangeError("Card version must be a positive integer");
  }

  const migrationStarts = new Set<number>();
  for (const migration of definition.migrations ?? []) {
    if (
      !Number.isInteger(migration.fromVersion) ||
      !Number.isInteger(migration.toVersion) ||
      migration.fromVersion < 1 ||
      migration.toVersion !== migration.fromVersion + 1 ||
      migration.toVersion > definition.version
    ) {
      throw new RangeError(
        `Invalid migration ${migration.fromVersion} -> ${migration.toVersion}`,
      );
    }
    if (migrationStarts.has(migration.fromVersion)) {
      throw new RangeError(
        `Duplicate migration from version ${migration.fromVersion}`,
      );
    }
    migrationStarts.add(migration.fromVersion);
  }

  return definition;
}
