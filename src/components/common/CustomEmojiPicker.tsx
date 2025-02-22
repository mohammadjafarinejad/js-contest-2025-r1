import type { FC } from '../../lib/teact/teact';
import React, {
  memo, useEffect, useMemo, useRef,
  useState,
} from '../../lib/teact/teact';
import { getGlobal, withGlobal } from '../../global';

import type {
  ApiAvailableReaction, ApiReaction, ApiReactionWithPaid, ApiSticker, ApiStickerSet,
} from '../../api/types';
import type { StickerSetOrReactionsSetOrRecent } from '../../types';

import {
  FAVORITE_SYMBOL_SET_ID,
  POPULAR_SYMBOL_SET_ID,
  RECENT_SYMBOL_SET_ID,
  SEARCH_SYMBOL_SET_ID,
  SLIDE_TRANSITION_DURATION,
  STICKER_PICKER_MAX_SHARED_COVERS,
  STICKER_SIZE_PICKER_HEADER,
  TOP_SYMBOL_SET_ID,
} from '../../config';
import { isSameReaction } from '../../global/helpers';
import {
  selectCanPlayAnimatedEmojis,
  selectChatFullInfo,
  selectIsAlwaysHighPriorityEmoji,
  selectIsChatWithSelf,
  selectIsCurrentUserPremium,
} from '../../global/selectors';
import animateHorizontalScroll from '../../util/animateHorizontalScroll';
import buildClassName from '../../util/buildClassName';
import { pickTruthy, unique } from '../../util/iteratees';
import { IS_TOUCH_ENV } from '../../util/windowEnvironment';
import { REM } from './helpers/mediaDimensions';

import useAppLayout from '../../hooks/useAppLayout';
import useHorizontalScroll from '../../hooks/useHorizontalScroll';
import useLastCallback from '../../hooks/useLastCallback';
import useOldLang from '../../hooks/useOldLang';
import usePrevDuringAnimation from '../../hooks/usePrevDuringAnimation';
import useScrolledState from '../../hooks/useScrolledState';
import useAsyncRendering from '../right/hooks/useAsyncRendering';
import { useStickerPickerObservers } from './hooks/useStickerPickerObservers';

import StickerSetCover from '../middle/composer/StickerSetCover';
import Button from '../ui/Button';
import Loading from '../ui/Loading';
import Icon from './icons/Icon';
import StickerButton from './StickerButton';
import StickerSet from './StickerSet';

import pickerStyles from '../middle/composer/StickerPicker.module.scss';
import styles from './CustomEmojiPicker.module.scss';
import { renderCategoryButton2, useEmojiData, useEmojiPickerObservers } from '../middle/composer/EmojiPicker';

import { FolderIcons } from '../../contest/chat-folders/FolderIcons';
import EmojiCategory from '../middle/composer/EmojiCategory';
import SearchInput from '../ui/SearchInput';
import './CustomEmojiPicker.scss';

type OwnProps = {
  chatId?: string;
  className?: string;
  pickerListClassName?: string;
  isHidden?: boolean;
  loadAndPlay: boolean;
  idPrefix?: string;
  withDefaultTopicIcons?: boolean;
  selectedReactionIds?: string[];
  isStatusPicker?: boolean;
  isReactionPicker?: boolean;
  isTranslucent?: boolean;
  isFolderIconPicker?: boolean;
  onEmojiSelect?: (emoji: string, name: string) => void;
  onCustomEmojiSelect: (sticker: ApiSticker) => void;
  onReactionSelect?: (reaction: ApiReactionWithPaid) => void;
  onReactionContext?: (reaction: ApiReactionWithPaid) => void;
  onContextMenuOpen?: NoneToVoidFunction;
  onContextMenuClose?: NoneToVoidFunction;
  onContextMenuClick?: NoneToVoidFunction;
};

