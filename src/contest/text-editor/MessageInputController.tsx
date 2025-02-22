import { isMarkdownMarker, MARKDOWN_MARKER_CLASS_NAME } from ".";
import { ApiFormattedText, ApiSticker, ApiMessageEntityTypes } from "../../api/types";
import renderText from "../../components/common/helpers/renderText";
import { renderTextWithEntities, processEntity } from "../../components/common/helpers/renderTextWithEntities";
// import parseHtmlAsFormattedText from "../../util/parseHtmlAsFormattedText";
import { Contest } from "../contest";
import { MarkdownEditorUtils, TokenHelper, MarkedJS } from "./TokenHelper";
import { RichTextEditorInstance } from "./RichTextEditor";
import { areFormattedTextsEqual, isKeyboardEvent, MultiLock, Utils } from "./utils";
import React, { } from '../../lib/teact/teact';
import { checkCodeBlockHeaderFooter } from "../../components/common/code/CodeBlock";
import { checkBlockQuoteFirstLast } from "../../components/common/Blockquote";

enum EventKey {
  Enter = 'Enter',
  Backspace = 'Backspace',
  Space = 'Space',
  Delete = 'Delete',
  ArrowUp = 'ArrowUp',
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  Tab = 'Tab',
  Escape = 'Escape',
}

const CONFIG = {
  MARKDOWN_HANDLER_DEBOUNCE_MS: 250,
  HISTORY_DEBOUNCE_MS: 400,
  HISTORY_MAX_STACK_SIZE: 100
}

const EVENTS: (keyof HTMLElementEventMap)[] = [
  "click", "keyup", "keydown", "compositionend", "compositionstart", 'selectionchange'
];

enum BlockType {
  Paragraph = "Paragraph",
  CodeBlock = "CodeBlock",
  QuoteBlock = "QuoteBlock"
}

interface TextEditorOptions {
  messageSendKeyCombo: "enter" | "ctrl-enter" | undefined;
  isCurrentUserPremium?: boolean;
  initialText?: ApiFormattedText;
  canSendCustomEmoji?: (emoji: ApiSticker, emojiSetId?: string) => boolean;
}

class MarkdownHandler {
  private _prevMarkdown?: string;
  private _prevTokens: MarkedJS.Token[] = [];
  private _debounceTimer?: number;
  private readonly _logger = Contest.createLogger("MarkdownHandler");

  constructor(private readonly _controller: MessageInputController) { }

  reloadMarkdownCache() {
    const root = this._controller.getRoot();
    if (!root) return;
    const markdown = TokenHelper.htmlToMarkdown(root);
    this._prevMarkdown = markdown.trim();
    const tokens = MarkedJS.tokenizer(markdown);
    this._prevTokens = tokens;
  }

  checkImmediately() {
    this._debounceTimer = undefined;
    this.onContentChanged();
  }

  checkMarkdownMarkers() {
    const root = this._controller.getRoot();
    if (!root) return;
    const blockElement = Utils.getTopmostBlockLevelEntity(root);
    root.querySelectorAll(`.${MARKDOWN_MARKER_CLASS_NAME}`).forEach(el => el.classList.remove('show'));
    let element = Utils.getTopmostInlineEntity(blockElement || root);
    if (!element) {
      // ? For cases when Caret is *TEXT*| near to markdown marker but not inside the entity
      const candidate = Utils.getClosestElementToCaret();
      if (candidate instanceof HTMLElement && candidate !== root && root.contains(candidate))
        element = candidate;
    }
    if (!(element instanceof HTMLElement)) return;
    element.querySelectorAll(`.${MARKDOWN_MARKER_CLASS_NAME}`).forEach(el => el.classList.add('show'));
  }

  onContentChanged() {
    if (this._debounceTimer) return;
    this._debounceTimer = window.setTimeout(() => {
      this._check();
      this._debounceTimer = undefined;
    }, CONFIG.MARKDOWN_HANDLER_DEBOUNCE_MS);
  }

