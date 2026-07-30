import {
  CardRegistry,
  defineCard,
  type CardDefinition,
  type CardSchema,
} from "@mrcarlsama/card-sdk";

export const TEXT_CARD_TYPE = "mrcarlsama.text";
export const IMAGE_CARD_TYPE = "mrcarlsama.image";
export const ROOT_TOPIC_CARD_TYPE = "mrcarlsama.root-topic";

export interface TextCardContent {
  readonly text: string;
}

export interface ImageCardContent {
  readonly assetId: string;
  readonly alt?: string;
  readonly caption?: string;
}

export interface RootTopicCardContent {
  readonly title: string;
  readonly summary?: string;
}

function objectValue(input: unknown, label: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError(`${label} content must be an object`);
  }
  return input as Record<string, unknown>;
}

function requiredString(object: Record<string, unknown>, key: string): string {
  const value = object[key];
  if (typeof value !== "string") {
    throw new TypeError(`${key} must be a string`);
  }
  return value;
}

function optionalString(
  object: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = object[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new TypeError(`${key} must be a string when provided`);
  }
  return value;
}

const textSchema: CardSchema<TextCardContent> = {
  name: "built-in text",
  parse(input) {
    const object = objectValue(input, "Text");
    return { text: requiredString(object, "text") };
  },
};

const imageSchema: CardSchema<ImageCardContent> = {
  name: "built-in image",
  parse(input) {
    const object = objectValue(input, "Image");
    const alt = optionalString(object, "alt");
    const caption = optionalString(object, "caption");
    return {
      assetId: requiredString(object, "assetId"),
      ...(alt === undefined ? {} : { alt }),
      ...(caption === undefined ? {} : { caption }),
    };
  },
};

const rootTopicSchema: CardSchema<RootTopicCardContent> = {
  name: "built-in root topic",
  parse(input) {
    const object = objectValue(input, "Root topic");
    const summary = optionalString(object, "summary");
    return {
      title: requiredString(object, "title"),
      ...(summary === undefined ? {} : { summary }),
    };
  },
};

export const textCard: CardDefinition<TextCardContent> = defineCard({
  type: TEXT_CARD_TYPE,
  version: 1,
  schema: textSchema,
});

export const imageCard: CardDefinition<ImageCardContent> = defineCard({
  type: IMAGE_CARD_TYPE,
  version: 1,
  schema: imageSchema,
  collectAssetIds: ({ assetId }) => [assetId],
});

export const rootTopicCard: CardDefinition<RootTopicCardContent> = defineCard({
  type: ROOT_TOPIC_CARD_TYPE,
  version: 1,
  schema: rootTopicSchema,
});

export const builtInCards = [textCard, imageCard, rootTopicCard] as const;

export function registerBuiltInCards(registry: CardRegistry): CardRegistry {
  return registry.registerAll(builtInCards);
}
