import { ApiChatFolder, ApiFormattedText, ApiMessageEntity, ApiMessageEntityBlockquote, ApiMessageEntityCustomEmoji, ApiMessageEntityDefault, ApiMessageEntityMentionName, ApiMessageEntityPre, ApiMessageEntityTextUrl, ApiMessageEntityTypes } from "../api/types";
import { DEBUG } from "../config";
import { renderTextWithEntities } from "../components/common/helpers/renderTextWithEntities";
import React from "../lib/teact/teact";
import TeactDOM from "../lib/teact/teact-dom";
import parseHtmlAsFormattedText from "../util/parseHtmlAsFormattedText";
import { TokenHelper, MarkedJS } from "./text-editor/TokenHelper";
import { areFormattedTextsEqual, FormattedTextKeys, normalizeWhitespace } from "./text-editor/utils";
import { MessageInputController } from "./text-editor";

type RawApiMessageEntity =
  | Omit<ApiMessageEntityDefault, 'offset' | 'length'>
  | Omit<ApiMessageEntityPre, 'offset' | 'length'>
  | Omit<ApiMessageEntityTextUrl, 'offset' | 'length'>
  | Omit<ApiMessageEntityMentionName, 'offset' | 'length'>
  | Omit<ApiMessageEntityCustomEmoji, 'offset' | 'length'>
  | Omit<ApiMessageEntityBlockquote, 'offset' | 'length'>;

// For testing and development, including logging and utility functions.
export namespace Contest {
  const IS_TESTING: boolean = false; // DEBUG;

  const CUSTOM_EMOJIS = [
    { id: "5364029976469315203", emoji: "😂" },
    { id: "5411159893853880009", emoji: "🔤" },
    { id: "5330237710655306682", emoji: "📱" },
    { id: "5384453284696181912", emoji: "🫤" },
    { id: "5442667851246742007", emoji: "👍" },
    { id: "5368324170671202286", emoji: "👍" },
    { id: "5388929052935462187", emoji: "👍" },
    { id: "5307862292547780573", emoji: "👍" }
  ];

  class TestClass {
    private _isTestCalled = false;

    get isTestCalled() {
      return this._isTestCalled;
    }

    runMessageInputTest(controller: MessageInputController) {
      this._isTestCalled = true;
      // const timeout = setTimeout(() => {
      //   controller.setup(this.createMessageWithAllEntities(), {
      //     source: "TEST"
      //   });
      // }, 3000);
      // TestingSystem.try_start();
    }