type StateProps = {
  customEmojisById?: Record<string, ApiSticker>;
  recentCustomEmojiIds?: string[];
  recentStatusEmojis?: ApiSticker[];
  chatEmojiSetId?: string;
  topReactions?: ApiReaction[];
  recentReactions?: ApiReaction[];
  defaultTagReactions?: ApiReaction[];
  stickerSetsById: Record<string, ApiStickerSet>;
  availableReactions?: ApiAvailableReaction[];
  addedCustomEmojiIds?: string[];
  defaultTopicIconsId?: string;
  defaultStatusIconsId?: string;
  customEmojiFeaturedIds?: string[];
  canAnimate?: boolean;
  isSavedMessages?: boolean;
  isCurrentUserPremium?: boolean;
  isWithPaidReaction?: boolean;
};

const HEADER_BUTTON_WIDTH = 2.5 * REM; // px (including margin)

const DEFAULT_ID_PREFIX = 'custom-emoji-set';
const TOP_REACTIONS_COUNT = 16;
const RECENT_REACTIONS_COUNT = 32;
const RECENT_DEFAULT_STATUS_COUNT = 7;
const FADED_BUTTON_SET_IDS = new Set([RECENT_SYMBOL_SET_ID, FAVORITE_SYMBOL_SET_ID, POPULAR_SYMBOL_SET_ID]);
const STICKER_SET_IDS_WITH_COVER = new Set([
  RECENT_SYMBOL_SET_ID,
  FAVORITE_SYMBOL_SET_ID,
  POPULAR_SYMBOL_SET_ID,
]);

const chunkArray = <T,>(array: T[], size: number): T[][] =>
  array.reduce<T[][]>((acc, _, i) => {
    if (i % size === 0) {
      acc.push(array.slice(i, i + size));
    }
    return acc;
  }, []);

const FolderEmoticonSet: FC<{ onEmojiSelect: OwnProps['onEmojiSelect'] }> = ({ onEmojiSelect }) => {
  const MyIcon = (props: { emoticon: string; icon: React.ReactNode }) => {
    return <div className="StickerButton interactive custom-emoji" onClick={() => {
      onEmojiSelect?.(props.emoticon, 'test');
    }}>{props.icon}</div>
  };

  return <div className={'emoticons'}>
    <MyIcon emoticon={FolderIcons.Groups.Chats.Emoticon} icon={<FolderIcons.Groups.Chats.Icon />} />
    <MyIcon emoticon={FolderIcons.Groups.Chat.Emoticon} icon={<FolderIcons.Groups.Chat.Icon />} />
    <MyIcon emoticon={FolderIcons.Groups.User.Emoticon} icon={<FolderIcons.Groups.User.Icon />} />
    <MyIcon emoticon={FolderIcons.Groups.Group.Emoticon} icon={<FolderIcons.Groups.Group.Icon />} />
    <MyIcon emoticon={FolderIcons.Groups.Star.Emoticon} icon={<FolderIcons.Groups.Star.Icon />} />
    <MyIcon emoticon={FolderIcons.Groups.Channel.Emoticon} icon={<FolderIcons.Groups.Channel.Icon />} />
    <MyIcon emoticon={FolderIcons.Groups.Bot.Emoticon} icon={<FolderIcons.Groups.Bot.Icon />} />
    <MyIcon emoticon={FolderIcons.Groups.Folder.Emoticon} icon={<FolderIcons.Groups.Folder.Icon />} />
  </div>
}

function useEmojiSearchQuery() {
  const [query, setQuery] = useState("");
  const emojiData = useEmojiData();

  const isSearch = query.trim().length > 0;
  const isLoading = !emojiData.isLoaded;
  const reset = () => setQuery("");
  const formattedQuery = () => query.trim().toLowerCase();
  const isSearchQueryEmpty = formattedQuery() === '';

  const filteredEmojis = useMemo(() => {
    const searchQuery = formattedQuery();
    if (!searchQuery || !emojiData.emojis || isLoading) return [];

    const matchingEmojis: string[] = [];
    for (const emoji of Object.values(emojiData.emojis)) {
      if ("names" in emoji) {
        if (emoji.names.some((name) => name.includes(searchQuery))) {
          matchingEmojis.push(emoji.native);
        }
      } else {
        for (const skinEmoji of Object.values(emoji)) {
          if (skinEmoji.names.some((name) => name.includes(searchQuery))) {
            matchingEmojis.push(skinEmoji.native);
          }
        }
      }
    }

    return matchingEmojis;
  }, [query, emojiData.emojis, isLoading]);

  return { query, isLoading, setQuery, filteredEmojis, isSearch, reset, formattedQuery, isQueryEmpty: isSearchQueryEmpty };
}


