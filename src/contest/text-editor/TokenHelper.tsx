import { isMarkdownMarker } from ".";
import { ApiFormattedText, ApiMessageEntity, ApiMessageEntityTypes } from "../../api/types";
import { getBlockQuoteInnerText as extractBlockQuoteData } from "../../components/common/Blockquote";
import { extractCodeBlockData } from "../../components/common/code/CodeBlock";
import { getEntityTypeFromNode } from "../../util/parseHtmlAsFormattedText";
import { rtrim } from "./lib/marked/helpers";
import { marked, Token as _Token } from "./lib/marked/marked";

// TelegramTokenTypes Examples and Platforms
// Bold = **bold**              // Platforms: Markdown, TDesktop, TWeb
// Italic = *italic*            // Platforms: Markdown
// Spoiler = ||spoiler||        // Platforms: TMarkdown2, TDesktop, TWeb
// Underline = __underline__    // Platforms:
// Strike = ~~strikethrough~~   // Platforms: GFM, TDesktop, TWeb
// Code = `inline code`         // Platforms: Markdown, TMarkdown2, TDesktop, TWeb
// Pre = ```code block```       // Platforms: Markdown, TMarkdown2, TDesktop, TWeb
// Blockquote = > quotation     // Platforms: Markdown

export namespace MarkedJS {
  enum OrgTokenType {
    space = 'space',             // Whitespace
    code = 'code',               // Inline code: `code`
    heading = 'heading',         // Headings: #, ##, ###, etc.
    table = 'table',             // Tables
    hr = 'hr',                   // Horizontal rule: ---, ***, ___
    blockquote = 'blockquote',   // Blockquote: >
    list = 'list',               // Ordered or unordered lists
    list_item = 'list_item',     // List item
    paragraph = 'paragraph',     // Paragraph of text
    strong = 'strong',           // Bold: **bold** or __bold__
    em = 'em',                   // Italic: *italic* or _italic_
    codespan = 'codespan',       // Inline code: `code`
    br = 'br',                   // Line break
    del = 'del',                 // Strikethrough: ~~strikethrough~~
    link = 'link',               // Link: [text](url)
    image = 'image',             // Image: ![alt](url)
    text = 'text',               // Plain text
    escape = 'escape',           // Escaped characters: \*
    tag = 'tag',                 // HTML tags
    html = 'html',               // Raw HTML blocks
    def = 'def',                 // Link definition: [id]: url "title"
    checkbox = 'checkbox',       // Task list checkbox: [x] or [ ]
    listItem = 'listItem',       // List item (duplicate key for consistency)
    tableCell = 'tableCell',     // Table cell
    tableRow = 'tableRow',       // Table row
  }

  enum ExtraTokenType {
    spoiler = 'spoiler',
    underline = 'underline',
    tblockquote = "tblockquote" // ? MarkedJS doesnt support html tags inside BlockQuote
  }

  export const TokenType = { ...OrgTokenType, ...ExtraTokenType };

  export type TokenType = OrgTokenType | ExtraTokenType;

  export type Token = _Token;

  const markedLexer = new marked.Lexer();
  marked.use({
    breaks: true,
    gfm: true,
    extensions: [
      {
        level: 'inline',
        name: ExtraTokenType.spoiler,
        start: (src) => src.indexOf("||"),
        tokenizer: (src) => {
          const cap = /^(\|\|?)(?=[^\s|])((?:\\.|[^\\])*?(?:\\.|[^\s|\\]))\1(?=[^|]|$)/.exec(src);
          if (cap) {
            return {
              type: ExtraTokenType.spoiler,
              raw: cap[0],
              text: cap[2],
              tokens: markedLexer.inlineTokens(cap[2]),
            };
          }
        }
      },
      {
        level: 'inline',
        name: ExtraTokenType.underline,
        start: (src) => src.indexOf("__"),
        tokenizer: (src) => {
          const cap = /^(__?)(?=[^\s_])((?:\\.|[^\\])*?(?:\\.|[^\s_\\]))\1(?=[^_]|$)/.exec(src);
          if (cap) {
            return {
              type: ExtraTokenType.underline,
              raw: cap[0],
              text: cap[2],
              tokens: markedLexer.inlineTokens(cap[2]),
            };
          }
        }
      }
    ],
    renderer: {},
    tokenizer: {
      // ? Block level tokenizers
      code: src => undefined,
      heading: src => undefined,
      hr: src => undefined,
      list: src => undefined,
      html: src => undefined,
      def: src => undefined,
      table: src => undefined,
      lheading: src => undefined,
      // ? Inline level tokenizers
      reflink: (src, links) => undefined,
      autolink: (src) => undefined,
    }
  });

