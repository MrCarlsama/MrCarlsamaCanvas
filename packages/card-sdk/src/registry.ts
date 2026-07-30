import type { CardDefinition, CardNodeEnvelope } from "./card";

type AnyCardDefinition = CardDefinition<unknown>;

export interface RegisteredCard<
  TNode extends CardNodeEnvelope = CardNodeEnvelope,
> {
  readonly kind: "registered";
  readonly definition: AnyCardDefinition;
  readonly node: TNode;
}

/**
 * The untouched node is the fallback payload. An app can display a placeholder,
 * save it again, and later recover it after the plugin is installed.
 */
export interface MissingCard<
  TNode extends CardNodeEnvelope = CardNodeEnvelope,
> {
  readonly kind: "missing";
  readonly type: string;
  readonly originalNode: TNode;
}

export type ResolvedCard<TNode extends CardNodeEnvelope = CardNodeEnvelope> =
  RegisteredCard<TNode> | MissingCard<TNode>;

export type PreparedCardNode<TNode extends CardNodeEnvelope, TContent> = Omit<
  TNode,
  "content" | "contentVersion"
> & {
  readonly content: TContent;
  readonly contentVersion: number;
};

export interface PreparedCard<
  TContent,
  TNode extends CardNodeEnvelope = CardNodeEnvelope,
> {
  readonly kind: "registered";
  readonly definition: CardDefinition<TContent>;
  readonly node: PreparedCardNode<TNode, TContent>;
}

/**
 * A dynamic registry cannot infer content from a runtime string. Callers must
 * validate or narrow `content` after lookup, or use `prepareCard` with a known
 * definition when they need a statically typed result.
 */
export type PreparedCardResult<
  TNode extends CardNodeEnvelope = CardNodeEnvelope,
> = PreparedCard<unknown, TNode> | MissingCard<TNode>;

export class DuplicateCardTypeError extends Error {
  constructor(readonly cardType: string) {
    super(`Card type is already registered: ${cardType}`);
    this.name = "DuplicateCardTypeError";
  }
}

export class CardMigrationError extends Error {
  constructor(
    readonly cardType: string,
    message: string,
  ) {
    super(`Cannot migrate ${cardType}: ${message}`);
    this.name = "CardMigrationError";
  }
}

export function prepareCard<TContent, TNode extends CardNodeEnvelope>(
  definition: CardDefinition<TContent>,
  node: TNode,
): PreparedCard<TContent, TNode> {
  if (node.type !== definition.type) {
    throw new CardMigrationError(
      node.type,
      `definition type ${definition.type} does not match node type`,
    );
  }

  const currentVersion = node.contentVersion ?? 1;
  if (currentVersion > definition.version) {
    throw new CardMigrationError(
      node.type,
      `stored version ${currentVersion} is newer than supported version ${definition.version}`,
    );
  }

  let version = currentVersion;
  let content: unknown = node.content;
  while (version < definition.version) {
    const migration = definition.migrations?.find(
      (candidate) => candidate.fromVersion === version,
    );
    if (migration === undefined) {
      throw new CardMigrationError(
        node.type,
        `missing step from version ${version}`,
      );
    }
    content = migration.migrate(content);
    version = migration.toVersion;
  }
  if (version !== definition.version) {
    throw new CardMigrationError(
      node.type,
      `migration ended at version ${version}, expected ${definition.version}`,
    );
  }

  const parsed = definition.schema.parse(content);

  return {
    kind: "registered",
    definition,
    node: {
      ...node,
      content: parsed,
      contentVersion: definition.version,
    },
  };
}

export class CardRegistry {
  readonly #definitions = new Map<string, AnyCardDefinition>();

  get size(): number {
    return this.#definitions.size;
  }

  register<TContent>(definition: CardDefinition<TContent>): this {
    if (this.#definitions.has(definition.type)) {
      throw new DuplicateCardTypeError(definition.type);
    }
    this.#definitions.set(definition.type, definition);
    return this;
  }

  registerAll(definitions: readonly AnyCardDefinition[]): this {
    const incoming = new Set<string>();
    for (const definition of definitions) {
      if (
        incoming.has(definition.type) ||
        this.#definitions.has(definition.type)
      ) {
        throw new DuplicateCardTypeError(definition.type);
      }
      incoming.add(definition.type);
    }

    for (const definition of definitions) {
      this.#definitions.set(definition.type, definition);
    }
    return this;
  }

  has(type: string): boolean {
    return this.#definitions.has(type);
  }

  get(type: string): AnyCardDefinition | undefined {
    return this.#definitions.get(type);
  }

  list(): readonly CardDefinition[] {
    return [...this.#definitions.values()];
  }

  resolve<TNode extends CardNodeEnvelope>(node: TNode): ResolvedCard<TNode> {
    const definition = this.get(node.type);
    if (definition === undefined) {
      return {
        kind: "missing",
        type: node.type,
        originalNode: node,
      };
    }

    return {
      kind: "registered",
      definition,
      node,
    };
  }

  prepare<TNode extends CardNodeEnvelope>(
    node: TNode,
  ): PreparedCardResult<TNode> {
    const resolved = this.resolve(node);
    if (resolved.kind === "missing") {
      return resolved;
    }

    return prepareCard(resolved.definition, node);
  }

  collectAssetIds<TNode extends CardNodeEnvelope>(
    node: TNode,
  ): readonly string[] {
    const resolved = this.resolve(node);
    if (
      resolved.kind === "missing" ||
      resolved.definition.collectAssetIds === undefined
    ) {
      return [];
    }

    return [
      ...new Set(
        resolved.definition.collectAssetIds(
          resolved.node.content,
          resolved.node,
        ),
      ),
    ];
  }
}