    createMessageWithAllEntities({ withMarkdown = false, randomMode = false } = {}) {
      return MMD_Utils.buildFormattedText(
        { randomMode },
        [
          { text: 'Hello ' },
          { text: '@username', entity: { type: ApiMessageEntityTypes.Mention } },
          { text: '!\nExplore ' },
          { text: 'Telegram', entity: { type: ApiMessageEntityTypes.TextUrl, url: 'https://telegram.org' } },
          { text: ' using ' },
          { text: '#features', entity: { type: ApiMessageEntityTypes.Hashtag } },
          { text: ' & ' },
          { text: '$finance', entity: { type: ApiMessageEntityTypes.Cashtag } },
          { text: '.\nFormatting: ' },
          { text: 'bold', entity: { type: ApiMessageEntityTypes.Bold } },
          { text: ' / ' },
          { text: 'italic', entity: { type: ApiMessageEntityTypes.Italic } },
          { text: ' / ' },
          { text: 'underlined', entity: { type: ApiMessageEntityTypes.Underline } },
          { text: ' / ' },
          { text: 'strikethrough', entity: { type: ApiMessageEntityTypes.Strike } },
          { text: ' / ' },
          { text: 'spoiler', entity: { type: ApiMessageEntityTypes.Spoiler } },
          { text: ' text.\n' },
          { text: 'Inline code: ' },
          { text: 'let x = 10;', entity: { type: ApiMessageEntityTypes.Code } },
          { text: ' ' },
          { text: CUSTOM_EMOJIS[0].emoji, entity: { type: ApiMessageEntityTypes.CustomEmoji, documentId: CUSTOM_EMOJIS[0].id } },
          { text: '💙' },
          { text: CUSTOM_EMOJIS[1].emoji, entity: { type: ApiMessageEntityTypes.CustomEmoji, documentId: CUSTOM_EMOJIS[1].id } },
          { text: '🌟' },
          { text: CUSTOM_EMOJIS[2].emoji, entity: { type: ApiMessageEntityTypes.CustomEmoji, documentId: CUSTOM_EMOJIS[2].id } },
          { text: 'console.log("Code block without lang!");\nalert("Hello, World!");', entity: { type: ApiMessageEntityTypes.Pre } },
          { text: CUSTOM_EMOJIS[3].emoji, entity: { type: ApiMessageEntityTypes.CustomEmoji, documentId: CUSTOM_EMOJIS[3].id } },
          { text: '\nA separator text block. 🦄' },
          {
            text: `This is a multi-line
               blockquote to showcase
               how text formatting can be
                 structured neatly for readability.`,
            entity: { type: ApiMessageEntityTypes.Blockquote, collapsed: true }
          },
          { text: '\nAnother separator block. 🌸' },
          {
            text: `#include <iostream>\nint main() {\n  std::cout << "Hello, Telegram!";\n}`,
            entity: { type: ApiMessageEntityTypes.Pre, language: 'cpp' }
          },
          { text: '\nFinal text block. 🚀' },
          { text: `A single-line blockquote example.`, entity: { type: ApiMessageEntityTypes.Blockquote, collapsed: true } },
          withMarkdown ? { text: '\n> This text *contains* **few** `markdown` ||syntax||.' } : undefined,
          ...(randomMode ? [
            { text: '\nAdditional Markdown Stress Test:\n' },
            {
              text: `Nested formatting test:
              *Italic **Bold in italic***,
              __Underline **Bold in underline**__,
              ~~Strike *and italic* with spoiler~~.`
            },
            { text: '\nList with markdown markers:\n- Item 1\n- Item 2\n- Item 3' },
            {
              text: '\nCode block with markdown-like syntax:\n```python\n# This is a comment\nprint("Hello, world!")\n```'
            },
            {
              text: '\nEscaped markdown characters: \\*\\*not bold\\*\\* and \\_\\_not italic\\_\\_'
            }
          ] : [])
        ]
      );
    }

    tryAddCustomEmojiToFolder(folder?: ApiChatFolder) {
      if (!folder) return undefined;
      if (folder.id === 0) return folder;
      if (folder.title.entities?.some(e => e.type === ApiMessageEntityTypes.CustomEmoji)) return folder;
      if (MMD_Utils.Random.getRandomBool()) return folder; // ? Add custom icons randomly
      const isEnd = MMD_Utils.Random.getRandomBool();
      folder.title.entities = folder.title.entities ?? [];
      const customEmoji = MMD_Utils.Random.getRandomElement(CUSTOM_EMOJIS)!;
      folder.title.text = isEnd ? folder.title.text + " " : " " + folder.title.text;
      folder.title.entities.push({
        type: ApiMessageEntityTypes.CustomEmoji,
        offset: isEnd ? folder.title.text.length - 1 : 0,
        length: 1,
        documentId: customEmoji.id
      });
      return folder;
    }

    isTestUserPremium(): boolean | undefined {
      return true;
    }
  }

  export const isTestMode = () => IS_TESTING;

  const testInstance = IS_TESTING ? new TestClass() : undefined;

  export const Test = () => {
    if (!testInstance) throw new Error("Test mode is not enabled.");
    return testInstance;
  };

  export function createLogger(className: string) {
    return new MMD_Utils.Logger(className);
  }
}

namespace MMD_Utils {
  const LOG_BACKGROUND = '#111111DD';
  const LOG_PREFIX_COLOR = '#E4D00A';
  const LOG_CLASS_NAME_COLOR = '#0DD151';

  export class Logger {
    constructor(private readonly _name: string) { }

    log(...data: any[]) {
      Logger.printLog(this._name, ...data);
    }