  checkForAutoInsert(event: KeyboardEvent) {
    const char = MarkdownEditorUtils.AUTO_INSERT_CHARS[event.key];
    if (event.repeat || !char) return;

    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    const root = this._controller.getRoot();
    if (!root || !range.collapsed) return;

    event.preventDefault();
    const cursorPos = Utils.getCaretCharacterOffset(root);
    const currentText = Utils.getTextContentWithBreaks(root, { skipMarkdownMarker: false });

    if (event.key === "`") {
      const lineInfo = Utils.getCaretLineInfo(root);
      if (lineInfo) {
        const currentLine = lineInfo.lines[lineInfo.currentLineIndex];
        if (currentLine === "``") {
          const info = this._controller.getBlockInfo();
          if (info && info.blockType === BlockType.Paragraph) {
            // ? Move caret to end of line
            if (lineInfo.currentLineCaretOffset !== currentLine.length)
              Utils.setCaretCharacterOffset(root, currentLine.length);

            const DEFAULT_LANG = "",
              extraOffset = DEFAULT_LANG.length + 1, // 1 for new `
              newRange = Utils.getSelectionRange();
            if (!newRange) return;
            const textNode = document.createTextNode(`\`${DEFAULT_LANG}\n\n\`\`\``);
            newRange.insertNode(textNode);
            Utils.setCaretCharacterOffset(root, currentLine.length + extraOffset);
            return;
          }
        }
      }
    }

    const handleInsertCharacter = (char: string, eachSide: number, count: number) => {
      const textToInsert = char.repeat(count);
      range.deleteContents();
      const textNode = document.createTextNode(textToInsert);
      range.insertNode(textNode);

      const newRange = document.createRange();
      newRange.setStart(textNode, eachSide);
      newRange.setEnd(newRange.startContainer, newRange.startOffset);
      selection.removeAllRanges();
      selection.addRange(newRange);
    };

    const lastChar = currentText[cursorPos - 1];
    const nextChar = currentText[cursorPos + 1];

    const isAccepted = (sideChar?: string) => !sideChar || sideChar.trim() === '' || sideChar.trim() === '\n';
    const isValid = isAccepted(lastChar) && isAccepted(nextChar);
    handleInsertCharacter(event.key, isValid ? char.eachSide : 1, isValid ? char.eachSide * 2 : 1);
  }

  private _check() {
    const root = this._controller.getRoot();
    if (!root) return;
    const markdown = TokenHelper.htmlToMarkdown(root);
    if (this._prevMarkdown === markdown.trim()) {
      return;
    }
    const tokens = MarkedJS.tokenizer(markdown);
    this._logger.log("Markdown content updated, checking for tokens..", { prevMarkdown: this._prevMarkdown, markdown });
    this._prevMarkdown = markdown.trim();
    if (!MarkedJS.hasStructureChanged(this._prevTokens, tokens)) return;

    this._logger.log("Tokens structure changed, updating text editor.", { tokens, prevTokens: this._prevTokens });
    this._prevTokens = tokens;
    const formattedText = TokenHelper.tokensToFormattedText(tokens);
    queueMicrotask(() => {
      this._controller.setup(formattedText, { source: "MarkdownHelper" });
    });
  }
}

export const BlockLevelTypesList = [ApiMessageEntityTypes.Pre, ApiMessageEntityTypes.Blockquote] as const;
export const InlineFormattingTypesList = [
  ApiMessageEntityTypes.Bold,
  ApiMessageEntityTypes.Italic,
  ApiMessageEntityTypes.Underline,
  ApiMessageEntityTypes.Strike,
  ApiMessageEntityTypes.Spoiler,
  ApiMessageEntityTypes.Code,
] as const;

export type FormattingTypes = (typeof InlineFormattingTypesList)[number] | ApiMessageEntityTypes.Blockquote;

enum LockType {
  ContentChange = "ContentChange",
  History = "History"
}

type HistoryState = {
  caretOffset: number | undefined,
  formattedText: ApiFormattedText
}

class HistoryManager {
  private _undoStack: HistoryState[] = [];
  private _redoStack: HistoryState[] = [];
  private _currentState?: HistoryState;
  private _saveTimeout?: NodeJS.Timeout;
  private _logger = Contest.createLogger("HistoryManager");

  constructor(initialState: HistoryState) {
    this._currentState = initialState;
  }

