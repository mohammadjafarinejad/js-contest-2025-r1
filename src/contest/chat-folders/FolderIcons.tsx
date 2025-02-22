import { ApiChatFolder, ApiMessageEntityCustomEmoji, ApiMessageEntityTypes } from "../../api/types";
import { getGlobal } from "../../global";
import { FoldersState } from "../../hooks/reducers/useFoldersReducer";
import React, { FC } from "../../lib/teact/teact";
import CustomEmoji from "../../components/common/CustomEmoji";

namespace Icons {
  export type OwnProps = {
    fill?: string;
  };

  const defaultFill = 'var(--folder-icon-fill, black)';

  export const Bot: FC<OwnProps> = ({ fill = defaultFill }) => {
    return <svg width="100%" height="100%" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.116 16.8597C21.8886 16.8597 22.5149 16.0768 22.5149 15.1111C22.5149 14.1453 21.8886 13.3625 21.116 13.3625C20.3434 13.3625 19.7171 14.1453 19.7171 15.1111C19.7171 16.0768 20.3434 16.8597 21.116 16.8597Z" fill={fill} />
      <path d="M14.8791 16.8597C15.6517 16.8597 16.278 16.0768 16.278 15.1111C16.278 14.1454 15.6517 13.3625 14.8791 13.3625C14.1065 13.3625 13.4802 14.1454 13.4802 15.1111C13.4802 16.0768 14.1065 16.8597 14.8791 16.8597Z" fill={fill} />
      <path fill-rule="evenodd" clip-rule="evenodd" d="M27.0395 21.2574V15.3174C27.0395 10.3252 22.9925 6.27826 18.0004 6.27826C13.0082 6.27826 8.96124 10.3252 8.96124 15.3174V21.2574C8.96124 24.1502 8.96124 25.5966 9.52422 26.7015C10.0194 27.6734 10.8096 28.4636 11.7815 28.9588C12.8864 29.5217 14.3328 29.5217 17.2256 29.5217H18.7752C21.6679 29.5217 23.1143 29.5217 24.2192 28.9588C25.1911 28.4636 25.9813 27.6734 26.4765 26.7015C27.0395 25.5966 27.0395 24.1502 27.0395 21.2574ZM11.5434 15.3174C11.5434 11.7516 14.4341 8.86088 17.9999 8.86088C21.5658 8.86088 24.4565 11.7516 24.4565 15.3174V16.7772C24.4565 18.2549 23.608 19.6077 22.1748 19.9675C21.0836 20.2414 19.6533 20.4826 17.9999 20.4826C16.3466 20.4826 14.9163 20.2414 13.8251 19.9675C12.3919 19.6077 11.5434 18.2549 11.5434 16.7772V15.3174Z" fill={fill} />
      <path d="M30.2676 16.4C31.096 16.4 31.7676 17.0716 31.7676 17.9V24.3565C31.7676 25.1849 31.096 25.8565 30.2676 25.8565C29.4392 25.8565 28.7676 25.1849 28.7676 24.3565V17.9C28.7676 17.0716 29.4392 16.4 30.2676 16.4Z" fill={fill} />
      <path d="M7.23291 17.9C7.23291 17.0716 6.56134 16.4 5.73291 16.4C4.90448 16.4 4.23291 17.0716 4.23291 17.9V24.3565C4.23291 25.1849 4.90448 25.8565 5.73291 25.8565C6.56134 25.8565 7.23291 25.1849 7.23291 24.3565V17.9Z" fill={fill} />
    </svg>
  }

  export const Channel: FC<OwnProps> = ({ fill = defaultFill }) => {
    return <svg width="100%" height="100%" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.1765 22.708H15.5855C16.0157 22.708 16.2308 22.708 16.4395 22.7306C17.0143 22.7929 17.568 22.9829 18.0601 23.2866C18.2387 23.3969 18.4085 23.5289 18.7481 23.7931L22.3164 26.5684C24.4611 28.2365 25.5335 29.0706 26.4338 29.0629C27.217 29.0562 27.9551 28.6953 28.4412 28.0811C29 27.3751 29 26.0166 29 23.2996V11.7634C29 9.04635 29 7.68782 28.4412 6.98185C27.9551 6.3677 27.217 6.00672 26.4338 6.00005C25.5335 5.99239 24.4611 6.82644 22.3164 8.49455L18.7481 11.2699C18.4085 11.534 18.2387 11.6661 18.0601 11.7763C17.568 12.0801 17.0143 12.27 16.4395 12.3324C16.2308 12.355 16.0157 12.355 15.5855 12.355H12.1765C9.31759 12.355 7 14.6726 7 17.5315C7 20.3904 9.31758 22.708 12.1765 22.708Z" fill={fill} />
      <path d="M12.2982 25.1742C12.1764 25.4348 12.1764 25.7709 12.1764 26.4431V27.8844C12.1764 29.3139 13.3352 30.4727 14.7646 30.4727C16.1941 30.4727 17.3529 29.3139 17.3529 27.8844V26.4431C17.3529 25.7709 17.3529 25.4348 17.231 25.1742C17.1026 24.8995 16.8817 24.6786 16.6069 24.5501C16.3464 24.4283 16.0103 24.4283 15.3381 24.4283H14.1912C13.519 24.4283 13.1829 24.4283 12.9224 24.5501C12.6476 24.6786 12.4267 24.8995 12.2982 25.1742Z" fill={fill} />
    </svg>
  }