    static printLog(className: string, ...data: any[]) {
      if (!Contest.isTestMode()) return;
      const timestamp = new Date().toLocaleTimeString([], { hour12: false });

      console.log(
        `%c[${timestamp}]%c[MMD]%c${className}`,
        `color: grey; background: ${LOG_BACKGROUND}; padding: 0.25rem; border-radius: 0.25rem; text-align: center;`,  // Grey for timestamp
        `color: ${LOG_PREFIX_COLOR}; background: ${LOG_BACKGROUND}; padding: 0.25rem; border-radius: 0.25rem; margin-left: 0.25rem; text-align: center;`,
        `color: ${LOG_CLASS_NAME_COLOR}; background: ${LOG_BACKGROUND}; padding: 0.25rem; border-radius: 0.25rem; margin-left: 0.25rem; text-align: center;`,
        ...data
      );
    }
  }

  export class Random {
    private constructor() { }

    static getRandomElement<T>(array: T[]): T | undefined {
      if (array.length === 0) {
        return undefined;
      }
      const randomIndex = Math.floor(Math.random() * array.length);
      return array[randomIndex];
    }

    static getRandomElementAndDrop<T>(array: T[]): [T | undefined, T[]] {
      if (array.length === 0) {
        return [undefined, array];
      }
      const randomIndex = Math.floor(Math.random() * array.length);
      const pickedElement = array[randomIndex];
      const newArray = [...array.slice(0, randomIndex), ...array.slice(randomIndex + 1)];
      return [pickedElement, newArray];
    }

    private static _seed: number = Date.now();

    private static _xorshift(): number {
      let x = Random._seed;
      x ^= x << 13;
      x ^= x >> 17;
      x ^= x << 5;
      Random._seed = x;
      return x >>> 0;
    }

    static getRandomBool(): boolean {
      return (Random._xorshift() & 1) === 1;
    }
  }

  export function createLogger(className: string) {
    return new Logger(className);
  }

  export function logger(className: string, ...data: any[]) {
    Logger.printLog(className, ...data);
  }

  export function buildFormattedText(
    options: { randomMode: boolean },
    parts: ({ text: string; entity?: RawApiMessageEntity } | undefined)[]
  ): ApiFormattedText {
    let accumulatedText = '';
    const entities: ApiMessageEntity[] = [];

    parts.forEach((part) => {
      if (options.randomMode && MMD_Utils.Random.getRandomBool()) return;
      if (!part) return;
      const startOffset = accumulatedText.length;
      accumulatedText += part.text;

      if (part.entity) {
        switch (part.entity.type) {
          case ApiMessageEntityTypes.CustomEmoji:
            if (!part.entity.documentId) {
              throw new Error(`Missing documentId for CustomEmoji entity. Entity: ${JSON.stringify(part.entity)}`);
            }
            break;
          case ApiMessageEntityTypes.TextUrl:
            if (!part.entity.url) {
              throw new Error(`Missing URL for TextUrl entity. Entity: ${JSON.stringify(part.entity)}`);
            }
            break;
          default:
            break;
        }
        const newEntity = {
          ...part.entity,
          offset: startOffset,
          length: part.text.length,
        } as any;
        entities.push(newEntity);
      }
    });

    return {
      text: accumulatedText,
      entities,
    };
  }
}

class TestingSystem {
  private static _logger = Contest.createLogger("TestingSystem");
  private static _isStarted = false;
  private constructor() { }

  static try_start() {
    if (this._isStarted) return;
    this._isStarted = true;
    this._run();
  }