  saveState(newState: HistoryState) {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = undefined;
    }
    this._saveState(newState);
  }

  saveStateDebounced(newState: HistoryState) {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
    }
    this._saveTimeout = setTimeout(() => {
      this._saveState(newState);
    }, CONFIG.HISTORY_DEBOUNCE_MS);
  }

  private _saveState(newState: HistoryState) {
    const hasStateChanged = !this._currentState || !areFormattedTextsEqual(newState.formattedText, this._currentState.formattedText);
      // || newState.caretOffset !== this._currentState.caretOffset;

    if (!hasStateChanged) {
      this._logger.log("No changes detected, skipping save", { newState });
      return;
    }
    this._logger.log("State saved", { newState });

    if (this._currentState) {
      this._undoStack.push(this._currentState);
      if (this._undoStack.length > CONFIG.HISTORY_MAX_STACK_SIZE) {
        this._undoStack.shift(); // Remove the oldest state
      }
    }
    this._currentState = newState;
    this._redoStack = [];
  }

  undo() {
    if (this._undoStack.length > 0) {
      this._redoStack.push(this._currentState!);
      this._currentState = this._undoStack.pop()!;
      return this._currentState;
    }
    return null; // No more states to undo
  }

  redo() {
    if (this._redoStack.length > 0) {
      this._undoStack.push(this._currentState!);
      this._currentState = this._redoStack.pop()!;
      return this._currentState;
    }
    return undefined; // No more states to redo
  }

  getCurrentState() {
    return this._currentState;
  }
}

export class MessageInputController {
  private readonly _logger = Contest.createLogger("[MessageInputController]");
  private readonly _markdownHandler: MarkdownHandler;
  private readonly _history = new HistoryManager({
    formattedText: { text: '' },
    caretOffset: 0
  });
  locker = new MultiLock<LockType>();

  constructor(readonly options: TextEditorOptions, private readonly _richTextEditorRef: React.RefObject<RichTextEditorInstance>) {
    this._logger.log("constructor()");
    this._markdownHandler = new MarkdownHandler(this);
    this._init();
  }

  private _init() {
    const richTextEditor = this._richTextEditorRef.current;
    if (!richTextEditor) throw new Error("element reference is missing.");
    const root = richTextEditor.getRoot();
    if (!root) throw new Error("Root element reference is missing.");

    EVENTS.forEach(event => root.addEventListener(event, this._eventHandler.bind(this)));
    document.addEventListener("selectionchange", this._eventHandler.bind(this));

    richTextEditor.onContentChange(() => {
      if (!this.locker.isLocked(LockType.ContentChange)) this._markdownHandler.onContentChanged();
      if (!this.locker.isLocked(LockType.History)) this._saveHistory(true);
    });

    if (!this.options.initialText && Contest.isTestMode()) Contest.Test().runMessageInputTest(this);

    if (this.options.initialText) {
      this.setup(this.options.initialText, { source: 'initialText' });
    }
  }

  getRoot() {
    return this._richTextEditorRef.current?.getRoot();
  }

  cleanup() {
    this._logger.log("cleanup()");
    const root = this._richTextEditorRef.current?.getRoot();
    EVENTS.forEach(event => root?.removeEventListener(event, this._eventHandler));
    document.removeEventListener("selectionchange", this._eventHandler);
    this._richTextEditorRef.current?.clearContent();
  }

  handleCloseTextFormatter() {
    Utils.clearSelection();
  }

  getHtmlBeforeSelection() {
    return '';
  }

  getSelectedTextInfo() {
    const root = this.getRoot()!;
    const elements = Utils.getInlineEntitiesInSelection(root) || [];
    const selectionInfo = this.getBlockInfo();

    const blockLevelEntities = BlockLevelTypesList.filter(type =>
      elements.some(el => el.dataset.entityType === type)
      // ? Adding block level element if current selection is inside it
      || selectionInfo?.blockElement?.dataset.entityType === type);
    const activeFormats: FormattingTypes[] = InlineFormattingTypesList.filter(type => elements.some(el => el.dataset.entityType === type));
    const availableFormats: FormattingTypes[] = [...InlineFormattingTypesList];
    // If no block elements exist or the only block element is Blockquote, add Blockquote to active and available formats
    if (blockLevelEntities.length === 1 && blockLevelEntities[0] === ApiMessageEntityTypes.Blockquote) {
      activeFormats.push(ApiMessageEntityTypes.Blockquote);
      availableFormats.push(ApiMessageEntityTypes.Blockquote);
      // if (selectionInfo && selectionInfo.blockElement) elements.push(selectionInfo.blockElement);
    }
    else if (blockLevelEntities.length === 0) {
      availableFormats.push(ApiMessageEntityTypes.Blockquote);
      // if (selectionInfo && selectionInfo.blockElement) elements.push(selectionInfo.blockElement);
    }
    this._logger.log("getSelectedTextInfo", {
      selectionInfo: selectionInfo,
      elements,
      availableFormats,
      activeFormats
    });

    return { availableFormats, activeFormats, elements };
  }

