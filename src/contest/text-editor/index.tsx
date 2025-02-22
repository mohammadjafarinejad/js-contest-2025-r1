import { ApiMessageEntity } from "../../api/types";
import React, { FC, RefObject, useEffect, useState } from "../../lib/teact/teact";
import buildClassName from "../../util/buildClassName";
import { MarkdownEditorUtils } from "./TokenHelper";
import { FormattingTypes, MessageInputController } from "./MessageInputController";

export type { FormattingTypes }
export { MessageInputController };
export type MessageInputRefType = RefObject<MessageInputController | null>;

export const MARKDOWN_MARKER_CLASS_NAME = 'markdown-marker';

export function isMarkdownMarker(node: Node) {
  return node instanceof HTMLElement && node.className.includes(MARKDOWN_MARKER_CLASS_NAME);
}

export function handleClickOnNonContentEditable(
  e: React.MouseEvent<HTMLSpanElement, MouseEvent>,
  onClick?: () => void
) {
  e.preventDefault();
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = document.createRange();
  range.setStartAfter(e.currentTarget);
  range.collapse(true);

  selection.removeAllRanges();
  selection.addRange(range);

  onClick?.();
}

export const BlockMarkdownMarkerRenderer: FC<{
  entityType?: ApiMessageEntity['type'];
  className?: string;
  disableRendering?: boolean;
  contentEditable?: boolean;
}> = (props) => {
  return !props.disableRendering && props.entityType
    ? <span className={buildClassName(props.className, MARKDOWN_MARKER_CLASS_NAME, 'show')}
      contentEditable={props.contentEditable} data-markdown-marker={true}
      onClick={props.contentEditable ? undefined : handleClickOnNonContentEditable}>
      {MarkdownEditorUtils.getBlockMarkerByType(props.entityType as any)}
    </span>
    : undefined;
}

export const MarkdownMarkerRenderer = ({
  entityType,
  disableRendering,
  children,
}: {
  entityType?: ApiMessageEntity['type'];
  disableRendering: boolean;
  children: React.ReactNode;
}) => {
  if (disableRendering) return children;
  const marker = entityType ? MarkdownEditorUtils.getInlineMarkerByType(entityType as any) : undefined;
  if (!marker) return children;
  const markerClassName = buildClassName(MARKDOWN_MARKER_CLASS_NAME, 'show');
  return (
    <>
      <span className={markerClassName} data-markdown-marker={true}>{marker}</span>
      {children}
      <span className={markerClassName} data-markdown-marker={true}>{marker}</span>
    </>
  );
};

export const useMessageInputEvent = (ref: MessageInputRefType) => {
  const [isMessageInputChanged, setIsChanged] = useState<boolean>(false);

  useEffect(() => {
    if (!ref.current) return;
    const unsubscribe = ref.current.listen(() => {
      setIsChanged((prev) => !prev);
    });

    return () => {
      unsubscribe?.();
    }
  }, [ref.current]);

  return { isMessageInputChanged };
};
