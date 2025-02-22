import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useEffect, useRef, useState,
} from '../../../lib/teact/teact';

import type { IAnchorPosition } from '../../../types';
import { ApiMessageEntityTypes } from '../../../api/types';

import { EDITABLE_INPUT_ID } from '../../../config';
import buildClassName from '../../../util/buildClassName';
import captureEscKeyListener from '../../../util/captureEscKeyListener';
import { ensureProtocol } from '../../../util/ensureProtocol';
import getKeyFromEvent from '../../../util/getKeyFromEvent';
import stopEvent from '../../../util/stopEvent';
import { INPUT_CUSTOM_EMOJI_SELECTOR } from './helpers/customEmoji';

import useFlag from '../../../hooks/useFlag';
import useLastCallback from '../../../hooks/useLastCallback';
import useOldLang from '../../../hooks/useOldLang';
import useShowTransitionDeprecated from '../../../hooks/useShowTransitionDeprecated';
import useVirtualBackdrop from '../../../hooks/useVirtualBackdrop';

import Icon from '../../common/icons/Icon';
import Button from '../../ui/Button';

import './TextFormatter.scss';
import { TextEditorIcons } from '../../../contest/text-editor/assets/Icon';
import { FormattingTypes, MessageInputRefType, useMessageInputEvent } from '../../../contest/text-editor';

export type OwnProps = {
  messageInputRef: MessageInputRefType;
  isOpen: boolean;
  anchorPosition?: IAnchorPosition;
  selectedRange?: Range;
  // setSelectedRange: (range: Range) => void;
  onClose: () => void;
};

// interface ISelectedTextFormats {
//   bold?: boolean;
//   italic?: boolean;
//   underline?: boolean;
//   strikethrough?: boolean;
//   monospace?: boolean;
//   spoiler?: boolean;
// }

// const TEXT_FORMAT_BY_TAG_NAME: Record<string, keyof ISelectedTextFormats> = {
//   B: 'bold',
//   STRONG: 'bold',
//   I: 'italic',
//   EM: 'italic',
//   U: 'underline',
//   DEL: 'strikethrough',
//   CODE: 'monospace',
//   SPAN: 'spoiler',
// };
const fragmentEl = document.createElement('div');