  export const Chat: FC<OwnProps> = ({ fill = defaultFill }) => {
    return <svg width="100%" height="100%" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 17.2847C30 11.2598 24.6274 6.37561 18 6.37561C11.3726 6.37561 6 11.2598 6 17.2847C6 20.7209 7.60509 23.5375 10.3363 25.5371C10.6856 25.7929 11.0073 27.2137 10.2288 28.4072C9.45024 29.6006 8.47959 30.146 8.96637 30.3502C9.26647 30.4761 11.0397 30.5384 12.3196 29.8206C14.1496 28.7943 14.6613 27.7725 15.0551 27.8629C15.9973 28.079 16.9839 28.1938 18 28.1938C24.6274 28.1938 30 23.3096 30 17.2847Z" fill={fill} />
    </svg>
  }

  export const Chats: FC<OwnProps> = ({ fill = defaultFill }) => {
    return <svg width="100%" height="100%" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.3902 9.03227C20.3914 7.162 17.595 6 14.5 6C8.42487 6 3.5 10.4772 3.5 16C3.5 19.1499 4.97133 21.7318 7.47498 23.5647C7.79515 23.7991 8.09005 25.1016 7.37638 26.1956C7.08455 26.643 6.76327 26.991 6.51594 27.2589C6.15843 27.6462 5.95542 27.8661 6.21917 27.9767C6.49426 28.0921 8.11974 28.1492 9.29294 27.4912C10.2112 26.9763 10.7674 26.4625 11.1419 26.1166C11.4516 25.8305 11.6371 25.6592 11.8005 25.6967C12.3863 25.831 12.9908 25.9227 13.6098 25.9677C13.6182 25.9683 13.6267 25.9689 13.6351 25.9695C13.9205 25.9897 14.2089 26 14.5 26C20.5751 26 25.5 21.5228 25.5 16C25.5 13.2908 24.3149 10.8332 22.3902 9.03227Z" fill={fill} />
      <path d="M32.5 19C32.5 15.0932 30.0356 11.7097 26.4429 10.0641C26.0059 9.86387 25.6121 10.3758 25.8411 10.7985C26.6828 12.3527 27.16 14.1145 27.16 16C27.16 21.6043 22.944 26.1149 17.4721 27.3341C16.9915 27.4412 16.8851 28.0914 17.3467 28.2627C18.6282 28.738 20.0305 29 21.5 29C22.4314 29 23.3358 28.8948 24.1995 28.6967C24.3629 28.6592 24.5484 28.8305 24.8581 29.1166C25.2326 29.4625 25.7888 29.9763 26.7071 30.4912C27.8803 31.1492 29.5057 31.0921 29.7808 30.9767C30.0446 30.8661 29.8416 30.6462 29.4841 30.2589C29.2367 29.991 28.9155 29.643 28.6236 29.1956C27.91 28.1016 28.2048 26.7991 28.525 26.5647C31.0287 24.7318 32.5 22.1499 32.5 19Z" fill={fill} />
    </svg>
  }