  export function tokenizer(src: string) {
    return marked.lexer(src);
  }

  /**
 * Recursively checks whether two token arrays have the same structure.
 * It compares only the `type` property and the structure of any nested tokens.
 */
  function isStructureEqual(tokens1: _Token[], tokens2: _Token[]): boolean {
    // Different lengths means the structure has changed
    if (tokens1.length !== tokens2.length) {
      return false;
    }

    // Compare each token in order
    for (let i = 0; i < tokens1.length; i++) {
      const token1 = tokens1[i];
      const token2 = tokens2[i];

      // Check if the token types are the same
      if (token1.type !== token2.type) {
        return false;
      }

      // Check if both tokens have a 'tokens' property.
      const token1HasChildren = 'tokens' in token1;
      const token2HasChildren = 'tokens' in token2;
      if (token1HasChildren !== token2HasChildren) {
        return false;
      }

      // If the token has children, check them recursively.
      if (token1HasChildren && token2HasChildren) {
        const children1 = token1.tokens || [];
        const children2 = token2.tokens || [];
        if (!isStructureEqual(children1, children2)) {
          return false;
        }
      }
    }

    // All tokens match structurally.
    return true;
  }


  /**
    * Returns true if the AST structure has changed.
    * In other words, it returns true if the two token arrays do NOT have the same structure.
    */
  export function hasStructureChanged(oldTokens: Token[], newTokens: Token[]): boolean {
    return !isStructureEqual(oldTokens, newTokens);
  }
}

export const MarkdownEditorUtils = {
  AUTO_INSERT_CHARS: {
    "*": { eachSide: 1 },
    "_": { eachSide: 2 },
    "~": { eachSide: 2 },
    "|": { eachSide: 2 },
    "`": { eachSide: 1 },
  } as { [key: string]: { eachSide: number } },

  INLINE_MARKERS: {
    [ApiMessageEntityTypes.Bold]: "**",
    [ApiMessageEntityTypes.Italic]: "*",
    [ApiMessageEntityTypes.Underline]: "__",
    [ApiMessageEntityTypes.Strike]: "~~",
    [ApiMessageEntityTypes.Spoiler]: "||",
    [ApiMessageEntityTypes.Code]: "`",
  } as { [key in ApiMessageEntityTypes]: string },

  BLOCK_MARKERS: {
    [ApiMessageEntityTypes.Pre]: "```",
    [ApiMessageEntityTypes.Blockquote]: ">",
  } as { [key in ApiMessageEntityTypes]: string },

  getInlineMarkerByType(type: ApiMessageEntityTypes): string | null {
    return this.INLINE_MARKERS[type] || null;
  },

  getBlockMarkerByType(type: ApiMessageEntityTypes): string | null {
    return this.BLOCK_MARKERS[type] || null;
  },

  getMarkerByType(type: ApiMessageEntityTypes): string | null {
    return this.INLINE_MARKERS[type] || this.BLOCK_MARKERS[type] || null;
  },
};

