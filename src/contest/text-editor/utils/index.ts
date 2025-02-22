import { isMarkdownMarker } from "..";
import { ApiFormattedText, ApiMessageEntityTypes } from "../../../api/types";
import { useCallback, useEffect, useState } from "../../../lib/teact/teact";
import focusEditableElement from "../../../util/focusEditableElement";
import { getEntityTypeFromNode } from "../../../util/parseHtmlAsFormattedText";
import { Contest } from "../../contest";
import { BlockLevelTypesList, InlineFormattingTypesList } from "../MessageInputController";

type VoidCallback = () => void;

export class ChangeNotifier<TEvent, TResponse = void> {
  private _changeCallbacks = new Set<(event: TEvent) => TResponse>();

  notify(event: TEvent): void {
    queueMicrotask(() => {
      this._changeCallbacks.forEach((cb) => cb(event));
    });
  }

  notifySync(event: TEvent): TResponse[] {
    const responses: TResponse[] = [];
    this._changeCallbacks.forEach((cb) => {
      responses.push(cb(event));
    });
    return responses;
  }

  listen(cb: (event: TEvent) => TResponse): () => void {
    this._changeCallbacks.add(cb);
    return () => {
      this._changeCallbacks.delete(cb);
    };
  }

  clear(): void {
    this._changeCallbacks.clear();
  }
}

export const useOperationQueue = () => {
  const [operationQueue, setOperationQueue] = useState<VoidCallback[]>([]);

  const processQueue = useCallback(() => {
    setOperationQueue((prevQueue) => {
      if (prevQueue.length === 0) {
        return [];
      }

      const [operation, ...rest] = prevQueue;
      operation();
      return rest;
    });
  }, []);

  useEffect(() => {
    if (operationQueue.length > 0) {
      processQueue();
    }
  }, [operationQueue, processQueue]);

  const enqueueOperation = useCallback((operation: VoidCallback) => {
    setOperationQueue((prevQueue) => [...prevQueue, operation]);
  }, []);

  return { enqueueOperation };
};

export const FormattedTextKeys: Partial<Record<string, string>> = {
  pre: "language",
  textUrl: "url",
  mentionName: "userId",
  blockquote: "collapsed",
  customEmoji: "documentId",
};

export function normalizeWhitespace(str: string) {
  // Replaces all whitespace characters (spaces, tabs, newlines) with a single space
  return str.replace(/\s+/g, ' ').trim();
}

export function areFormattedTextsEqual(a?: ApiFormattedText, b?: ApiFormattedText): boolean {
  if (!a || !b) return a === b;

  if (normalizeWhitespace(a.text) !== normalizeWhitespace(b.text)) return false;

  const entsA = a.entities?.sort((e1, e2) => e1.offset - e2.offset) ?? [];
  const entsB = b.entities?.sort((e1, e2) => e1.offset - e2.offset) ?? [];

  if (entsA.length !== entsB.length) return false;

  return entsA.every((e, i) => {
    const f = entsB[i];
    if (e.type !== f.type || e.offset !== f.offset || e.length !== f.length) return false;
    const key = FormattedTextKeys[e.type];
    return key ? (e as any)[key] === (f as any)[key] : true;
  });
}

// narrowing Event type to KeyboardEvent.
export function isKeyboardEvent(event: Event): event is KeyboardEvent {
  return 'key' in event;
}

// narrowing Event type to MouseEvent.
export function isMouseEvent(event: Event): event is MouseEvent {
  return 'x' in event;
}

export function isInputEvent(event: Event): event is InputEvent {
  return 'inputType' in event;
}

// narrowing Note type to Element.
export function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

export class MultiLock<T> {
  private _locks: Map<T, boolean> = new Map();
  private readonly _logger = Contest.createLogger("Locker");

  lock(key: T): void {
    this._logger.log(`Locking with key: ${key}`);
    this._locks.set(key, true);
  }

  unlock(key: T): void {
    this._logger.log(`Unlocking with key: ${key}`);
    this._locks.set(key, false);
  }

  isLocked(key: T): boolean {
    return this._locks.get(key) || false;
  }
}

export class NodeHelper {
  private readonly _logger = Contest.createLogger("NodeHelper");

  constructor() { }

