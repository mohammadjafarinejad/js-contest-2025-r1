import React, {
  type TeactNode,
  useRef,
} from '../../lib/teact/teact';

import { ApiMessageEntityTypes } from '../../api/types';

import buildClassName from '../../util/buildClassName';

import useCollapsibleLines from '../../hooks/element/useCollapsibleLines';
import useLastCallback from '../../hooks/useLastCallback';

import Icon from './icons/Icon';

import styles from './Blockquote.module.scss';
import { Utils } from '../../contest/text-editor/utils';

type OwnProps = {
  collapsed?: boolean;
  isToggleDisabled?: boolean;
  isInEditMode?: boolean;
  children: TeactNode;
};

const MAX_LINES = 4;

export function checkBlockQuoteFirstLast(blockElement: HTMLElement) {
  const gradientContainer = blockElement.querySelector(`.container`);
  return { gradientContainer };
}

export function getBlockQuoteInnerText(node: Node) {
  if (!(node instanceof HTMLElement) || node.dataset.entityType !== ApiMessageEntityTypes.Blockquote) return;

  const childEl = Array.from(node.childNodes).find(child => child instanceof HTMLQuoteElement);
  if (childEl) {
    return {
      text: Utils.getTextContentWithBreaks(childEl, {
        skipMarkdownMarker: false
      })
    };
  }
}

const Blockquote = ({ collapsed, isToggleDisabled, isInEditMode, children }: OwnProps) => {
  // eslint-disable-next-line no-null/no-null
  const ref = useRef<HTMLQuoteElement>(null);
  const isDisabled = isInEditMode ? false : !collapsed;
  const {
    isCollapsed, isCollapsible, setIsCollapsed,
  } = useCollapsibleLines(ref, MAX_LINES, undefined, isDisabled, isInEditMode);
  const canExpand = !isToggleDisabled && isCollapsed;

  const handleExpand = useLastCallback(() => {
    setIsCollapsed(false);
  });

  const handleToggle = useLastCallback(() => {
    setIsCollapsed((prev) => !prev);
  });

  return (
    <span
      className={buildClassName("Blockquote", styles.root, isCollapsed && styles.collapsed,
        isInEditMode && "isInEditMode")}
      onClick={canExpand ? handleExpand : undefined}
      // contentEditable={false}
      data-entity-type={ApiMessageEntityTypes.Blockquote}
      data-collapsed={isCollapsed}
    >
      <blockquote
        className={styles.blockquote}
        ref={ref}
      // data-entity-type={ApiMessageEntityTypes.Blockquote}
      // data-can-collapse={isCollapsed}
      >
        <div className={buildClassName('container', styles.gradientContainer)}
          // contentEditable={isInEditMode}
          >
          {children}
        </div>
        {/* <button className='collapsed-button'>Expand</button> */}
        {isCollapsible && (
          <div
            className={buildClassName(styles.collapseIcon, !isToggleDisabled && styles.clickable)}
            onClick={!isToggleDisabled ? handleToggle : undefined}
            aria-hidden
            contentEditable={false}
          >
            <Icon name={isCollapsed ? 'down' : 'up'} />
          </div>
        )}
      </blockquote>
    </span>
  );
};

export default Blockquote;