export namespace TokenHelper {
  function getEntityFromToken(token: MarkedJS.Token, startOffset: number, length: number): ApiMessageEntity | undefined {
    switch (token.type) {
      case MarkedJS.TokenType.strong:
        return { type: ApiMessageEntityTypes.Bold, offset: startOffset, length };
      case MarkedJS.TokenType.spoiler:
        return { type: ApiMessageEntityTypes.Spoiler, offset: startOffset, length };
      case MarkedJS.TokenType.em:
        return { type: ApiMessageEntityTypes.Italic, offset: startOffset, length };
      case MarkedJS.TokenType.underline:
        return { type: ApiMessageEntityTypes.Underline, offset: startOffset, length };
      case MarkedJS.TokenType.del:
        return { type: ApiMessageEntityTypes.Strike, offset: startOffset, length };
      case MarkedJS.TokenType.codespan:
        return { type: ApiMessageEntityTypes.Code, offset: startOffset, length };
      case MarkedJS.TokenType.code:
        return { type: ApiMessageEntityTypes.Pre, offset: startOffset, length, language: token.lang || undefined };
      case MarkedJS.TokenType.link:
        if (token.href) {
          return { type: ApiMessageEntityTypes.TextUrl, offset: startOffset, length, url: token.href };
        }
        return undefined;
      case MarkedJS.TokenType.blockquote:
      case MarkedJS.TokenType.tblockquote:
        return { type: ApiMessageEntityTypes.Blockquote, offset: startOffset, length };
      default:
        return undefined;
    }
  }

  export function htmlToMarkdown(htmlNode: Node): string {
    // ? Shared context prevents exponential string growth, avoiding RangeError.
    const context: { markdown: string; lastNodeEntityType?: ApiMessageEntityTypes } = { markdown: "" };

    function addNewlineIfNeeded() {
      if (!context.markdown.endsWith("\n") && context.markdown !== "") {
        context.markdown += "\n";
      }
    }

    function processChildsNodes(node: ChildNode) {
      if (node.hasChildNodes()) {
        for (const child of node.childNodes) {
          processNode(child);
        }
      }
    }

    function addToMarkdown(newMarkdown: string) {
      // ? There must be at least one \n before and after block level entities
      if (context.lastNodeEntityType === ApiMessageEntityTypes.Blockquote || context.lastNodeEntityType === ApiMessageEntityTypes.Pre) {
        if (context.markdown !== "") {
          // ! we dont need to check this because \n will get removed in the renderTextWithEntities
          // !newMarkdown.startsWith("\n") &&
          context.markdown += "\n";
        }
      }
      context.markdown += newMarkdown;
    }

    function processNode(node: Node) {
      if (node.nodeType === Node.ELEMENT_NODE && node.nodeName.toLowerCase() === 'br') {
        addToMarkdown("\n");
        context.lastNodeEntityType = undefined;
      }
      else if (node.nodeType === Node.TEXT_NODE) {
        addToMarkdown(node.textContent || '');
        context.lastNodeEntityType = undefined;
      }
      // For image emoji
      else if (node instanceof HTMLImageElement && node.dataset.isEmoji === "true") {
        addToMarkdown(node.alt);
        context.lastNodeEntityType = undefined;
      }
      else if (node instanceof Element) {
        const type = getEntityTypeFromNode(node);
        switch (type) {
          // * Inline Markdown Entities: just process children. (markdown markers applied in rendering)
          case ApiMessageEntityTypes.Bold:
          case ApiMessageEntityTypes.Italic:
          case ApiMessageEntityTypes.Strike:
          case ApiMessageEntityTypes.Code:
          case ApiMessageEntityTypes.Spoiler:
            processChildsNodes(node);
            break;
          // * Block Level Markdown Entities: ensure a newline before and after.
          case ApiMessageEntityTypes.Pre: {
            addNewlineIfNeeded();
            const cb = extractCodeBlockData(node);
            if (!cb) throw new Error("Failed to extract code block.");
            // ? Footer or header coudl get removed by Backspace, so we check to replacing them with ''
            addToMarkdown(`${cb.startMarker??''}${cb.language}\n${cb.codeContent}\n${cb.endMarker??''}`);
            break;
          }
          case ApiMessageEntityTypes.Blockquote: {
            addNewlineIfNeeded();
            // const quoteContent = getTextContentWithBreaks(node, {
            //   skipMarkdownMarker: false
            // });
            // const formattedQuote = quoteContent
            //   .split('\n')
            //   .map(line => '> ' + line)
            //   .join('\n');
            // addToMarkdown(formattedQuote);
            const startTag = node.outerHTML.split('>')[0] + '>';
            const endTag = "</span>";
            addToMarkdown(startTag);
            context.lastNodeEntityType = undefined;
            processChildsNodes(node);
            addToMarkdown(endTag);
            break;
          }
          // * Telegram entities without markdown support.
          case ApiMessageEntityTypes.Mention:
          case ApiMessageEntityTypes.TextUrl:
          case ApiMessageEntityTypes.Url:
          case ApiMessageEntityTypes.Cashtag:
          case ApiMessageEntityTypes.Hashtag:
            addToMarkdown(node.outerHTML);
            break;
          case ApiMessageEntityTypes.CustomEmoji: {
            const startTag = node.outerHTML.split('>')[0] + '>';
            const emoji = (node as HTMLImageElement).alt || node.getAttribute('data-alt') || '';
            const endTag = node instanceof HTMLImageElement ? '</img>' : '</div>';
            addToMarkdown(startTag + emoji + endTag);
            break;
          }
          default:
            processChildsNodes(node);
        }
        context.lastNodeEntityType = type;
      }
    }

    processNode(htmlNode);
    return context.markdown;
  }