  private static _run() {
    try {
      const startTime: number = Date.now();
      let lastStepTime: number = startTime;

      const logStep = (msg: string, data: Record<string, any> = {}): void => {
        const now: number = Date.now();
        TestingSystem._logger.log(`${msg} (Step: ${now - lastStepTime} ms)`, data);
        lastStepTime = now;
      };

      logStep("1. Test started: Rendering and processing formatted text");

      const formattedText = Contest.Test().createMessageWithAllEntities();
      logStep("2. Formatted text created", { formattedText });

      const rendered = renderTextWithEntities({ ...formattedText, isInEditMode: true });
      logStep("3. Text rendered with entities", { rendered });

      const div: HTMLDivElement = document.createElement('div');
      TeactDOM.render(<>{rendered}</>, div);
      logStep("4. Div created and content rendered", { div });

      const markdown: string = TokenHelper.htmlToMarkdown(div);
      logStep("5. Converted HTML to markdown", { markdown });

      const tokens = MarkedJS.tokenizer(markdown);
      logStep("6. Tokens generated from markdown", { tokens });

      const formattedTextFromTokens = TokenHelper.tokensToFormattedText(tokens);
      logStep("7. Converted tokens to API formatted text", { formattedTextFromTokens });

      const formattedTextFromHtml = parseHtmlAsFormattedText(div.innerHTML, false, true);
      logStep("8. Formatted text parsed from HTML", { formattedTextFromHtml });

      TestingSystem._logger.log(`Total test duration: (${Date.now() - startTime} ms)`);

      // Assertions
      if (!areFormattedTextsEqual(formattedText, formattedTextFromTokens)
        || !areFormattedTextsEqual(formattedText, formattedTextFromHtml)
        || !areFormattedTextsEqual(formattedTextFromTokens, formattedTextFromHtml)) {
        this.log_diffing(formattedText, formattedTextFromTokens, formattedTextFromHtml);
        throw new Error("Test failed: Mismatch between original and processed formatted text.");
      }

      TestingSystem._logger.log("✅ Test passed: formattedTextAfter is valid.");
    } catch (error) {
      // Log any errors that occur during the test
      TestingSystem._logger.log("Test failed with error:\n", error);
      throw error;
    }
  }

  private static log_diffing(formattedText: ApiFormattedText, formattedTextFromTokens: ApiFormattedText, formattedTextFromHtml: ApiFormattedText) {
    // Destructure and provide defaults for entities
    const { text: textA, entities: entsA = [] } = formattedText;
    const { text: textB, entities: entsB = [] } = formattedTextFromTokens;
    const { text: textC, entities: entsC = [] } = formattedTextFromHtml;

    TestingSystem._logger.log({ formattedText, formattedTextFromTokens, formattedTextFromHtml });

    // Compare texts
    if (textA !== textB || textA !== textC || textB !== textC) {
      TestingSystem._logger.log(
        `Text mismatch detected:
🔸 formattedText: "${textA}"
🔸 normalize_formattedText: "${normalizeWhitespace(textA)}"
------------------------------------------
🔸 formattedTextFromTokens: "${textB}"
🔸 normalize_formattedTextFromTokens: "${normalizeWhitespace(textB)}"
------------------------------------------
🔸 formattedTextFromHtml: "${textC}"
🔸 normalize_formattedTextFromHtml: "${normalizeWhitespace(textC)}"`
      );
    }

    // Compare entity counts
    if (entsA.length !== entsB.length || entsA.length !== entsC.length) {
      TestingSystem._logger.log(
        `Entity count mismatch detected:
 formattedText: ${entsA.length} entities,
 formattedTextFromTokens: ${entsB.length} entities,
 formattedTextFromHtml: ${entsC.length} entities`
      );
      return;
    }

    // Helper to compare two entities at the same index
    const compareEntities = (
      expected: any,
      actual: any,
      label: string,
      index: number
    ) => {
      if (
        expected.type !== actual.type ||
        expected.offset !== actual.offset ||
        expected.length !== actual.length
      ) {
        TestingSystem._logger.log(
          `${label} mismatch at index ${index}:
 Expected: ${JSON.stringify(expected)}
 Got:      ${JSON.stringify(actual)}`
        );
      }
      // Compare additional key if defined for this entity type
      const key = FormattedTextKeys[expected.type];
      if (key && expected[key] !== actual[key]) {
        TestingSystem._logger.log(
          `${label} key mismatch at index ${index} (key: "${key}"):
 Expected: ${expected[key]}
 Got:      ${actual[key]}`
        );
      }
    };

    // Compare each entity in order
    entsA.forEach((entity, i) => {
      compareEntities(entity, entsB[i], "(formattedText vs formattedTextFromTokens)", i);
      compareEntities(entity, entsC[i], "(formattedText vs formattedTextFromHtml)", i);
    });
  }

}