  export const Folder: FC<OwnProps> = ({ fill = defaultFill }) => {
    return <svg width="100%" height="100%" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.21265 9.53789C6 10.1456 6 10.9016 6 12.4135C6 12.6655 6 12.7915 6.03544 12.8928C6.09892 13.0742 6.24156 13.2169 6.42298 13.2803C6.52427 13.3158 6.65026 13.3158 6.90226 13.3158H29.2421C29.3595 13.3158 29.4181 13.3158 29.4672 13.308C29.7375 13.2652 29.9494 13.0533 29.9922 12.783C30 12.7339 30 12.6752 30 12.5579C30 12.0885 30 11.8538 29.9689 11.6574C29.7977 10.5764 28.9499 9.72863 27.8689 9.55742C27.6725 9.52632 27.4378 9.52632 26.9684 9.52632H19.1548C18.9418 9.52632 18.8353 9.52632 18.7327 9.52075C17.8706 9.47396 17.0503 9.13419 16.4077 8.55768C16.3312 8.48907 16.2559 8.41377 16.1053 8.26319C15.9547 8.1126 15.8794 8.03725 15.8029 7.96863C15.1602 7.39213 14.3399 7.05236 13.4778 7.00557C13.3752 7 13.2687 7 13.0557 7H11.4135C9.90159 7 9.14562 7 8.53789 7.21265C7.44937 7.59354 6.59354 8.44937 6.21265 9.53789Z" fill={fill} />
      <path d="M6.20651 16.8766C6 17.282 6 17.8125 6 18.8737V20.3895C6 23.2192 6 24.6341 6.5507 25.7149C7.03512 26.6656 7.80807 27.4386 8.75878 27.923C9.8396 28.4737 11.2545 28.4737 14.0842 28.4737H21.9158C24.7455 28.4737 26.1604 28.4737 27.2412 27.923C28.1919 27.4386 28.9649 26.6656 29.4493 25.7149C30 24.6341 30 23.2192 30 20.3895V18.8737C30 17.8125 30 17.282 29.7935 16.8766C29.6118 16.5201 29.322 16.2303 28.9655 16.0486C28.5602 15.8421 28.0296 15.8421 26.9684 15.8421H9.03158C7.97043 15.8421 7.43985 15.8421 7.03454 16.0486C6.67803 16.2303 6.38817 16.5201 6.20651 16.8766Z" fill={fill} />
    </svg>
  }

  export const Group: FC<OwnProps> = ({ fill = defaultFill }) => {
    return <svg width="100%" height="100%" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.3333 17.3333C16.9107 17.3333 19 15.244 19 12.6667C19 10.0893 16.9107 8 14.3333 8C11.756 8 9.66667 10.0893 9.66667 12.6667C9.66667 15.244 11.756 17.3333 14.3333 17.3333Z" fill={fill} />
      <path d="M5 25.3654C5 26.8204 6.17955 28 7.63461 28H21.0376C22.4901 27.997 23.6667 26.8186 23.6667 25.3654C23.6667 24.5819 23.4961 23.799 23.0277 23.1928C22.9608 23.1062 22.8879 23.0232 22.8084 22.9443C22.4728 22.611 22.0286 22.2323 21.4585 21.8601C21.4277 21.8399 21.3965 21.8198 21.365 21.7998C19.9048 20.8708 17.6512 20 14.3333 20C9.6174 20 7.05162 21.7592 5.85822 22.9443C5.22282 23.5753 5 24.4699 5 25.3654Z" fill={fill} />
      <path d="M25.1023 28H30.823C32.0253 28 33 27.0253 33 25.823C33 25.0652 32.806 24.3089 32.2604 23.7831C31.2358 22.7956 29.037 21.3333 25 21.3333C24.7745 21.3333 24.5548 21.3379 24.3406 21.3467L24.368 21.3738C25.5844 22.5817 25.88 24.1575 25.88 25.3654C25.88 26.3368 25.5943 27.2415 25.1023 28Z" fill={fill} />
      <path d="M25 18.6667C27.2091 18.6667 29 16.8758 29 14.6667C29 12.4575 27.2091 10.6667 25 10.6667C22.7909 10.6667 21 12.4575 21 14.6667C21 16.8758 22.7909 18.6667 25 18.6667Z" fill={fill} />
    </svg>
  }

  export const Star: FC<OwnProps> = ({ fill = defaultFill }) => {
    return <svg width="100%" height="100%" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M16.8151 27.4314C17.4066 27.0754 18.1464 27.0754 18.7379 27.4314L23.2643 30.1558C24.6767 31.0059 26.4164 29.739 26.0409 28.1338L24.8434 23.0146C24.6854 22.3394 24.9152 21.6324 25.4399 21.1792L29.4253 17.7361C30.6744 16.6571 30.0084 14.6069 28.3637 14.4678L23.1107 14.0233C22.4222 13.9651 21.8224 13.5308 21.5521 12.8949L19.4922 8.04816C18.849 6.53473 16.7039 6.53473 16.0607 8.04816L14.0008 12.8949C13.7306 13.5308 13.1307 13.9651 12.4422 14.0233L7.18921 14.4678C5.54451 14.6069 4.8786 16.6571 6.12762 17.7361L10.1131 21.1792C10.6377 21.6324 10.8675 22.3394 10.7096 23.0146L9.51201 28.1338C9.1365 29.739 10.8762 31.0059 12.2887 30.1558L16.8151 27.4314Z" fill={fill} />
    </svg>
  }