  export function tokensToFormattedText(tokens: MarkedJS.Token[]): ApiFormattedText {
    function processTokens(
      tokens: MarkedJS.Token[],
      currentOffset: number,
      pendingEntities: { startOffset: number; type?: ApiMessageEntityTypes; href?: string; documentId?: string; language?: string }[]
    ): { text: string; entities: ApiMessageEntity[]; offset: number } {
      let localText = "", localOffset = currentOffset;
      let localEntities: ApiMessageEntity[] = [];

      for (const token of tokens) {
        const startOffset = localOffset;
        let entity: ApiMessageEntity | undefined;
        let tokenText = "";
        let childTexts = "";
        let childEntities: ApiMessageEntity[] = [];

        switch (token.type) {
          case MarkedJS.TokenType.text:
          case MarkedJS.TokenType.codespan:
          case MarkedJS.TokenType.strong:
          case MarkedJS.TokenType.em:
          case MarkedJS.TokenType.del:
          case MarkedJS.TokenType.link:
          case MarkedJS.TokenType.underline:
          case MarkedJS.TokenType.spoiler:
          case MarkedJS.TokenType.blockquote:
          case MarkedJS.TokenType.tblockquote:
            tokenText = token.text;
            break;
          case MarkedJS.TokenType.code:
            tokenText = token.text;
            break;
          case MarkedJS.TokenType.escape:
          case MarkedJS.TokenType.space:
          case MarkedJS.TokenType.br:
            tokenText = token.raw;
            break;
          case MarkedJS.TokenType.html:
            entity = getEntityFromHtmlToken(token, { localOffset, startOffset, pendingEntities });
            break;
          case MarkedJS.TokenType.paragraph:
            // ? Skip paragraph for it childrens
            break;
          default:
            tokenText = token.raw;
            break;
        }
        if ('tokens' in token && token.tokens && token.tokens.length) {
          const processed = processTokens(token.tokens, localOffset, pendingEntities);
          childEntities.push(...processed.entities);
          childTexts = processed.text;
        }

        if (!entity) entity = getEntityFromToken(token, startOffset, childTexts.length || tokenText.length);
        if (entity) localEntities.push(entity);

        localText += (childTexts || tokenText);
        localOffset += (childTexts || tokenText).length;
        localEntities.push(...childEntities);
      }

      return {
        text: localText,
        entities: localEntities,
        offset: localOffset,
      };
    }

    let { text, entities } = processTokens(tokens, 0, []);
    // ? First We should add Parent Entity then child entities because ordering in nested entities important for renderTextWithEntities
    entities = entities.sort((a, b) => a.offset - b.offset);
    return { text, entities };
  }