  syncDOMNodes(target: HTMLElement, source: HTMLElement): void {
    const targetNodes = Array.from(target.childNodes);
    const sourceNodes = Array.from(source.childNodes);

    let i = 0;
    while (i < sourceNodes.length || i < targetNodes.length) {
      const targetNode = targetNodes[i];
      const sourceNode = sourceNodes[i];

      if (!targetNode) {
        this._logger.log("appendChild()", {
          sourceNode,
          targetNode
        });
        target.appendChild(sourceNode);
      } else if (!sourceNode) {
        target.removeChild(targetNode);
      } else if (!this.isEqual(targetNode, sourceNode!)) {
        // const nodeAType = getEntityTypeFromNode(targetNode);
        // if (nodeAType === ApiMessageEntityTypes.CustomEmoji) {
        //   // replace the CustomEmoji node
        // }
        // else  if (nodeAType === ApiMessageEntityTypes.Blockquote) {
        //   // if both have same type but their content is differennt only update the content
        // }
        if (targetNode.nodeType === Node.TEXT_NODE && sourceNode.nodeType === Node.TEXT_NODE) {
          // Update only text content instead of replacing the node
          targetNode.textContent = sourceNode.textContent;
        } else {
          this._logger.log("replaceChild()", {
            sourceNode,
            targetNode
          });
          // this.logNodeDifferences(sourceNode, targetNode);
          target.replaceChild(sourceNode, targetNode);
        }
      }
      i++;
    }
  }

  isEqual(nodeA: ChildNode, nodeB: ChildNode) {
    const nodeAType = getEntityTypeFromNode(nodeA);
    const nodeBType = getEntityTypeFromNode(nodeA);
    if (nodeAType !== nodeBType) return false;

    switch (nodeAType) {
      case ApiMessageEntityTypes.CustomEmoji:
        if (!(nodeA instanceof HTMLElement)) return false;
        if (!(nodeB instanceof HTMLElement)) return false;
        if (nodeA.dataset.documentId !== nodeB.dataset.documentId) return false;
        if (nodeA.dataset.alt !== nodeB.dataset.alt) return false;
        return true;
      case ApiMessageEntityTypes.Blockquote:
        if (!(nodeA instanceof HTMLElement)) return false;
        if (!(nodeB instanceof HTMLElement)) return false;
      // if (nodeA.dataset.collapsed !== nodeB.dataset.collapsed) return false;
      // if (nodeA.textContent !== nodeB.textContent) return false;
      // check for text content
      // return true;
      default:
        break;
    }

    return nodeA.isEqualNode(nodeB);
  }

  logNodeDifferences(nodeA: Node, nodeB: Node, path: string = 'root') {
    // Compare node names and types
    if (nodeA.nodeName !== nodeB.nodeName) {
      this._logger.log(`${path}: Node names differ: ${nodeA.nodeName} vs ${nodeB.nodeName}`);
    }
    if (nodeA.nodeType !== nodeB.nodeType) {
      this._logger.log(`${path}: Node types differ: ${nodeA.nodeType} vs ${nodeB.nodeType}`);
    }

    // For text nodes, compare text content
    if (nodeA.nodeType === Node.TEXT_NODE && nodeB.nodeType === Node.TEXT_NODE) {
      if (nodeA.textContent !== nodeB.textContent) {
        this._logger.log(`${path}: Text content differs: "${nodeA.textContent}" vs "${nodeB.textContent}"`);
      }
      return;
    }

    // Compare attributes if both nodes are elements
    if (nodeA instanceof Element && nodeB instanceof Element) {
      const attrsA: Record<string, string> = {};
      for (let i = 0; i < nodeA.attributes.length; i++) {
        const attr = nodeA.attributes[i];
        attrsA[attr.name] = attr.value;
      }
      const attrsB: Record<string, string> = {};
      for (let i = 0; i < nodeB.attributes.length; i++) {
        const attr = nodeB.attributes[i];
        attrsB[attr.name] = attr.value;
      }

      for (const name in attrsA) {
        if (!(name in attrsB)) {
          this._logger.log(`${path}: Attribute "${name}" present in nodeA but missing in nodeB`);
        } else if (attrsA[name] !== attrsB[name]) {
          this._logger.log(`${path}: Attribute "${name}" differs: "${attrsA[name]}" vs "${attrsB[name]}"`);
        }
      }
      for (const name in attrsB) {
        if (!(name in attrsA)) {
          this._logger.log(`${path}: Attribute "${name}" present in nodeB but missing in nodeA`);
        }
      }
    }

    // Compare child nodes
    const childrenA: NodeListOf<Node> = nodeA.childNodes;
    const childrenB: NodeListOf<Node> = nodeB.childNodes;

    if (childrenA.length !== childrenB.length) {
      this._logger.log(`${path}: Different number of children: ${childrenA.length} vs ${childrenB.length}`);
    }

    const max = Math.max(childrenA.length, childrenB.length);
    for (let i = 0; i < max; i++) {
      const childA: Node | undefined = childrenA[i] ?? undefined;
      const childB: Node | undefined = childrenB[i] ?? undefined;
      if (!childA) {
        this._logger.log(`${path}: Missing child in nodeA at index ${i} (nodeB: ${childB?.nodeName})`);
        continue;
      }
      if (!childB) {
        this._logger.log(`${path}: Missing child in nodeB at index ${i} (nodeA: ${childA.nodeName})`);
        continue;
      }
      this.logNodeDifferences(childA, childB, `${path} > ${childA.nodeName}[${i}]`);
    }
  }
}