  canOpenTextFormatter() {
    return !this._isInsideCodeBlock();
  }

  applyFormatToSelectedText(type: FormattingTypes) {
    this._logger.log("applyFormatToSelectedText", { type });

    const { elements, availableFormats, activeFormats } = this.getSelectedTextInfo();
    this._logger.log("applyFormatToSelectedText", { type, elements, availableFormats, activeFormats });

    if (!availableFormats.includes(type)) return;

    const isActive = activeFormats.includes(type);
    if (isActive) {
      const effectedElements = elements.filter(x => x.dataset.entityType === type);
      effectedElements.forEach(x => {
        Utils.moveContentOutsideOfElement(x, isMarkdownMarker);
      });
    }
    else {
      const marker = MarkdownEditorUtils.getMarkerByType(type);
      if (!marker) return;
      if (type === ApiMessageEntityTypes.Blockquote) {
        Utils.addTextAtStartAndEndOfSelection(`${marker} `, "");
      }
      else {
        Utils.addTextAtStartAndEndOfSelection(marker, marker);
      }
    }
  }

  getHtml() {
    return this._richTextEditorRef.current?.getHtml() || "";
  }

  isTouched() {
    return !this.isHtmlEmpty();
  }

  isHtmlEmpty() {
    const html = this.getHtml();
    return html === '' || html === '\n' || html === '<br>';
  }

  listen(cb: () => void) {
    return this._richTextEditorRef.current?.onContentChange(cb);
  }

  deleteLastCharacterOutsideSelection() { }

  getFormattedText(): ApiFormattedText {
    return TokenHelper.htmlToFormattedText(this.getRoot()!);
    // const formattedText = parseHtmlAsFormattedText(this.getHtml(), false, true);
    // return formattedText;
  }

  setup(formattedText?: ApiFormattedText, options: {
    source?: string,
    isHistory?: boolean
  } = { isHistory: false }) {
    if (Contest.isTestMode() && options.source === "useDraft()") return; // ! Ignore Draft during tests

    this._logger.log(`setup() called from '${options.source}'`, { formattedText, options });
    if (formattedText) {
      const rendered = renderTextWithEntities({
        ...formattedText,
        isInEditMode: true
      });
      this._richTextEditorRef.current?.replaceContent(<>{rendered}</>);
      if (options.isHistory) this._markdownHandler.checkMarkdownMarkers();
    }
    else {
      this.resetEditor();
    }
    if (!options.isHistory) {
      this._saveHistory();
    }
  }

  private _isInsideCodeBlock() {
    const blockInfo = this.getBlockInfo();
    return blockInfo && blockInfo.blockType === BlockType.CodeBlock;
  }

  resetEditor() {
    this._logger.log("resetEditor()");
    this._richTextEditorRef.current?.clearContent();
  }

  insertEmoji(emoji: string | ApiSticker) {
    this._logger.log('insertEmoji()', emoji);
    if (this._isInsideCodeBlock()) return;
    if (typeof emoji === 'string') {
      const newEmoji = renderText(emoji);
      this._richTextEditorRef.current?.insertElement(<>{newEmoji}</>);
      this._saveHistory();
    }
    else {
      const emojiSetId = 'id' in emoji.stickerSetInfo ? emoji.stickerSetInfo.id : undefined;
      if (this.options.canSendCustomEmoji?.(emoji, emojiSetId))

        if (emoji.emoji) {
          const newEmoji = processEntity({
            entity: {
              documentId: emoji.id,
              type: ApiMessageEntityTypes.CustomEmoji,
              length: emoji.emoji.length,
              offset: 0
            },
            entityContent: "",
            nestedEntityContent: [],
          });
          this._richTextEditorRef.current?.insertElement(<>{newEmoji}</>);
          this._saveHistory();
        }
    }
  }