const CustomEmojiPicker: FC<OwnProps & StateProps> = ({
  className,
  pickerListClassName,
  isHidden,
  loadAndPlay,
  addedCustomEmojiIds,
  customEmojisById,
  recentCustomEmojiIds,
  selectedReactionIds,
  recentStatusEmojis,
  stickerSetsById,
  chatEmojiSetId,
  topReactions,
  recentReactions,
  availableReactions,
  idPrefix = DEFAULT_ID_PREFIX,
  customEmojiFeaturedIds,
  canAnimate,
  isReactionPicker,
  isStatusPicker,
  isTranslucent,
  isSavedMessages,
  isCurrentUserPremium,
  withDefaultTopicIcons,
  defaultTopicIconsId,
  defaultStatusIconsId,
  defaultTagReactions,
  isWithPaidReaction,
  isFolderIconPicker,
  onEmojiSelect,
  onCustomEmojiSelect,
  onReactionSelect,
  onReactionContext,
  onContextMenuOpen,
  onContextMenuClose,
  onContextMenuClick,
}) => {
  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const headerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const sharedCanvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line no-null/no-null
  const sharedCanvasHqRef = useRef<HTMLCanvasElement>(null);

  const { isMobile } = useAppLayout();
  const {
    handleScroll: handleContentScroll,
    isAtBeginning: shouldHideTopBorder,
  } = useScrolledState();

  const recentCustomEmojis = useMemo(() => {
    return isStatusPicker
      ? recentStatusEmojis
      : Object.values(pickTruthy(customEmojisById!, recentCustomEmojiIds!));
  }, [customEmojisById, isStatusPicker, recentCustomEmojiIds, recentStatusEmojis]);

  const prefix = `${idPrefix}-custom-emoji`;
  const {
    activeSetIndex,
    observeIntersectionForSet,
    observeIntersectionForPlayingItems,
    observeIntersectionForShowingItems,
    observeIntersectionForCovers,
    selectStickerSet,
  } = useStickerPickerObservers(containerRef, headerRef, prefix, isHidden);

  const { activeCategoryIndex, observeIntersection } = useEmojiPickerObservers(containerRef);
  const emojiData = isFolderIconPicker ? useEmojiData() : { categories: undefined, emojis: undefined, isLoaded: false };
  const searchQuery = useEmojiSearchQuery();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const isSearchingMode = isSearchFocused || searchQuery.isSearch;
  const canLoadAndPlay = usePrevDuringAnimation(loadAndPlay || undefined, SLIDE_TRANSITION_DURATION);

  const lang = useOldLang();

  const areAddedLoaded = Boolean(addedCustomEmojiIds);

  const allSets = useMemo(() => {
    const defaultSets: StickerSetOrReactionsSetOrRecent[] = [];

    if (isReactionPicker && isSavedMessages) {
      if (defaultTagReactions?.length) {
        defaultSets.push({
          id: TOP_SYMBOL_SET_ID,
          accessHash: '',
          title: lang('PremiumPreviewTags'),
          reactions: defaultTagReactions,
          count: defaultTagReactions.length,
          isEmoji: true,
        });
      }
    }

    if (isReactionPicker && !isSavedMessages) {
      const topReactionsSlice: ApiReactionWithPaid[] = topReactions?.slice(0, TOP_REACTIONS_COUNT) || [];
      if (isWithPaidReaction) {
        topReactionsSlice.unshift({ type: 'paid' });
      }
      if (topReactionsSlice?.length) {
        defaultSets.push({
          id: TOP_SYMBOL_SET_ID,
          accessHash: '',
          title: lang('Reactions'),
          reactions: topReactionsSlice,
          count: topReactionsSlice.length,
          isEmoji: true,
        });
      }

      const cleanRecentReactions = (recentReactions || [])
        .filter((reaction) => !topReactionsSlice.some((topReaction) => isSameReaction(topReaction, reaction)))
        .slice(0, RECENT_REACTIONS_COUNT);
      const cleanAvailableReactions = (availableReactions || [])
        .filter(({ isInactive }) => !isInactive)
        .map(({ reaction }) => reaction)
        .filter((reaction) => {
          return !topReactionsSlice.some((topReaction) => isSameReaction(topReaction, reaction))
            && !cleanRecentReactions.some((topReaction) => isSameReaction(topReaction, reaction));
        });
      if (cleanAvailableReactions?.length || cleanRecentReactions?.length) {
        const isPopular = !cleanRecentReactions?.length;
        const allRecentReactions = cleanRecentReactions.concat(cleanAvailableReactions);
        defaultSets.push({
          id: isPopular ? POPULAR_SYMBOL_SET_ID : RECENT_SYMBOL_SET_ID,
          accessHash: '',
          title: lang(isPopular ? 'PopularReactions' : 'RecentStickers'),
          reactions: allRecentReactions,
          count: allRecentReactions.length,
          isEmoji: true,
        });
      }
    } else if (isStatusPicker) {
      const defaultStatusIconsPack = stickerSetsById[defaultStatusIconsId!];
      if (defaultStatusIconsPack?.stickers?.length) {
        const stickers = defaultStatusIconsPack.stickers
          .slice(0, RECENT_DEFAULT_STATUS_COUNT)
          .concat(recentCustomEmojis || []);
        defaultSets.push({
          ...defaultStatusIconsPack,
          stickers,
          count: stickers.length,
          id: RECENT_SYMBOL_SET_ID,
          title: lang('RecentStickers'),
        });
      }
    } else if (withDefaultTopicIcons) {
      const defaultTopicIconsPack = stickerSetsById[defaultTopicIconsId!];
      if (defaultTopicIconsPack.stickers?.length) {
        defaultSets.push({
          ...defaultTopicIconsPack,
          id: RECENT_SYMBOL_SET_ID,
          title: lang('RecentStickers'),
        });
      }
    } else if (recentCustomEmojis?.length) {
      defaultSets.push({
        id: RECENT_SYMBOL_SET_ID,
        accessHash: '0',
        title: lang('RecentStickers'),
        stickers: recentCustomEmojis,
        count: recentCustomEmojis.length,
        isEmoji: true,
      });
    }

    const userSetIds = [...(addedCustomEmojiIds || [])];
    if (chatEmojiSetId) {
      userSetIds.unshift(chatEmojiSetId);
    }

    const setIdsToDisplay = unique(userSetIds.concat(customEmojiFeaturedIds || []));

    const setsToDisplay = Object.values(pickTruthy(stickerSetsById, setIdsToDisplay));

    const allSets = [
      ...defaultSets,
      ...setsToDisplay,
    ];
    if (isFolderIconPicker) {
      let allCategories = [...(emojiData.categories ?? [])];
      let allSets2 = allSets.filter(x => x.id !== RECENT_SYMBOL_SET_ID);

      if (isSearchingMode && !searchQuery.isQueryEmpty) {
        const filteredEmojis = searchQuery.filteredEmojis;
        const searchResult: ApiSticker[] = allSets.flatMap(x => [
          ...('packs' in x ? Object.entries(x.packs ?? {})
            .filter(([key]) => filteredEmojis.includes(key))
            .flatMap(([, value]) => value) : []),
          ...(x.stickers?.filter(s => s.emoji && filteredEmojis.includes(s.emoji)) ?? [])
        ]);

        const getFilteredEmojis = (fe: string[]) => Object.values(emojiData.emojis ?? {}).flatMap(e =>
          typeof e === "object" && !Array.isArray(e)
            ? "native" in e && fe.includes(e.native)
              ? [e.id]
              : Object.values(e).filter(skin => fe.includes(skin.native)).map(skin => skin.id)
            : []
        );

        const CHUNK_SIZE = 48; // ! 8 x 5 for performance we split
        const emojiChunks = chunkArray(getFilteredEmojis(filteredEmojis), CHUNK_SIZE);
        const stickerChunks = chunkArray(searchResult, CHUNK_SIZE);

        allCategories = emojiChunks.map((chunk, index) => ({
          id: `${SEARCH_SYMBOL_SET_ID}_${index}`,
          name: `Search ${index + 1}`,
          emojis: chunk,
        }));

        allSets2 = stickerChunks.map((chunk, index) => ({
          id: `${SEARCH_SYMBOL_SET_ID}_${index}`,
          accessHash: '0',
          title: `Search ${index + 1}`,
          stickers: chunk,
          count: chunk.length,
          isEmoji: true,
        }));
        // allCategories = [{id: SEARCH_SYMBOL_SET_ID, name: 'Search', emojis: getFilteredEmojis(filteredEmojis) }];
        // allSets2 = [{id: SEARCH_SYMBOL_SET_ID, accessHash: '0', title: 'Search', stickers: searchResult, count: searchResult.length, isEmoji: true }];
      }

      return { allCategories, allSets: allSets2 };
    }
    return { allCategories: emojiData.categories ?? [], allSets };
  }, [
    addedCustomEmojiIds, isReactionPicker, isStatusPicker, withDefaultTopicIcons, recentCustomEmojis,
    customEmojiFeaturedIds, stickerSetsById, topReactions, availableReactions, lang, recentReactions,
    defaultStatusIconsId, defaultTopicIconsId, isSavedMessages, defaultTagReactions, chatEmojiSetId,
    isWithPaidReaction, searchQuery.query, emojiData.isLoaded
  ]);

  const noPopulatedSets = useMemo(() => (
    areAddedLoaded
    && allSets?.allSets.filter((set) => set.stickers?.length).length === 0
  ), [allSets, areAddedLoaded]);

  const canRenderContent = useAsyncRendering([], SLIDE_TRANSITION_DURATION);
  let shouldRenderContent = areAddedLoaded && canRenderContent && !noPopulatedSets;
  if (isFolderIconPicker) {
    shouldRenderContent = emojiData.isLoaded;
  }

  useHorizontalScroll(headerRef, isMobile || !shouldRenderContent);

  // Scroll container and header when active set changes
  useEffect(() => {
    if (!areAddedLoaded) {
      return;
    }

    const header = headerRef.current;
    if (!header) {
      return;
    }

    const newLeft = activeSetIndex * HEADER_BUTTON_WIDTH - (header.offsetWidth / 2 - HEADER_BUTTON_WIDTH / 2);

    animateHorizontalScroll(header, newLeft);
  }, [areAddedLoaded, activeSetIndex]);

  const handleCustomEmojiSelect = useLastCallback((emoji: ApiSticker) => {
    onCustomEmojiSelect(emoji);
  });

  const handleEmojiSelect = useLastCallback((emoji: string, name: string) => {
    onEmojiSelect?.(emoji, name);
  });

  function renderCover(stickerSet: StickerSetOrReactionsSetOrRecent, index: number) {
    const firstSticker = stickerSet.stickers?.[0];
    const buttonClassName = buildClassName(
      pickerStyles.stickerCover,
      index === activeSetIndex && styles.activated,
    );

    const withSharedCanvas = index < STICKER_PICKER_MAX_SHARED_COVERS;
    const isHq = selectIsAlwaysHighPriorityEmoji(getGlobal(), stickerSet as ApiStickerSet);

    if (stickerSet.id === TOP_SYMBOL_SET_ID) {
      return undefined;
    }

    if (STICKER_SET_IDS_WITH_COVER.has(stickerSet.id) || stickerSet.hasThumbnail || !firstSticker) {
      const isRecent = stickerSet.id === RECENT_SYMBOL_SET_ID || stickerSet.id === POPULAR_SYMBOL_SET_ID;
      const isFaded = FADED_BUTTON_SET_IDS.has(stickerSet.id);
      return (
        <Button
          key={stickerSet.id}
          className={buttonClassName}
          ariaLabel={stickerSet.title}
          round
          faded={isFaded}
          color="translucent"
          // eslint-disable-next-line react/jsx-no-bind
          onClick={() => selectStickerSet(isRecent ? 0 : index)}
        >
          {isRecent ? (
            <Icon name="recent" />
          ) : (
            <StickerSetCover
              stickerSet={stickerSet as ApiStickerSet}
              noPlay={!canAnimate || !canLoadAndPlay}
              forcePlayback
              observeIntersection={observeIntersectionForCovers}
              sharedCanvasRef={withSharedCanvas ? (isHq ? sharedCanvasHqRef : sharedCanvasRef) : undefined}
            />
          )}
        </Button>
      );
    }

    return (
      <StickerButton
        key={stickerSet.id}
        sticker={firstSticker}
        size={STICKER_SIZE_PICKER_HEADER}
        title={stickerSet.title}
        className={buttonClassName}
        noPlay={!canAnimate || !canLoadAndPlay}
        observeIntersection={observeIntersectionForCovers}
        noContextMenu
        isCurrentUserPremium
        sharedCanvasRef={withSharedCanvas ? (isHq ? sharedCanvasHqRef : sharedCanvasRef) : undefined}
        withTranslucentThumb={isTranslucent}
        onClick={selectStickerSet}
        clickArg={index}
        forcePlayback
      />
    );
  }

  const fullClassName = buildClassName('StickerPicker', styles.root, className);

  if (!shouldRenderContent) {
    return (
      <div className={fullClassName}>
        {noPopulatedSets && !isFolderIconPicker ? (
          <div className={pickerStyles.pickerDisabled}>{lang('NoStickers')}</div>
        ) : (
          <Loading />
        )}
      </div>
    );
  }

  const headerClassName = buildClassName(
    pickerStyles.header,
    'no-scrollbar',
    !shouldHideTopBorder && pickerStyles.headerWithBorder,
    'header',
    isSearchingMode && 'hide'
  );
  const listClassName = buildClassName(
    pickerStyles.main,
    pickerStyles.main_customEmoji,
    IS_TOUCH_ENV ? 'no-scrollbar' : 'custom-scroll',
    pickerListClassName,
    !isSearchFocused && pickerStyles.hasHeader,
  );

  return (
    <div className={fullClassName}>
      <div
        ref={headerRef}
        className={headerClassName}
      >
        <div className={buildClassName('no-scrollbar')}>
          {/* styles.emoji_categories, */}
          {emojiData.isLoaded && emojiData.categories
            && renderCategoryButton2(emojiData.categories[0], 1, activeCategoryIndex)}
          {/* {emojiData.isLoaded && emojiData.categories?.map((c, i) => {
            return renderCategoryButton2(c, i, activeCategoryIndex);
          })} */}
        </div>
        <div className="shared-canvas-container">
          <canvas ref={sharedCanvasRef} className="shared-canvas" />
          <canvas ref={sharedCanvasHqRef} className="shared-canvas" />
          {allSets.allSets.map(renderCover)}
        </div>
      </div>
      <div
        ref={containerRef}
        onScroll={handleContentScroll}
        className={listClassName}
      >
        {isFolderIconPicker && <SearchInput
          className={buildClassName('emoticons_search_input',
            isSearchFocused && 'has-focus',
            !searchQuery.isQueryEmpty && 'has-query'
          )}
          isLoading={!emojiData.isLoaded}
          canClose
          onChange={searchQuery.setQuery}
          onFocus={() => {
            setIsSearchFocused(true);
          }}
          onBlur={() => setIsSearchFocused(false)}
          placeholder='Search Emoji'
        />}
        {!isSearchFocused && isFolderIconPicker && <FolderEmoticonSet onEmojiSelect={handleEmojiSelect} />}
        {allSets.allCategories.map((category, i) => (
          <EmojiCategory
            category={category}
            index={i + 1}
            allEmojis={emojiData.emojis!}
            observeIntersection={observeIntersection}
            shouldRender={activeCategoryIndex >= i - 1 && activeCategoryIndex <= i + 1}
            onEmojiSelect={handleEmojiSelect}
            shouldHideHeader={searchQuery.isQueryEmpty}
          />
        ))}
        {allSets.allSets.map((stickerSet, i) => {
          const shouldHideHeader = isSearchingMode || stickerSet.id === TOP_SYMBOL_SET_ID
            || (stickerSet.id === RECENT_SYMBOL_SET_ID && (withDefaultTopicIcons || isStatusPicker));
          const isChatEmojiSet = stickerSet.id === chatEmojiSetId;

          return (
            <StickerSet
              key={stickerSet.id}
              stickerSet={stickerSet}
              loadAndPlay={Boolean(canAnimate && canLoadAndPlay)}
              index={i}
              idPrefix={prefix}
              observeIntersection={observeIntersectionForSet}
              observeIntersectionForPlayingItems={observeIntersectionForPlayingItems}
              observeIntersectionForShowingItems={observeIntersectionForShowingItems}
              isNearActive={activeSetIndex >= i - 1 && activeSetIndex <= i + 1}
              isSavedMessages={isSavedMessages}
              isStatusPicker={isStatusPicker}
              isReactionPicker={isReactionPicker}
              shouldHideHeader={shouldHideHeader}
              withDefaultTopicIcon={withDefaultTopicIcons && stickerSet.id === RECENT_SYMBOL_SET_ID}
              withDefaultStatusIcon={isStatusPicker && stickerSet.id === RECENT_SYMBOL_SET_ID}
              isChatEmojiSet={isChatEmojiSet}
              isCurrentUserPremium={isCurrentUserPremium}
              selectedReactionIds={selectedReactionIds}
              availableReactions={availableReactions}
              isTranslucent={isTranslucent}
              onReactionSelect={onReactionSelect}
              onReactionContext={onReactionContext}
              onStickerSelect={handleCustomEmojiSelect}
              onContextMenuOpen={onContextMenuOpen}
              onContextMenuClose={onContextMenuClose}
              onContextMenuClick={onContextMenuClick}
              forcePlayback
            />
          );
        })}
      </div>
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, { chatId, isStatusPicker, isReactionPicker }): StateProps => {
    const {
      stickers: {
        setsById: stickerSetsById,
      },
      customEmojis: {
        byId: customEmojisById,
        featuredIds: customEmojiFeaturedIds,
        statusRecent: {
          emojis: recentStatusEmojis,
        },
      },
      recentCustomEmojis: recentCustomEmojiIds,
      reactions: {
        availableReactions,
        recentReactions,
        topReactions,
        defaultTags,
      },
    } = global;

    const isSavedMessages = Boolean(chatId && selectIsChatWithSelf(global, chatId));
    const chatFullInfo = chatId ? selectChatFullInfo(global, chatId) : undefined;

    return {
      customEmojisById: !isStatusPicker ? customEmojisById : undefined,
      recentCustomEmojiIds: !isStatusPicker ? recentCustomEmojiIds : undefined,
      recentStatusEmojis: isStatusPicker ? recentStatusEmojis : undefined,
      stickerSetsById,
      addedCustomEmojiIds: global.customEmojis.added.setIds,
      canAnimate: selectCanPlayAnimatedEmojis(global),
      isSavedMessages,
      isCurrentUserPremium: selectIsCurrentUserPremium(global),
      customEmojiFeaturedIds,
      defaultTopicIconsId: global.defaultTopicIconsId,
      defaultStatusIconsId: global.defaultStatusIconsId,
      topReactions: isReactionPicker ? topReactions : undefined,
      recentReactions: isReactionPicker ? recentReactions : undefined,
      chatEmojiSetId: chatFullInfo?.emojiSet?.id,
      isWithPaidReaction: isReactionPicker && chatFullInfo?.isPaidReactionAvailable,
      availableReactions: isReactionPicker ? availableReactions : undefined,
      defaultTagReactions: isReactionPicker ? defaultTags : undefined,
    };
  },
)(CustomEmojiPicker));