export namespace Utils {
  const CUSTOM_EMOJI_LENGTH_IN_CARET = 1;

  export function getSelectionRange() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return undefined;

    const range = selection.getRangeAt(0);
    return range;
  }

  // ? Count Breaklines and CustomEmoji in caret offset
  // ? Also because CustomEmoji is not contenteditable so user couldnt write
  function createTreeWalker(element: HTMLElement) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          // Include text nodes and <br> elements
          if (node.nodeType === Node.TEXT_NODE || node.nodeName === 'BR') {
            return NodeFilter.FILTER_ACCEPT;
          }
          else if (node instanceof HTMLElement && node.dataset.entityType === ApiMessageEntityTypes.CustomEmoji) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        },
      }
    );
    return walker;
  }

  export function getCaretCharacterOffset(element: HTMLElement): number {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return 0;
    }

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    // Create a temporary element to hold the cloned range
    const tempElement = document.createElement('div');
    tempElement.appendChild(preCaretRange.cloneContents());

    // Handle <br> tags and newlines
    const walker = createTreeWalker(tempElement);

    let caretPosition = 0;
    let currentNode;

    // Traverse the DOM and count characters, including <br> and newlines
    while ((currentNode = walker.nextNode())) {
      if (currentNode.nodeName === 'BR') {
        caretPosition += 1; // Count <br> as a single character
      }
      else if (currentNode instanceof HTMLElement && currentNode.dataset.entityType === ApiMessageEntityTypes.CustomEmoji) {
        caretPosition += CUSTOM_EMOJI_LENGTH_IN_CARET; // Count each emoji as one character
      }
      else if (currentNode.nodeType === Node.TEXT_NODE) {
        caretPosition += currentNode.textContent?.length || 0;
      }
    }

    return caretPosition;
  }

  export function setCaretCharacterOffset(element: HTMLElement, offset?: number): void {
    const walker = createTreeWalker(element);

    let currentOffset = 0;
    let targetNode: Node | null = null;
    let targetOffset = 0;

    if (offset !== undefined) {
      // Traverse the DOM to find the node and offset where the caret should be placed
      while (walker.nextNode()) {
        const node = walker.currentNode;

        if (node.nodeName === 'BR') {
          // Treat <br> as a single character
          if (currentOffset + 1 >= offset) {
            if (node.parentNode) {
              targetNode = node.parentNode; // Place caret after the <br>
              // Find the index of the <br> node among its siblings
              const childNodes = Array.from(node.parentNode.childNodes);
              targetOffset = childNodes.indexOf(node as ChildNode) + 1;
            } else {
              // If parentNode is null, fall back to the element itself
              targetNode = element;
              targetOffset = element.childNodes.length;
            }
            break;
          }
          currentOffset += 1;
        }
        else if (node instanceof HTMLElement && node.dataset.entityType === ApiMessageEntityTypes.CustomEmoji) {
          // Count emoji as 1 character
          if (currentOffset + CUSTOM_EMOJI_LENGTH_IN_CARET >= offset) {
            targetNode = node;
            targetOffset = 0; // Emojis are treated as 1 character
            break;
          }
          currentOffset += CUSTOM_EMOJI_LENGTH_IN_CARET;
        }
        else if (node.nodeType === Node.TEXT_NODE) {
          const textLength = node.textContent?.length || 0;

          if (currentOffset + textLength >= offset) {
            targetNode = node;
            targetOffset = offset - currentOffset;
            break;
          }
          currentOffset += textLength;
        }
      }
    }

    // If no target node is found, place the caret at the end of the element
    if (!targetNode) {
      targetNode = element;
      targetOffset = element.childNodes.length;
    }

    // Handle non-contentEditable nodes like CustomEmoji
    if (targetNode.nodeType !== Node.TEXT_NODE
      && targetNode !== element
      && !(targetNode as HTMLElement).isContentEditable) {
      // Place the caret after the target node in its parent container
      const parentNode = targetNode.parentNode as HTMLElement;
      if (parentNode) {
        const childNodes = Array.from(parentNode.childNodes);
        targetOffset = childNodes.indexOf(targetNode as ChildNode) + 1;
        targetNode = parentNode;
      }
    }

    // Set the caret position
    const range = document.createRange();
    const selection = window.getSelection();

    if (selection && targetNode) {
      range.setStart(targetNode, targetOffset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  export function moveContentOutsideOfElement(element: HTMLElement, shouldExclude: (element: Node) => boolean): void {
    const parent = element.parentNode;
    if (!parent) return;

    const fragment = document.createDocumentFragment();
    let child = element.firstChild;

    while (child) {
      const nextSibling = child.nextSibling;
      if (!shouldExclude(child)) {
        fragment.appendChild(child);
      }
      child = nextSibling;
    }

    parent.insertBefore(fragment, element);
    parent.removeChild(element);
  }

  export function addTextAtStartAndEndOfSelection(textToAddStart: string, textToAddEnd: string) {
    const range = getSelectionRange();
    if (!range) return;

    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    const endContainer = range.endContainer;
    let endOffset = range.endOffset;

    // Add text at the start of the selection
    if (startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = startContainer as Text;
      textNode.insertData(startOffset, textToAddStart);
    } else if (startContainer.nodeType === Node.ELEMENT_NODE) {
      const element = startContainer as HTMLElement;
      const textNode = document.createTextNode(textToAddStart);
      if (startOffset === 0) {
        element.parentNode?.insertBefore(textNode, element);
      } else {
        element.insertBefore(textNode, element.childNodes[startOffset]);
      }
    }

    // Adjust endOffset due to the insertion at the start
    if (startContainer === endContainer) {
      endOffset += textToAddStart.length;
    }

    // Add text at the end of the selection
    if (endContainer.nodeType === Node.TEXT_NODE) {
      const textNode = endContainer as Text;
      textNode.insertData(endOffset, textToAddEnd);
    } else if (endContainer.nodeType === Node.ELEMENT_NODE) {
      const element = endContainer as HTMLElement;
      const textNode = document.createTextNode(textToAddEnd);
      if (endOffset === element.childNodes.length) {
        element.appendChild(textNode);
      } else {
        element.insertBefore(textNode, element.childNodes[endOffset]);
      }
    }

    // Update the selection to include the newly added text
    // const newRange = document.createRange();
    // newRange.setStart(startContainer, startOffset);
    // newRange.setEnd(endContainer, endOffset + textToAddEnd.length);
    // selection.removeAllRanges();
    // selection.addRange(newRange);
  }

  export function getInlineEntitiesInSelection(root: HTMLElement) {
    const range = getSelectionRange();
    if (!range) return null;
    if (range.collapsed) return null;

    const entities = new Set<HTMLElement>();

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) =>
          range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
      }
    );

    let currentNode: Node | null = walker.currentNode;
    while (currentNode) {
      let ancestor: Node | null = currentNode;
      while (ancestor && ancestor !== root) {
        if (
          ancestor instanceof HTMLElement &&
          InlineFormattingTypesList.includes(ancestor.dataset.entityType as any)
        ) {
          entities.add(ancestor);
        }
        ancestor = ancestor.parentNode;
      }
      currentNode = walker.nextNode();
    }
    return Array.from(entities);

    // const topEntities: Set<HTMLElement> = new Set();

    // function findTopmostEntity(node: Node | null) {
    //   let topEntity: HTMLElement | null = null;
    //   while (node && node !== root) {
    //     if (node instanceof HTMLElement && InlineFormattingTypesList.includes(node.dataset.entityType as any)) {
    //       topEntity = node;
    //     }
    //     node = node.parentNode;
    //   }
    //   if (topEntity) topEntities.add(topEntity);
    // }

    // // Traverse from startContainer to endContainer
    // let node: Node | null = range.startContainer;
    // const endNode: Node | null = range.endContainer;
    // let reachedEnd = false;

    // while (node && !reachedEnd) {
    //   findTopmostEntity(node);
    //   if (node === endNode) reachedEnd = true;
    //   node = node.nextSibling || (node.parentNode ? node.parentNode.nextSibling : null);
    // }

    // return Array.from(topEntities);

    // let elements: HTMLElement[] = [];

    // // Helper function to traverse the DOM and collect elements within the range
    // function traverseAndCollect(node: Node) {
    //   if (node.nodeType === Node.ELEMENT_NODE) {
    //     const element = node as HTMLElement;

    //     // Only push the element if it's within the selected range
    //     if (range!.intersectsNode(element)) {
    //       elements.push(element);
    //     }

    //     // Traverse child nodes
    //     node.childNodes.forEach(traverseAndCollect);
    //   }
    // }

    // const commonAncestor = range.commonAncestorContainer;
    // traverseAndCollect(commonAncestor);

    // // ? Case: User selects all or part of text inside an inline entity, but the markdown markers are not selected.
    // if (range.startContainer === range.endContainer && range.startContainer instanceof Text) {
    //   const { startContainer } = range;
    //   if (
    //     startContainer.previousElementSibling && isMarkdownMarker(startContainer.previousElementSibling) &&
    //     startContainer.nextElementSibling && isMarkdownMarker(startContainer.nextElementSibling)
    //   ) {
    //     const parent = startContainer.parentElement;
    //     if (parent instanceof HTMLElement && InlineFormattingTypesList.includes(parent.dataset.entityType as any)) {
    //       elements.push(parent);
    //     }
    //   }
    // }
    // console.log("MMD getInlineEntitiesInSelection() 0", elements);
    // elements = elements.filter(x => InlineFormattingTypesList.includes(x.dataset.entityType as any));
    // console.log("MMD getInlineEntitiesInSelection() 1", elements, range);

    // return elements;
  }

  export function getTopmostInlineEntity(root: HTMLElement) {
    const range = getSelectionRange();
    if (!range) return undefined;

    let node: Node | null = range.startContainer;
    let topEntity: HTMLElement | undefined = undefined;

    while (node && node !== root) {
      if (node instanceof HTMLElement && InlineFormattingTypesList.includes(node.dataset.entityType as any)) {
        topEntity = node;
      }
      node = node.parentNode;
    }

    return topEntity;
  }

  export function getTopmostBlockLevelEntity(root: HTMLElement) {
    const range = getSelectionRange();
    if (!range) return null;

    let node: Node | null = range.startContainer;
    let topEntity: HTMLElement | null = null;

    while (node && node !== root) {
      if (node instanceof HTMLElement && BlockLevelTypesList.includes(node.dataset.entityType as any)) {
        topEntity = node;
      }
      node = node.parentNode;
    }

    return topEntity;
  }

  export function getClosestElementToCaret() {
    const range = getSelectionRange();
    if (!range) return;
    let node = range.startContainer;

    // If caret is inside a text node, check if it's at the beginning or end.
    if (node.nodeType === Node.TEXT_NODE) {
      const offset = range.startOffset;

      // At the beginning of the text node:
      if (offset === 0) {
        let prev = node.previousSibling;
        while (prev && prev.nodeType !== Node.ELEMENT_NODE) {
          prev = prev.previousSibling;
        }
        if (prev) return prev;
      }

      // At the end of the text node:
      if (node.textContent && offset === node.textContent.length) { // Use nodeValue instead of textContent
        let next = node.nextSibling;
        while (next && next.nodeType !== Node.ELEMENT_NODE) {
          next = next.nextSibling;
        }
        if (next) return next;
      }

      return node;
    }

    // If the caret is in an element node, check if it is at the beginning or end of its child nodes.
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (range.startOffset === 0) {
        return node.previousSibling || node;
      } else if (range.startOffset === node.childNodes.length) {
        return node; // node.nextSibling || node;
      }
    }

    return node;
  }

  function getDeepestLastChild(node: Node) {
    while (node.lastChild) {
      node = node.lastChild;
    }
    return node;
  }

  export function moveCaretToEndOfPreviousSibling(element: Node): void {
    let prevSibling = element.previousSibling;

    while (
      prevSibling &&
      prevSibling.nodeType !== Node.TEXT_NODE &&
      (!prevSibling.textContent || !prevSibling.textContent.trim())
    ) {
      prevSibling = prevSibling.previousSibling;
    }

    if (!prevSibling) {
      if (element.previousSibling) prevSibling = element.previousSibling;
      else return;
    }

    const range = document.createRange();
    const selection = window.getSelection();
    if (!selection) return;

    let targetNode: Node = prevSibling;
    let offset = 0;

    if (prevSibling.nodeType !== Node.TEXT_NODE) {
      targetNode = getDeepestLastChild(prevSibling);
      if (targetNode.nodeType === Node.TEXT_NODE) {
        offset = targetNode.textContent ? targetNode.textContent.length : 0;
      } else {
        offset = targetNode.childNodes.length;
      }
    } else {
      offset = prevSibling.textContent ? prevSibling.textContent.length : 0;
    }

    try {
      range.setStart(targetNode, offset);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {
      console.error(e);
    }
  }

  export function getTextContentWithBreaks(node: Node, options: {
    skipMarkdownMarker?: boolean;
    trim?: boolean;
  } = { skipMarkdownMarker: true, trim: false }): string {
    if (!node || (options.skipMarkdownMarker && isMarkdownMarker(node))) return "";
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (node.nodeName === 'BR') return '\n';

    let text = Array.from(node.childNodes)
      .map(child => getTextContentWithBreaks(child, options))
      .join("");

    return options.trim ? text.trim() : text;
  }

  export function getCaretLineInfo(container: HTMLElement) {
    if (!container) return null;

    const text = getTextContentWithBreaks(container, { skipMarkdownMarker: false });
    let lines = text.split('\n');
    // ? Remove a trailing empty line (placeholder blank line per WHATWG recommendations)
    if (lines.length > 1 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }

    const caretOffset = getCaretCharacterOffset(container);
    let currentLineIndex = 0;
    let accumulatedLength = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (caretOffset <= accumulatedLength + line.length) {
        currentLineIndex = i;
        break;
      }
      accumulatedLength += line.length + 1; // for \n of new Line
    }

    return {
      lines,
      currentLineIndex,
      currentLineCaretOffset: caretOffset - accumulatedLength
    };
  }

  export function simulateEnter() {
    document.execCommand("insertLineBreak");
  }

  export function extractFullLineInfo(container: HTMLElement) {
    const caretLineInfo = getCaretLineInfo(container);
    if (!caretLineInfo) return undefined;

    const { currentLineIndex, lines, currentLineCaretOffset } = caretLineInfo;
    const isEmpty = (indexes: number[]) => indexes.every(i => lines[i]?.trim() === '');

    return {
      isInFirstLine: currentLineIndex === 0,
      isInThirdLine: currentLineIndex === 2,
      isTwoFirstLineEmpty: lines.length >= 2 && isEmpty([0, 1]),
      isInLastLine: currentLineIndex === lines.length - 1,
      isTwoLastLineEmpty: lines.length >= 2 && isEmpty([lines.length - 2, lines.length - 1]),
      isStartOfCurrentLine: currentLineCaretOffset === 0,
      isCurrentLineEmpty: lines[currentLineIndex]?.trim() === '',
    };
  }

  export function insertHardBreak(position: 'before' | 'after', targetNode?: Node) {
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let currentNode = targetNode || range.startContainer;
    if (!currentNode.parentNode) return; // Ensure it's inside a valid parent

    const newLine = document.createElement('div');
    newLine.appendChild(document.createElement('br'));

    if (position === 'before') {
      // Insert before the specified or detected node
      currentNode.parentNode.insertBefore(newLine, currentNode);
    } else {
      // Insert after the specified node or at the selection
      currentNode.parentNode.insertBefore(newLine, currentNode.nextSibling);
    }

    // Move the cursor after the newly inserted line
    const newRange = document.createRange();
    newRange.setStartAfter(newLine);
    newRange.collapse(true);

    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  export function clearSelection() {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    if (selection.removeAllRanges) {
      selection.removeAllRanges();
    } else if (selection.empty) {
      selection.empty();
    }
  }
}
