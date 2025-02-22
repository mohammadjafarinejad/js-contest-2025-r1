import { useEffect, useState } from '../../../../lib/teact/teact';
import { getActions } from '../../../../global';

import type { ApiDraft, ApiFormattedText, ApiMessage } from '../../../../api/types';
import type { MessageListType, ThreadId } from '../../../../types';
import type { Signal } from '../../../../util/signals';
import { ApiMessageEntityTypes } from '../../../../api/types';

import { EDITABLE_INPUT_CSS_SELECTOR } from '../../../../config';
import { requestMeasure, requestNextMutation } from '../../../../lib/fasterdom/fasterdom';
import { hasMessageMedia } from '../../../../global/helpers';
import focusEditableElement from '../../../../util/focusEditableElement';
import parseHtmlAsFormattedText from '../../../../util/parseHtmlAsFormattedText';
import { getTextWithEntitiesAsHtml } from '../../../common/helpers/renderTextWithEntities';

import { useDebouncedResolver } from '../../../../hooks/useAsyncResolvers';
import useDerivedSignal from '../../../../hooks/useDerivedSignal';
import useEffectWithPrevDeps from '../../../../hooks/useEffectWithPrevDeps';
import useLastCallback from '../../../../hooks/useLastCallback';
import useBackgroundMode from '../../../../hooks/window/useBackgroundMode';
import useBeforeUnload from '../../../../hooks/window/useBeforeUnload';
import { MessageInputRefType, useMessageInputEvent } from '../../../../contest/text-editor';

const URL_ENTITIES = new Set<string>([ApiMessageEntityTypes.TextUrl, ApiMessageEntityTypes.Url]);
const DEBOUNCE_MS = 300;

const useEditing = (
  textEditorRef: MessageInputRefType,
  // getHtml: Signal<string>,
  // setHtml: (html: string) => void,
  editedMessage: ApiMessage | undefined,
  resetComposer: (shouldPreserveInput?: boolean) => void,
  chatId: string,
  threadId: ThreadId,
  type: MessageListType,
  draft?: ApiDraft,
  editingDraft?: ApiFormattedText,
): [VoidFunction, VoidFunction, boolean] => {
  const {
    editMessage, setEditingDraft, toggleMessageWebPage, openDeleteMessageModal,
  } = getActions();
  const [shouldForceShowEditing, setShouldForceShowEditing] = useState(false);
  const {isMessageInputChanged} = useMessageInputEvent(textEditorRef);

  const replyingToId = draft?.replyInfo?.replyToMsgId;

  useEffectWithPrevDeps(([prevEditedMessage, prevReplyingToId]) => {
    if (!editedMessage) {
      return;
    }
    if (!textEditorRef.current) return;

    if (replyingToId && prevReplyingToId !== replyingToId) {
      // setHtml('');
      textEditorRef.current.resetEditor();
      setShouldForceShowEditing(false);
      return;
    }

    if (prevEditedMessage?.id === editedMessage.id && replyingToId === prevReplyingToId) {
      return;
    }

    const text = !prevEditedMessage && editingDraft?.text.length ? editingDraft : editedMessage.content.text;
    // const html = getTextWithEntitiesAsHtml(text);

    // setHtml(html);
    textEditorRef.current.setup(text, { source: "useEditting()" });
    setShouldForceShowEditing(true);

    requestNextMutation(() => {
      const messageInput = document.querySelector<HTMLDivElement>(EDITABLE_INPUT_CSS_SELECTOR);
      if (messageInput) {
        focusEditableElement(messageInput, true);
      }
    });
  }, [editedMessage, replyingToId, editingDraft]);

  useEffect(() => {
    if (!editedMessage) {
      return;
    }

    const shouldSetNoWebPage = !('webPage' in editedMessage.content)
      && editedMessage.content.text?.entities?.some((entity) => URL_ENTITIES.has(entity.type));

    toggleMessageWebPage({
      chatId,
      threadId,
      noWebPage: shouldSetNoWebPage,
    });
  }, [chatId, threadId, editedMessage]);

  useEffect(() => {
    if (!editedMessage) return undefined;
    return () => {
      if (!textEditorRef.current) return;
      const edited = textEditorRef.current.getFormattedText();
      // const edited = parseHtmlAsFormattedText(getHtml());
      const update = edited.text.length ? edited : undefined;

      setEditingDraft({
        chatId, threadId, type, text: update,
      });
    };
  }, [chatId, editedMessage, isMessageInputChanged, setEditingDraft, threadId, type]);

  const detectLinkDebounced = useDebouncedResolver(() => {
    if (!editedMessage) return false;

    if (!textEditorRef.current) return false;
    const edited = textEditorRef.current.getFormattedText();
    // const edited = parseHtmlAsFormattedText(getHtml());
    return !('webPage' in editedMessage.content)
      && editedMessage.content.text?.entities?.some((entity) => URL_ENTITIES.has(entity.type))
      && !(edited.entities?.some((entity) => URL_ENTITIES.has(entity.type)));
  }, [editedMessage, isMessageInputChanged], DEBOUNCE_MS, true);

  const getShouldResetNoWebPageDebounced = useDerivedSignal(detectLinkDebounced, [detectLinkDebounced, isMessageInputChanged], true);

  useEffectWithPrevDeps(([prevEditedMessage]) => {
    if (!editedMessage || prevEditedMessage?.id !== editedMessage.id) {
      return;
    }

    if (getShouldResetNoWebPageDebounced()) {
      toggleMessageWebPage({
        chatId,
        threadId,
        noWebPage: false,
      });
    }
  }, [editedMessage, chatId, isMessageInputChanged, threadId, getShouldResetNoWebPageDebounced]);

  const restoreNewDraftAfterEditing = useLastCallback(() => {
    if (!draft) return;

    // Run one frame after editing draft reset
    requestMeasure(() => {
      // setHtml(getTextWithEntitiesAsHtml(draft.text));
      textEditorRef.current?.setup(draft.text, { source: "useEditting()" });

      // Wait one more frame until new HTML is rendered
      requestNextMutation(() => {
        const messageInput = document.querySelector<HTMLDivElement>(EDITABLE_INPUT_CSS_SELECTOR);
        if (messageInput) {
          focusEditableElement(messageInput, true);
        }
      });
    });
  });

  const handleEditCancel = useLastCallback(() => {
    resetComposer();
    restoreNewDraftAfterEditing();
  });

  const handleEditComplete = useLastCallback(() => {
    // const { text, entities } = parseHtmlAsFormattedText(getHtml());
    if (!textEditorRef.current) return;
    const { text, entities } = textEditorRef.current.getFormattedText();

    if (!editedMessage) {
      return;
    }

    if (!text && !hasMessageMedia(editedMessage)) {
      openDeleteMessageModal({ isSchedule: type === 'scheduled', message: editedMessage });
      return;
    }

    editMessage({
      messageList: { chatId, threadId, type },
      text,
      entities,
    });

    resetComposer();
    restoreNewDraftAfterEditing();
  });

  const handleBlur = useLastCallback(() => {
    if (!editedMessage) return;
    if (!textEditorRef.current) return;
    const edited = textEditorRef.current.getFormattedText();
    // const edited = parseHtmlAsFormattedText(getHtml());
    const update = edited.text.length ? edited : undefined;

    setEditingDraft({
      chatId, threadId, type, text: update,
    });
  });

  useBackgroundMode(handleBlur);
  useBeforeUnload(handleBlur);

  return [handleEditComplete, handleEditCancel, shouldForceShowEditing];
};

export default useEditing;