  export const User: FC<OwnProps> = ({ fill = defaultFill }) => {
    return <svg width="100%" height="100%" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 16.8125C22.0376 16.8125 24.5 14.3501 24.5 11.3125C24.5 8.27493 22.0376 5.8125 19 5.8125C15.9624 5.8125 13.5 8.27493 13.5 11.3125C13.5 14.3501 15.9624 16.8125 19 16.8125Z" fill={fill} />
      <path d="M8 25.5942C8 27.5787 9.60875 29.1875 11.5933 29.1875H26.4067C28.3912 29.1875 30 27.5787 30 25.5942C30 24.7942 29.8042 23.999 29.2698 23.4036C28.008 21.9978 24.9618 19.5625 19 19.5625C13.0382 19.5625 9.992 21.9978 8.7302 23.4036C8.19579 23.999 8 24.7942 8 25.5942Z" fill={fill} />
    </svg>
  }
}

export namespace FolderIcons {
  export const Groups = {
    Chats: { Emoticon: '💬', Icon: Icons.Chats },
    Chat: { Emoticon: '✅', Icon: Icons.Chat },
    Bot: { Emoticon: '🤖', Icon: Icons.Bot },
    User: { Emoticon: '👤', Icon: Icons.User },
    Group: { Emoticon: '👥', Icon: Icons.Group },
    Star: { Emoticon: '⭐', Icon: Icons.Star },
    Channel: { Emoticon: '📢', Icon: Icons.Channel },
    Folder: { Emoticon: '📁', Icon: Icons.Folder }
  } as const;

  export const AllEmoticons = Object.values(Groups).map(({ Emoticon }) => Emoticon);

  export const getIconByEmoticon = (emoticon: string) =>
    Object.values(Groups).find(item => item.Emoticon === emoticon)?.Icon ?? null;

  export const isSupportedEmoticon = (emoji: string) => !!getIconByEmoticon(emoji);
}

/**
 * ! Removing CustomEmojis from entities ensures that the new emoticon appears,
 */
export function removeCustomIconsFromFolder(folder: FoldersState['folder']) {
  const { title } = folder;

  // Identify entities to remove (CustomEmoji at start or end)
  const entitiesToRemove = title.entities?.filter(
    (e) => e.type === ApiMessageEntityTypes.CustomEmoji && e.offset === 0) || [];

  // Update entities list, keeping only those that shouldn't be removed
  title.entities = title.entities?.filter((e) => !entitiesToRemove.includes(e));

  // Remove characters from text based on the offsets of the removed entities
  const offsetsToRemove = new Set(entitiesToRemove.map((e) => e.offset));

  title.text = [...title.text].filter((_, i) => !offsetsToRemove.has(i)).join("");

  return folder;
}

export function findCustomEmojiAsIcon(entity: ApiChatFolder | FoldersState) {
  // ! Check if folder title contains a single custom emoji at the start.
  // ! For now we use that as folder icon
  if ('mode' in entity) {
    return entity.folder.title.entities?.find((e): e is ApiMessageEntityCustomEmoji =>
      e.type === ApiMessageEntityTypes.CustomEmoji && e.offset === 0);
  }
  else {
    return entity.title.entities?.find((e): e is ApiMessageEntityCustomEmoji =>
      e.type === ApiMessageEntityTypes.CustomEmoji && e.offset === 0);
  }
}

export function getFolderIcon(entity: ApiChatFolder | FoldersState, size: number = 35) {
  const folderId = 'folderId' in entity ? entity.folderId : 'id' in entity ? entity.id : undefined;
  if (folderId === 0) return <FolderIcons.Groups.Chats.Icon />;

  const customEmojiEntity = findCustomEmojiAsIcon(entity);
  const customEmoji = customEmojiEntity && customEmojiEntity.documentId ? getGlobal().customEmojis.byId[customEmojiEntity.documentId] : undefined;
  if (customEmoji) {
    return <CustomEmoji
      documentId={customEmoji.id}
      size={size} />
  }
  else {
    const emoticon = 'emoticon' in entity ? entity.emoticon : 'folder' in entity ? entity.folder.emoticon : undefined;
    if (emoticon) {
      const Icon = FolderIcons.getIconByEmoticon(emoticon);
      if (Icon) return <Icon />;
    }
  }

  return <FolderIcons.Groups.Folder.Icon />;
}
