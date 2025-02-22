import type { FC, RefObject, TeactNode } from '../../lib/teact/teact';
import React, { memo, useEffect, useRef, useState } from '../../lib/teact/teact';

import type { MenuItemContextAction } from './ListItem';

import animateHorizontalScroll from '../../util/animateHorizontalScroll';
import buildClassName from '../../util/buildClassName';
import { IS_ANDROID, IS_IOS } from '../../util/windowEnvironment';

import useHorizontalScroll from '../../hooks/useHorizontalScroll';
import useOldLang from '../../hooks/useOldLang';
import usePreviousDeprecated from '../../hooks/usePreviousDeprecated';

import Tab from './Tab';

import './TabList.scss';
import useVerticalScroll from '../../hooks/useVerticalScroll';

export type TabWithProperties = {
  id?: number;
  title: TeactNode;
  icon: TeactNode;
  badgeCount?: number;
  isBlocked?: boolean;
  isBadgeActive?: boolean;
  contextActions?: MenuItemContextAction[];
};

type OwnProps = {
  id?: string;
  tabs: readonly TabWithProperties[];
  isVertical?: boolean;
  activeTab: number;
  className?: string;
  tabClassName?: string;
  onSwitchTab: (index: number) => void;
  contextRootElementSelector?: string;
};

const TAB_SCROLL_THRESHOLD_PX = 16;
// Should match duration from `--slide-transition` CSS variable
const SCROLL_DURATION = IS_IOS ? 450 : IS_ANDROID ? 400 : 300;

const TabList: FC<OwnProps> = ({
  id, tabs, isVertical, activeTab, onSwitchTab,
  contextRootElementSelector, className, tabClassName,
}) => {
  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveTab = usePreviousDeprecated(activeTab);

  useHorizontalScroll(containerRef, isVertical, true);
  useVerticalScroll(containerRef, !isVertical, true);

  // Scroll container to place active tab in the center
  useEffect(() => {
    const container = containerRef.current!;
    const { scrollWidth, offsetWidth, scrollLeft } = container;
    if (scrollWidth <= offsetWidth) {
      return;
    }

    const activeTabElement = container.childNodes[activeTab] as HTMLElement | null;
    if (!activeTabElement) {
      return;
    }

    const { offsetLeft: activeTabOffsetLeft, offsetWidth: activeTabOffsetWidth } = activeTabElement;
    const newLeft = activeTabOffsetLeft - (offsetWidth / 2) + (activeTabOffsetWidth / 2);

    // Prevent scrolling by only a couple of pixels, which doesn't look smooth
    if (Math.abs(newLeft - scrollLeft) < TAB_SCROLL_THRESHOLD_PX) {
      return;
    }

    animateHorizontalScroll(container, newLeft, SCROLL_DURATION);
  }, [activeTab]);

  const lang = useOldLang();

  return (
    <div
      id={id}
      className={buildClassName('TabList', isVertical && 'vertical', 'no-scrollbar', className)}
      ref={containerRef}
      dir={lang.isRtl ? 'rtl' : undefined}
    >
      {tabs.map((tab, i) => (
        <Tab
          key={tab.id}
          title={tab.id === 0 && isVertical ? 'All Chats' : tab.title}
          icon={tab.icon}
          isVertical={isVertical}
          isActive={i === activeTab}
          isBlocked={tab.isBlocked}
          badgeCount={tab.badgeCount}
          isBadgeActive={tab.isBadgeActive}
          previousActiveTab={previousActiveTab}
          onClick={onSwitchTab}
          clickArg={i}
          contextActions={tab.contextActions}
          contextRootElementSelector={contextRootElementSelector}
          className={tabClassName}
        />
      ))}
    </div>
  );
};

export default memo(TabList);
