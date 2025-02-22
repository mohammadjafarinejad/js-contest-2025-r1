import type { FC, TeactNode } from '../../../lib/teact/teact';
import React, { memo, useCallback, useEffect, useRef, useState } from '../../../lib/teact/teact';

import { ApiMessageEntityTypes } from '../../../api/types';

import buildClassName from '../../../util/buildClassName';
import { getPrettyCodeLanguageName } from '../../../util/prettyCodeLanguageNames';

import useAsync from '../../../hooks/useAsync';

import CodeOverlay from './CodeOverlay';

import './CodeBlock.scss';
import { BlockMarkdownMarkerRenderer } from '../../../contest/text-editor';
import jsxToHtml from '../../../util/element/jsxToHtml';
import useDidMountEffect from '../../../hooks/useDidMountEffect';
import { Utils } from '../../../contest/text-editor/utils';

export type OwnProps = {
  isInEditMode?: boolean;
  text: string;
  language?: string;
  noCopy?: boolean;
};

const CONSTANTS = {
  CODE_HEADER: 'code-header',
  CODE_CONTENT: 'code-content',
  CODE_FOOTER: 'code-footer'
}

export function checkCodeBlockHeaderFooter(blockElement: HTMLElement, currentNode: Node) {
  const header = blockElement.querySelector(`.${CONSTANTS.CODE_HEADER}`);
  const footer = blockElement.querySelector(`.${CONSTANTS.CODE_FOOTER}`);
  const codeContent = blockElement.querySelector(`.${CONSTANTS.CODE_CONTENT}`);

  const isInHeader = header && header.contains(currentNode);
  const isInFooter = footer && footer.contains(currentNode);
  return { header, footer, isInHeader, isInFooter, codeContent };
}

export function extractCodeBlockData(node: Node) {
  if (!(node instanceof HTMLElement) || node.dataset.entityType !== ApiMessageEntityTypes.Pre) return;

  const codeContent = node.querySelector(`.${CONSTANTS.CODE_CONTENT}`);
  const headerTextContent = node.querySelector(`.${CONSTANTS.CODE_HEADER}`)?.textContent || "";
  const language = node.dataset.language || "";
  return {
    startMarker: headerTextContent.replace(language, ""),
    language,
    codeContent: codeContent ? Utils.getTextContentWithBreaks(codeContent) : "",
    endMarker: node.querySelector(`.${CONSTANTS.CODE_FOOTER}`)?.textContent,
  };
}

const CodeBlock: FC<OwnProps> = ({ isInEditMode, text, language, noCopy }) => {
  const [isWordWrap, setWordWrap] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState(language || '');
  const [codeText, setCodeText] = useState(text);
  const [highlightedLayer, setHighlightedLayer] = useState<TeactNode>('');
  const editableRef = useRef<HTMLPreElement>(null);
  const highlightedRef = useRef<HTMLPreElement>(null);

  const { result: highlighted } = useAsync(() => {
    if (isInEditMode) return Promise.resolve(undefined);
    if (!currentLanguage) return Promise.resolve(undefined);
    return import('../../../util/highlightCode')
      .then((lib) => lib.default(codeText, currentLanguage));
  }, [currentLanguage, codeText, isInEditMode]);

  useEffect(() => {
    if (!isInEditMode) return;
    import('../../../util/highlightCode')
      .then((lib) => lib.default(codeText, currentLanguage))
      .then((result) => {
        const combinedInnerHTML = result
          ? jsxToHtml(<>{result}</>).map(el => el.innerHTML).join('')
          : codeText;
        setHighlightedLayer(combinedInnerHTML);
      });
  }, [currentLanguage, codeText, isInEditMode]);

  // ? When message updates
  useDidMountEffect(() => {
    setCurrentLanguage(language || '');
    setCodeText(text);
  }, [language, text]);

  const handleWordWrapToggle = useCallback((wrap) => {
    setWordWrap(wrap);
  }, []);

  const handleLanguageChange = (event: React.ChangeEvent<HTMLDivElement>) => {
    const textContent = event.currentTarget.textContent || "";
    const match = textContent.match(/^`{1,3}(.+)?/);
    const lang = match?.[1] || "";
    setCurrentLanguage(lang);
  };

  const handleTextChange = (event: React.FormEvent<HTMLPreElement>) => {
    setCodeText(event.currentTarget.innerText || '');
  };

  const blockClass = buildClassName(
    CONSTANTS.CODE_CONTENT,
    'code-block',
    !isWordWrap && 'no-word-wrap',
  );

  const handleScroll = () => {
    if (editableRef.current && highlightedRef.current) {
      highlightedRef.current.scrollTop = editableRef.current.scrollTop;
      highlightedRef.current.scrollLeft = editableRef.current.scrollLeft;
    }
  };

  return (
    <div className={buildClassName("CodeBlock", isInEditMode && "isInEditMode")}
      data-entity-type={ApiMessageEntityTypes.Pre}
      data-language={currentLanguage}
      contentEditable={false}
      ref={(ref) => {
        ref?.setAttribute('spellcheck', 'false');
      }}
    >
      {(isInEditMode || currentLanguage) && (
        <div className={buildClassName(CONSTANTS.CODE_HEADER,
          isInEditMode && currentLanguage === '' ? 'lang-is-empty' : undefined)}
          contentEditable={isInEditMode}
          onChange={handleLanguageChange}>
          <span>
            <BlockMarkdownMarkerRenderer
              entityType={ApiMessageEntityTypes.Pre}
              disableRendering={!isInEditMode}
              contentEditable={false}
            />
          </span>
          {isInEditMode && <span>{language}</span>}
          {!isInEditMode && <p className="code-title">{getPrettyCodeLanguageName(currentLanguage)}</p>}
          {/* {isInEditMode && !currentLanguage && <p className="code-lang-placeholder">enter code lang</p>} */}
        </div>
      )}
      <div className='code-container'>
        {isInEditMode && <pre
          ref={highlightedRef}
          className="code-block highlighted-layer"
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html: highlightedLayer
          }}
        />}
        <pre
          className={blockClass}
          contentEditable={isInEditMode}
          onInput={isInEditMode ? handleTextChange : undefined}
          onScroll={isInEditMode ? handleScroll : undefined}
        >
          {isInEditMode || !highlighted ? text : highlighted}
          {!isInEditMode && <CodeOverlay
            text={codeText}
            className="code-overlay"
            onWordWrapToggle={handleWordWrapToggle}
            noCopy={noCopy}
          />}
        </pre>
      </div>
      {isInEditMode && <div
        className={CONSTANTS.CODE_FOOTER}
        contentEditable={true}>
        <BlockMarkdownMarkerRenderer
          entityType={ApiMessageEntityTypes.Pre}
          contentEditable={false}
        />
      </div>}

    </div>
  );
};

export default memo(CodeBlock);