const TextFormatter: FC<OwnProps> = ({
  messageInputRef,
  isOpen,
  anchorPosition,
  selectedRange,
  // setSelectedRange,
  onClose,
}) => {
  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const linkUrlInputRef = useRef<HTMLInputElement>(null);
  const { shouldRender, transitionClassNames } = useShowTransitionDeprecated(isOpen);
  const [isLinkControlOpen, openLinkControl, closeLinkControl] = useFlag();
  const [linkUrl, setLinkUrl] = useState('');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [inputClassName, setInputClassName] = useState<string | undefined>();
  const [state, setState] = useState<{
    availableFormats: FormattingTypes[];
    activeFormats: FormattingTypes[];
  }>({
    activeFormats: [],
    availableFormats: []
  });
  const {isMessageInputChanged} = useMessageInputEvent(messageInputRef);
  // const [selectedTextFormats, setSelectedTextFormats] = useState<ISelectedTextFormats>({});

  const handleFormat = (type: FormattingTypes) => {
    if (!messageInputRef.current) return;
    messageInputRef.current.applyFormatToSelectedText(type);
  }

  useEffect(() => {
    if (!isOpen || !messageInputRef.current) return;
    setState(messageInputRef.current.getSelectedTextInfo());
  }, [isOpen, isMessageInputChanged]);

  const FormatButton: React.FC<{
    ariaLabel: string;
    formattingType: FormattingTypes;
    children: React.ReactNode;
  }> = ({ ariaLabel, formattingType, children }) => {
    const className = (state.availableFormats.includes(formattingType)
      ? state.activeFormats.includes(formattingType)
        ? 'active'
        : undefined
      : state.activeFormats.includes(formattingType)
        ? 'disabled'
        : undefined);

    return <Button
      color="translucent"
      ariaLabel={ariaLabel}
      className={className}
      onClick={() => handleFormat(formattingType)}
    >
      {children}
    </Button>
  };


  useEffect(() => (isOpen ? captureEscKeyListener(onClose) : undefined), [isOpen, onClose]);
  useVirtualBackdrop(
    isOpen,
    containerRef,
    onClose,
    true,
  );

  useEffect(() => {
    if (isLinkControlOpen) {
      linkUrlInputRef.current!.focus();
    } else {
      setLinkUrl('');
      setIsEditingLink(false);
    }
  }, [isLinkControlOpen]);

  useEffect(() => {
    if (!shouldRender) {
      closeLinkControl();
      // setSelectedTextFormats({});
      setInputClassName(undefined);
    }
  }, [closeLinkControl, shouldRender]);

  // useEffect(() => {
  //   if (!isOpen || !selectedRange) {
  //     return;
  //   }

  //   const selectedFormats: ISelectedTextFormats = {};
  //   let { parentElement } = selectedRange.commonAncestorContainer;
  //   while (parentElement && parentElement.id !== EDITABLE_INPUT_ID) {
  //     const textFormat = TEXT_FORMAT_BY_TAG_NAME[parentElement.tagName];
  //     if (textFormat) {
  //       selectedFormats[textFormat] = true;
  //     }

  //     parentElement = parentElement.parentElement;
  //   }

  //   setSelectedTextFormats(selectedFormats);
  // }, [isOpen, selectedRange, openLinkControl]);

  const restoreSelection = useLastCallback(() => {
    if (!selectedRange) {
      return;
    }

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(selectedRange);
    }
  });

  const getSelectedText = useLastCallback((shouldDropCustomEmoji?: boolean) => {
    if (!selectedRange) {
      return undefined;
    }
    fragmentEl.replaceChildren(selectedRange.cloneContents());
    if (shouldDropCustomEmoji) {
      fragmentEl.querySelectorAll(INPUT_CUSTOM_EMOJI_SELECTOR).forEach((el) => {
        el.replaceWith(el.getAttribute('alt')!);
      });
    }
    return fragmentEl.innerHTML;
  });

  const getSelectedElement = useLastCallback(() => {
    if (!selectedRange) {
      return undefined;
    }

    return selectedRange.commonAncestorContainer.parentElement;
  });

  function updateInputStyles() {
    const input = linkUrlInputRef.current;
    if (!input) {
      return;
    }

    const { offsetWidth, scrollWidth, scrollLeft } = input;
    if (scrollWidth <= offsetWidth) {
      setInputClassName(undefined);
      return;
    }

    let className = '';
    if (scrollLeft < scrollWidth - offsetWidth) {
      className = 'mask-right';
    }
    if (scrollLeft > 0) {
      className += ' mask-left';
    }

    setInputClassName(className);
  }

  function handleLinkUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLinkUrl(e.target.value);
    updateInputStyles();
  }

  const handleLinkUrlConfirm = useLastCallback(() => {
    const formattedLinkUrl = (ensureProtocol(linkUrl) || '').split('%').map(encodeURI).join('%');

    if (isEditingLink) {
      const element = getSelectedElement();
      if (!element || element.tagName !== 'A') {
        return;
      }

      (element as HTMLAnchorElement).href = formattedLinkUrl;

      onClose();

      return;
    }

    const text = getSelectedText(true);
    restoreSelection();
    document.execCommand(
      'insertHTML',
      false,
      `<a href=${formattedLinkUrl} class="text-entity-link" dir="auto">${text}</a>`,
    );
    onClose();
  });

  const handleKeyDown = useLastCallback((e: KeyboardEvent) => {
    const HANDLERS_BY_KEY: Record<string, AnyToVoidFunction> = {
      k: openLinkControl,
      // b: handleBoldText,
      // u: handleUnderlineText,
      // i: handleItalicText,
      // m: handleMonospaceText,
      // s: handleStrikethroughText,
      // p: handleSpoilerText,
      b: () => handleFormat(ApiMessageEntityTypes.Bold),
      u: () => handleFormat(ApiMessageEntityTypes.Underline),
      i: () => handleFormat(ApiMessageEntityTypes.Italic),
      m: () => handleFormat(ApiMessageEntityTypes.Code),
      s: () => handleFormat(ApiMessageEntityTypes.Strike),
      p: () => handleFormat(ApiMessageEntityTypes.Spoiler),
    };

    const handler = HANDLERS_BY_KEY[getKeyFromEvent(e)];

    if (
      e.altKey
      || !(e.ctrlKey || e.metaKey)
      || !handler
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    handler();
  });

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const lang = useOldLang();

  function handleContainerKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && isLinkControlOpen) {
      handleLinkUrlConfirm();
      e.preventDefault();
    }
  }

  if (!shouldRender) {
    return undefined;
  }

  const className = buildClassName(
    'TextFormatter',
    transitionClassNames,
    isLinkControlOpen && 'link-control-shown',
  );

  const linkUrlConfirmClassName = buildClassName(
    'TextFormatter-link-url-confirm',
    Boolean(linkUrl.length) && 'shown',
  );

  const style = anchorPosition
    ? `left: ${anchorPosition.x}px; top: ${anchorPosition.y}px;--text-formatter-left: ${anchorPosition.x}px;`
    : '';

  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      onKeyDown={handleContainerKeyDown}
      // Prevents focus loss when clicking on the toolbar
      onMouseDown={stopEvent}
    >
      <div className="TextFormatter-buttons">
        <FormatButton ariaLabel='Bold text' formattingType={ApiMessageEntityTypes.Bold}>
          <Icon name="bold" />
        </FormatButton>
        <FormatButton ariaLabel='Italic text' formattingType={ApiMessageEntityTypes.Italic}>
          <Icon name="italic" />
        </FormatButton>
        <FormatButton ariaLabel='Underlined text' formattingType={ApiMessageEntityTypes.Underline}>
          <Icon name="underlined" />
        </FormatButton>
        <FormatButton ariaLabel='Strikethrough text' formattingType={ApiMessageEntityTypes.Strike}>
          <Icon name="strikethrough" />
        </FormatButton>
        <div className="TextFormatter-divider" />
        <FormatButton ariaLabel='Spoiler text' formattingType={ApiMessageEntityTypes.Spoiler}>
          <TextEditorIcons.SpoilerIcon fill='var(--icon-fill)' />
        </FormatButton>
        <FormatButton ariaLabel='Monospace text' formattingType={ApiMessageEntityTypes.Code}>
          <Icon name="monospace" />
        </FormatButton>
        <FormatButton ariaLabel='Quote' formattingType={ApiMessageEntityTypes.Blockquote}>
          <TextEditorIcons.QuoteOutlineIcon fill='var(--icon-fill)' />
        </FormatButton>
        <div className="TextFormatter-divider" />
        <Button color="translucent" ariaLabel={lang('TextFormat.AddLinkTitle')} onClick={openLinkControl}>
          <Icon name="link" />
        </Button>
      </div>

      <div className="TextFormatter-link-control">
        <div className="TextFormatter-buttons">
          <Button color="translucent" ariaLabel={lang('Cancel')} onClick={closeLinkControl}>
            <Icon name="arrow-left" />
          </Button>
          <div className="TextFormatter-divider" />

          <div
            className={buildClassName('TextFormatter-link-url-input-wrapper', inputClassName)}
          >
            <input
              ref={linkUrlInputRef}
              className="TextFormatter-link-url-input"
              type="text"
              value={linkUrl}
              placeholder="Enter URL..."
              autoComplete="off"
              inputMode="url"
              dir="auto"
              onChange={handleLinkUrlChange}
              onScroll={updateInputStyles}
            />
          </div>

          <div className={linkUrlConfirmClassName}>
            <div className="TextFormatter-divider" />
            <Button
              color="translucent"
              ariaLabel={lang('Save')}
              className="color-primary"
              onClick={handleLinkUrlConfirm}
            >
              <Icon name="check" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(TextFormatter);