  function getEntityFromHtmlToken(token: MarkedJS.Token, options: {
    pendingEntities: Array<{
      type?: ApiMessageEntityTypes; startOffset: number;
      href?: string, documentId?: string, language?: string, collapsed?: true
    }>,
    localOffset: number,
    startOffset: number,
    checkLength?: boolean
  }): ApiMessageEntity | undefined {
    if (token.type !== MarkedJS.TokenType.html) throw new Error();
    const { pendingEntities, localOffset, startOffset, checkLength } = options;
    const isOpening = token.raw[0] === '<' && token.raw[1] !== '/';
    const isClosing = token.raw[0] === '<' && token.raw[1] === '/';

    if (isOpening) {
      const extractAttribute = (attr: string) => token.raw.match(new RegExp(`${attr}="([^"]*)"`, "i"))?.[1];
      const entityType = extractAttribute("data-entity-type");

      if (entityType) {
        const href = extractAttribute("href");
        const documentId = extractAttribute("data-document-id");
        const language = extractAttribute("data-language");
        const collapsed = extractAttribute("data-collapsed");

        pendingEntities.push({
          type: entityType as ApiMessageEntityTypes,
          startOffset: localOffset,
          href,
          documentId,
          language,
          collapsed: collapsed === "true" ? true : undefined
        });
      }
    } else if (isClosing) {
      const pendingEntity = pendingEntities.pop();
      if (pendingEntity) {
        const length = localOffset - pendingEntity.startOffset;
        if (!checkLength || length > 0) {
          const { type } = pendingEntity;
          if (type === ApiMessageEntityTypes.TextUrl) {
            if (!pendingEntity.href) {
              throw new Error(`Missing href for TextUrl entity. Entity: ${pendingEntity}`);
            }
            return {
              type: type,
              offset: startOffset - length,
              length,
              url: pendingEntity.href,
            };
          }
          else if (type === ApiMessageEntityTypes.CustomEmoji) {
            if (!pendingEntity.documentId) {
              throw new Error(`Missing documentId for CustomEmoji entity. Entity: ${pendingEntity}`);
            }
            return {
              type: type,
              offset: startOffset - length,
              length,
              documentId: pendingEntity.documentId
            };
          }
          else if (type === ApiMessageEntityTypes.Pre) {
            return {
              type: type,
              offset: startOffset - length,
              length,
              language: pendingEntity.language
            };
          }
          else if (type === ApiMessageEntityTypes.Blockquote) {
            return {
              type: type,
              offset: startOffset - length,
              length,
              collapsed: pendingEntity.collapsed
            };
          }
          else if (type === ApiMessageEntityTypes.Mention ||
            type === ApiMessageEntityTypes.Url ||
            type === ApiMessageEntityTypes.Cashtag ||
            type === ApiMessageEntityTypes.Hashtag) {
            return {
              type: type,
              offset: startOffset - length,
              length,
            };
          }
          else {
            throw new Error(`Unsupported entity type: ${type}`);
          }
        }
      }
    }
  }

  export function htmlToFormattedText(htmlNode: Node): ApiFormattedText {
    return tokensToFormattedText(htmlToTokens(htmlNode));
  }

  function entityTypeToTokenType(entityType?: ApiMessageEntityTypes): MarkedJS.TokenType {
    switch (entityType) {
      case ApiMessageEntityTypes.Bold:
        return MarkedJS.TokenType.strong;
      case ApiMessageEntityTypes.Blockquote:
        return MarkedJS.TokenType.blockquote;
      case ApiMessageEntityTypes.BotCommand:
        return MarkedJS.TokenType.text;
      case ApiMessageEntityTypes.Cashtag:
        return MarkedJS.TokenType.text;
      case ApiMessageEntityTypes.Code:
        return MarkedJS.TokenType.codespan;
      case ApiMessageEntityTypes.Email:
        return MarkedJS.TokenType.link;
      case ApiMessageEntityTypes.Hashtag:
        return MarkedJS.TokenType.text;
      case ApiMessageEntityTypes.Italic:
        return MarkedJS.TokenType.em;
      case ApiMessageEntityTypes.MentionName:
        return MarkedJS.TokenType.link;
      case ApiMessageEntityTypes.Mention:
        return MarkedJS.TokenType.link;
      case ApiMessageEntityTypes.Phone:
        return MarkedJS.TokenType.link;
      case ApiMessageEntityTypes.Pre:
        return MarkedJS.TokenType.code;
      case ApiMessageEntityTypes.Strike:
        return MarkedJS.TokenType.del;
      case ApiMessageEntityTypes.TextUrl:
        return MarkedJS.TokenType.link;
      case ApiMessageEntityTypes.Url:
        return MarkedJS.TokenType.link;
      case ApiMessageEntityTypes.Underline:
        return MarkedJS.TokenType.underline;
      case ApiMessageEntityTypes.Spoiler:
        return MarkedJS.TokenType.spoiler;
      case ApiMessageEntityTypes.CustomEmoji:
        return MarkedJS.TokenType.text;
      case ApiMessageEntityTypes.Unknown:
      default:
        return MarkedJS.TokenType.text;
    }
  }