  private _eventHandler(event: Event) {
    switch (event.type as keyof HTMLElementEventMap) {
      case 'click': {
        // this.content.clickHandler(event);
        break;
      }
      case 'selectionchange': {
        this._markdownHandler.checkMarkdownMarkers();
      }
      case 'keydown': {
        if (isKeyboardEvent(event))
          this._keydownHandler(event);
        break;
      }
      case 'keyup': {
        // this.content.keyupHandler(event);
        break;
      }
      case 'compositionend':
      case 'compositionstart': {
        // this.content.composeHandler(event);
        break;
      }
    }
  }

  getBlockInfo() {
    const range = Utils.getSelectionRange();
    if (!range) return undefined;

    const root = this.getRoot();
    if (!root) return undefined;

    const blockElement = Utils.getTopmostBlockLevelEntity(root);

    const blockType = blockElement?.dataset.entityType === ApiMessageEntityTypes.Pre
      ? BlockType.CodeBlock
      : blockElement?.dataset.entityType === ApiMessageEntityTypes.Blockquote
        ? BlockType.QuoteBlock
        : BlockType.Paragraph;

    return {
      range,
      isCollapsed: range.collapsed,
      isMultipleBlockSelected: false,
      blockType,
      blockElement
    };
  }

  private _keydownHandler(event: KeyboardEvent) {
    const { messageSendKeyCombo } = this.options;
    const isSend = event.key === EventKey.Enter &&
      ((messageSendKeyCombo === 'enter' && !event.shiftKey) ||
        (messageSendKeyCombo === 'ctrl-enter' && (event.ctrlKey || event.metaKey)));
    if (isSend) return; // ? Handle send in the <NewMessageInput>

    if (event.key === EventKey.Backspace || event.key === EventKey.Enter) {
      const selectionInfo = this.getBlockInfo();
      if (selectionInfo) {
        if (selectionInfo.blockType === BlockType.CodeBlock) {
          if (this._handleCodeBlockKeyDown(event, selectionInfo)) {
            event.preventDefault();
            return;
          }
        }
        else if (selectionInfo.blockType === BlockType.QuoteBlock) {
          if (this._handleBlockQuoteKeyDown(event, selectionInfo)) {
            event.preventDefault();
            return;
          }
        }
      }
    }

    switch (event.key) {
      // case EventKey.Backspace: {
      //   // ! remove the break
      //   // if ()
      //   // if text is empty move
      //   break;
      // }
      case EventKey.Delete:
        const info = this.getBlockInfo();
        if (info?.blockElement) {
          info?.blockElement.remove();
        }
        break;
      case EventKey.Enter:
        if (!event.shiftKey) {
          event.preventDefault();
          Utils.simulateEnter();
        }
        break;
      default:
        if ((event.ctrlKey || event.metaKey) && !event.repeat) {
          if (event.key === "z") {
            event.preventDefault();
            event.shiftKey ? this._redoHistory() : this._undoHistory();
          } else if (event.key === "y") {
            event.preventDefault();
            this._redoHistory();
          }
        }
        else {
          this._markdownHandler.checkForAutoInsert(event);
        }
        break;
    }
  }

  private _saveHistory(isDebounced: boolean = false) {
    const root = this.getRoot();
    if (!root) return;
    const newState: HistoryState = {
      caretOffset: Utils.getCaretCharacterOffset(root),
      formattedText: this.getFormattedText()
    };
    if (isDebounced) this._history.saveStateDebounced(newState);
    else this._history.saveState(newState);
  }

  private _undoHistory() {
    const state = this._history.undo();
    if (!state) return;
    this._logger.log("_undoHistory()", { state });
    const root = this.getRoot();
    if (!root) return;
    this.locker.lock(LockType.ContentChange);
    this.locker.lock(LockType.History);
    this.setup(state.formattedText, {
      source: "history-undo",
      isHistory: true
    });
    this._markdownHandler.reloadMarkdownCache(); // ! Pervent rerender request from MarkdownHandler after unlock
    this.locker.unlock(LockType.History);
    this.locker.unlock(LockType.ContentChange);
    Utils.setCaretCharacterOffset(root, state.caretOffset);
    this._markdownHandler.checkMarkdownMarkers();
  }

