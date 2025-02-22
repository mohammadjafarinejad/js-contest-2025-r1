import { useEffect, useLayoutEffect, useRef } from '../../../../lib/teact/teact';
import { getActions } from '../../../../global';

import type { ApiDraft, ApiMessage } from '../../../../api/types';
import type { ThreadId } from '../../../../types';
import type { Signal } from '../../../../util/signals';
import { ApiMessageEntityTypes } from '../../../../api/types';

import { DRAFT_DEBOUNCE } from '../../../../config';
import {
  requestMeasure,
} from '../../../../lib/fasterdom/fasterdom';
// import parseHtmlAsFormattedText from '../../../../util/parseHtmlAsFormattedText';
import { getTextWithEntitiesAsHtml } from '../../../common/helpers/renderTextWithEntities';

import useLastCallback from '../../../../hooks/useLastCallback';
import useLayoutEffectWithPrevDeps from '../../../../hooks/useLayoutEffectWithPrevDeps';
import useRunDebounced from '../../../../hooks/useRunDebounced';
import { useStateRef } from '../../../../hooks/useStateRef';
import useBackgroundMode from '../../../../hooks/window/useBackgroundMode';
import useBeforeUnload from '../../../../hooks/window/useBeforeUnload';
import { MessageInputRefType, useMessageInputEvent } from '../../../../contest/text-editor';
import { areFormattedTextsEqual } from '../../../../contest/text-editor/utils';

let isFrozen = false;

function freeze() {
  isFrozen = true;

  requestMeasure(() => {
    isFrozen = false;
  });
}

const useDraft = ({
  draft,
  chatId,
  threadId,
  // getHtml,
  // setHtml,
  messageInputRef: textEditorRef,
  editedMessage,
  isDisabled,
} : {
  draft?: ApiDraft;
  chatId: string;
  threadId: ThreadId;
  // getHtml: Signal<string>;
  // setHtml: (html: string) => void;
  messageInputRef: MessageInputRefType;
  editedMessage?: ApiMessage;
  isDisabled?: boolean;
}) => {
  const { saveDraft, clearDraft, loadCustomEmojis } = getActions();

  const isTouchedRef = useRef(false);
  const {isMessageInputChanged} = useMessageInputEvent(textEditorRef);

  useEffect(() => {
    if (!textEditorRef.current) return;
    // const html = getHtml();
    const isLocalDraft = draft?.isLocal !== undefined;
    // if (getTextWithEntitiesAsHtml(draft?.text) === html && !isLocalDraft) {
    if (areFormattedTextsEqual(draft?.text, textEditorRef.current.getFormattedText()) && !isLocalDraft) {
      isTouchedRef.current = false;
    } else {
      isTouchedRef.current = true;
    }
  }, [draft, isMessageInputChanged]);
  useEffect(() => {
    isTouchedRef.current = false;
  }, [chatId, threadId]);

  const isEditing = Boolean(editedMessage);

  const updateDraft = useLastCallback((prevState: { chatId?: string; threadId?: ThreadId } = {}) => {
    if (!textEditorRef.current) return;
    if (isDisabled || isEditing || !isTouchedRef.current) return;

    // const html = getHtml();
    // const html = textEditorRef.current.getHtml();

    if (textEditorRef.current.isTouched()) {
      // ? running inside requestMeasure() currently cause:
      // ? TypeError: Cannot read properties of undefined teact-dom.ts
      // requestMeasure(() => {
      //   if (!textEditorRef.current) return;
      //   saveDraft({
      //     chatId: prevState.chatId ?? chatId,
      //     threadId: prevState.threadId ?? threadId,
      //     // text: parseHtmlAsFormattedText(html),
      //     text: textEditorRef.current.getFormattedText()
      //   });
      // });
    } else {
      clearDraft({
        chatId: prevState.chatId ?? chatId,
        threadId: prevState.threadId ?? threadId,
        shouldKeepReply: true,
      });
    }
  });

  const runDebouncedForSaveDraft = useRunDebounced(DRAFT_DEBOUNCE, true, undefined, [chatId, threadId]);

  // Restore draft on chat change
  useLayoutEffectWithPrevDeps(([prevChatId, prevThreadId, prevDraft]) => {
    if (!textEditorRef.current) return;
    if (isDisabled) {
      return;
    }
    const isTouched = isTouchedRef.current;

    if (chatId === prevChatId && threadId === prevThreadId) {
      if (isTouched && !draft) return; // Prevent reset from other client if we have local edits
      if (!draft && prevDraft) {
        // setHtml('');
        textEditorRef.current.resetEditor();
      }

      if (isTouched) return;
    }

    if (editedMessage || !draft) {
      return;
    }

    // setHtml(getTextWithEntitiesAsHtml(draft.text));
    if (areFormattedTextsEqual(draft.text, textEditorRef.current.getFormattedText())) return;
    textEditorRef.current.setup(draft.text, { source: "useDraft()" });

    const customEmojiIds = draft.text?.entities
      ?.map((entity) => entity.type === ApiMessageEntityTypes.CustomEmoji && entity.documentId)
      .filter(Boolean) || [];
    if (customEmojiIds.length) loadCustomEmojis({ ids: customEmojiIds });
  }, [chatId, threadId, draft, isMessageInputChanged, editedMessage, isDisabled]);

  // Save draft on chat change. Should be layout effect to read correct html on cleanup
  useLayoutEffect(() => {
    if (isDisabled) {
      return undefined;
    }

    return () => {
      if (!isEditing) {
        updateDraft({ chatId, threadId });
      }

      freeze();
    };
  }, [chatId, threadId, isEditing, updateDraft, isDisabled]);

  const chatIdRef = useStateRef(chatId);
  const threadIdRef = useStateRef(threadId);
  useEffect(() => {
    if (!textEditorRef.current) return;
    if (isDisabled || isFrozen) {
      return;
    }

    if (textEditorRef.current.isHtmlEmpty()) {
      updateDraft();
      return;
    }

    // if (!getHtml()) {
    //   updateDraft();

    //   return;
    // }

    const scopedСhatId = chatIdRef.current;
    const scopedThreadId = threadIdRef.current;

    runDebouncedForSaveDraft(() => {
      if (chatIdRef.current === scopedСhatId && threadIdRef.current === scopedThreadId) {
        updateDraft();
      }
    });
  }, [chatIdRef, isMessageInputChanged, isDisabled, runDebouncedForSaveDraft, threadIdRef, updateDraft]);

  useBackgroundMode(updateDraft);
  useBeforeUnload(updateDraft);
};

export default useDraft;