  export function htmlToTokens(htmlNode: Node): MarkedJS.Token[] {
    function processNode(node: Node): MarkedJS.Token[] {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        return [{
          type: MarkedJS.TokenType.text,
          text,
          raw: text
        }];
      }
      else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        if (isMarkdownMarker(element)) return [];
        const tag = element.tagName.toLowerCase();

        // Handle <br>
        if (tag === 'br') {
          return [{
            type: MarkedJS.TokenType.br,
            raw: '\n'
          }];
        }
        // Handle image emoji: output alt text as plain text.
        else if (element instanceof HTMLImageElement && element.dataset.isEmoji === "true") {
          const alt = element.alt;
          return [{
            type: MarkedJS.TokenType.text,
            text: alt,
            raw: alt
          }];
        }

        const entityType = getEntityTypeFromNode(element);

        if (entityType === ApiMessageEntityTypes.Blockquote) {
          const startTag = element.outerHTML.split('>')[0] + '>';
          return [
            { type: MarkedJS.TokenType.html, raw: startTag, block: true, },
            ...processChildNodes(element),
            { type: MarkedJS.TokenType.html, raw: `</${element.tagName.toLowerCase()}>` }
          ];
        }
        else if (entityType === ApiMessageEntityTypes.Pre) {
          const cb = extractCodeBlockData(element);
          if (!cb) throw new Error("Failed to extract code block.");
          const startTag = element.outerHTML.split('>')[0] + '>';
          return [
            { type: MarkedJS.TokenType.html, raw: startTag, block: true, },
            { type: MarkedJS.TokenType.text, raw: element.innerHTML, text: cb.codeContent },
            { type: MarkedJS.TokenType.html, raw: `</${element.tagName.toLowerCase()}>` }
          ];
        }
        else if (entityType && [ApiMessageEntityTypes.Mention, ApiMessageEntityTypes.TextUrl, ApiMessageEntityTypes.Url,
        ApiMessageEntityTypes.Cashtag, ApiMessageEntityTypes.Hashtag, ApiMessageEntityTypes.CustomEmoji].includes(entityType)) {
          const startTag = element.outerHTML.split('>')[0] + '>';
          const text = entityType === ApiMessageEntityTypes.CustomEmoji ? element.dataset.alt : element.innerText;
          return [
            { type: MarkedJS.TokenType.html, raw: startTag },
            { type: MarkedJS.TokenType.text, raw: element.innerHTML, text },
            { type: MarkedJS.TokenType.html, raw: `</${element.tagName.toLowerCase()}>` }
          ];
        }
        else {
          // Inline elements (strong, em, del, codespan, text, etc.)
          const tokenType = entityTypeToTokenType(entityType);
          return [{
            type: tokenType,
            tokens: processChildNodes(element),
            text: element.innerText,
            raw: element.outerHTML
          }];
        }
      }
      return [];
    }

    function processChildNodes(node: Node): MarkedJS.Token[] {
      const tokens: MarkedJS.Token[] = [];
      node.childNodes.forEach(child => tokens.push(...processNode(child)));
      return tokens;
    }

    return processNode(htmlNode);
  }
}