  private _redoHistory() {
    const state = this._history.redo();
    if (!state) return;
    this._logger.log("_redoHistory()", { state });
    const root = this.getRoot();
    if (!root) return;
    this.locker.lock(LockType.ContentChange);
    this.locker.lock(LockType.History);
    this.setup(state.formattedText, {
      source: "history-redo",
      isHistory: true
    });
    this._markdownHandler.reloadMarkdownCache(); // ! Pervent rerender request from MarkdownHandler after unlock
    this.locker.unlock(LockType.History);
    this.locker.unlock(LockType.ContentChange);
    Utils.setCaretCharacterOffset(root, state.caretOffset);
    this._markdownHandler.checkMarkdownMarkers();
  }

  private _handleBlockQuoteKeyDown(event: KeyboardEvent, info: ReturnType<typeof this.getBlockInfo>) {
    if (!info?.blockElement || info.blockType !== BlockType.QuoteBlock || !this._richTextEditorRef.current) return;

    const { gradientContainer: container } = checkBlockQuoteFirstLast(info.blockElement);
    if (!(container instanceof HTMLElement)) return;

    const lineInfo = Utils.extractFullLineInfo(container);
    if (!lineInfo) return;

    if (event.code === EventKey.Backspace) {
      if (lineInfo.isInFirstLine && lineInfo.isInLastLine && lineInfo.isCurrentLineEmpty) {
        info.blockElement.remove();
        return true;
      }
      else if (lineInfo.isInFirstLine && lineInfo.isStartOfCurrentLine) {
        Utils.moveCaretToEndOfPreviousSibling(info.blockElement);
        return true;
      }
    }
    else if (event.code === EventKey.Enter) {
      if (lineInfo.isInThirdLine && lineInfo.isTwoFirstLineEmpty) {
        this.locker.lock(LockType.ContentChange);
        if (container.firstChild) container.removeChild(container.firstChild);
        if (container.firstChild) container.removeChild(container.firstChild);
        Utils.insertHardBreak('before', info.blockElement);
        this.locker.unlock(LockType.ContentChange);
        return true;
      }
      else if (lineInfo.isInLastLine && lineInfo.isTwoLastLineEmpty) {
        this.locker.lock(LockType.ContentChange);
        if (container.lastChild) container.removeChild(container.lastChild);
        if (container.lastChild) container.removeChild(container.lastChild);
        Utils.insertHardBreak('after', info.blockElement);
        this.locker.unlock(LockType.ContentChange);
        return true;
      }
    }
  }

  private _handleCodeBlockKeyDown(event: KeyboardEvent, info: ReturnType<typeof this.getBlockInfo>) {
    if (!info?.blockElement || info.blockType !== BlockType.CodeBlock || !this._richTextEditorRef.current) return;

    const { header, footer, isInHeader, isInFooter, codeContent } = checkCodeBlockHeaderFooter(info.blockElement, info.range.startContainer);

    if (!(codeContent instanceof HTMLElement)) return;

    const lineInfo = Utils.extractFullLineInfo(codeContent);
    if (!lineInfo) return;

    if (event.code === EventKey.Backspace) {
      if (isInHeader) {
        const headerOffset = Utils.getCaretCharacterOffset(header as HTMLElement);
        if (headerOffset === 0) {
          Utils.insertHardBreak('before', info.blockElement);
          return true;
        }
        // ? Our tokenizer (Markedjs) doesn't check for ending tags in CodeBlock, so we should remove the footer marker when removing the header marker.
        else if (headerOffset <= 3) {
          footer?.remove();
          header?.remove();
          return true;
        }
      }
      else if (isInFooter) {
        const footerOffset = Utils.getCaretCharacterOffset(footer as HTMLElement);
        if (footerOffset === 0) {
          Utils.setCaretCharacterOffset(codeContent, 0);
          return true;
        }
        else if (footerOffset <= 3) {
          footer?.remove();
          header?.remove();
          return true;
        }
      }
    }
    else if (event.code === EventKey.Enter) {
      if (isInHeader) {
        const headerOffset = Utils.getCaretCharacterOffset(header as HTMLElement);
        if (headerOffset === 0) {
          Utils.insertHardBreak('before', info.blockElement);
          return true;
        }
        else if (codeContent) {
          Utils.setCaretCharacterOffset(codeContent, 0);
          return true;
        }
      } else if (isInFooter) {
        Utils.insertHardBreak('after', info.blockElement);
        return true;
      }
    }
  }
}
