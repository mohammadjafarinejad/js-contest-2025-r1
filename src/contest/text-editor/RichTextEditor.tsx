import { ApiMessageEntityTypes } from '../../api/types';
import useLastCallback from '../../hooks/useLastCallback';
import React, { FC, getIsHeavyAnimating, RefObject, useCallback, useEffect, useRef, useState, VirtualElement, VirtualType } from '../../lib/teact/teact';
import TeactDOM from '../../lib/teact/teact-dom';
import focusEditableElement from '../../util/focusEditableElement';
import { ChangeNotifier, NodeHelper, useOperationQueue, Utils } from './utils';

// Focus slows down animation, also it breaks transition layout in Chrome
const FOCUS_DELAY_MS = 350;

interface RichTextEditorProps
  extends Omit<React.HTMLProps<HTMLDivElement>, 'ref' | 'contentEditable' | 'tabIndex' | 'onBeforeInput' | 'suppressContentEditableWarning'> {
  onInstanceRef?: (instanceRef: RefObject<RichTextEditorInstance>) => void;
  contentEditable?: boolean;
  canFocus?: boolean;
}

type VoidCallback = () => void;
export interface RichTextEditorInstance {
  getRoot: () => HTMLDivElement | undefined;
  getHtml: () => string;
  onContentChange: (cb: VoidCallback) => (VoidCallback | undefined);
  replaceContent: (element: VirtualElement) => void;
  insertElement: (element: VirtualElement) => void;
  clearContent: VoidCallback;
  cleanup: VoidCallback;
}

const nodeHelper = new NodeHelper();

const RichTextEditor: FC<RichTextEditorProps> = ({
  onInstanceRef,
  contentEditable,
  canFocus,
  ...props
}) => {
  const localInputRef = useRef<HTMLDivElement>(null);
  const contentChangeNotifier = useRef(new ChangeNotifier<void>());
  const mutationObserverRef = useRef<MutationObserver | null>(null);

  const getRootElement = () => localInputRef.current || undefined;

  const clearContent = useLastCallback(() => {
    if (!localInputRef.current) return;
    TeactDOM.render(undefined, localInputRef.current);
    localInputRef.current.innerHTML = "";
  });

  const instanceRef = useRef<RichTextEditorInstance>(({
    getRoot: getRootElement,
    getHtml() {
      return getRootElement()?.innerHTML || "";
    },
    replaceContent(element) {
      if (!localInputRef.current) return;
      const caretPosition = Utils.getCaretCharacterOffset(localInputRef.current);

      // const hiddenDiv = document.createElement("div");
      // TeactDOM.render(<>{element}</>, hiddenDiv);
      // nodeHelper.syncDOMNodes(localInputRef.current, hiddenDiv);

      clearContent();
      TeactDOM.render(<>{element}</>, localInputRef.current);
      Utils.setCaretCharacterOffset(localInputRef.current, caretPosition);
    },
    onContentChange(cb) {
      return contentChangeNotifier.current.listen(cb);
    },
    insertElement(element) {
      if (!localInputRef.current) return;
      let selection = document.getSelection();
      if (!selection || selection.rangeCount === 0) {
        localInputRef.current.focus();
        // Ensure the selection is updated after focusing
        selection = document.getSelection();
        if (!selection) return;
      }

      const range = selection.getRangeAt(0);
      range.deleteContents();

      const elementNode = document.createElement('span');
      TeactDOM.render(element, elementNode);
      range.insertNode(elementNode);

      const newRange = document.createRange();
      newRange.setStartAfter(elementNode);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    },
    clearContent() {
      clearContent();
    },
    cleanup() { },
  }));

  useEffect(() => {
    if (!localInputRef.current) return;

    mutationObserverRef.current = new MutationObserver(() => {
      contentChangeNotifier.current.notify();
    });

    mutationObserverRef.current.observe(localInputRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    return () => {
      mutationObserverRef.current?.disconnect();
      contentChangeNotifier.current.clear();
    }
  }, [localInputRef]);

  useEffect(() => {
    onInstanceRef?.(instanceRef);
  }, [instanceRef]);

  const focusInput = useLastCallback(() => {
    if (!localInputRef.current || !canFocus) {
      return;
    }

    if (getIsHeavyAnimating()) {
      setTimeout(focusInput, FOCUS_DELAY_MS);
      return;
    }

    focusEditableElement(localInputRef.current);
  });

  return (
    <div
      {...props}
      ref={localInputRef}
      contentEditable={contentEditable}
      tabIndex={0}
      suppressContentEditableWarning
    />
  );
};

export default RichTextEditor;
