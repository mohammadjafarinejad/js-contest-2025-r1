import { MOBILE_SCREEN_MAX_WIDTH } from "../../config";
import useWindowSize from "../../hooks/window/useWindowSize";
import { useEffect } from "../../lib/teact/teact";

// const useMoveElement: FC<{ elementId: string; getTarget: () => HTMLElement | null; dependencies?: any[] }> = ({ elementId, getTarget, dependencies = [] }) => {
//   useEffect(() => {
//     const element = document.getElementById(elementId);
//     if (!element) return;
//     // folders-column
//     const target = getTarget();
//     target?.appendChild(element);
//   }, dependencies);
// };
// useMoveElement("main-button-wrapper", () =>
//   isLeftColumn ? document.getElementById("folders-column") : document.getElementById("LeftMainHeader"),
//   [isLeftColumn]
// );
// useMoveElement("tabListRef", () => {
//   const targetLeftRef = document.getElementById("folders-column");
//   return isMobileW ? document.getElementById("targetTopRef") : targetLeftRef;
// }, [isMobileW, shouldRenderFolders]);

// useEffect(() => {
//     const tabListRef = document.getElementById("tabListRef");
//     if (!tabListRef) return;
//     const targetLeftRef = document.getElementById("left-folder-column");
//     const target = isMobileW ? document.getElementById("targetTopRef") : targetLeftRef;
//     target?.appendChild(tabListRef);
//     if (targetLeftRef) targetLeftRef.hidden = isMobileW;
//     setIsVertical(!isMobileW && shouldRenderFolders);
//   }, [isMobileW, shouldRenderFolders]);

export const useRepositionOnFolderChange = ({ elementId, originId }: {
  elementId: string;
  originId: string;
}) => {
  const { isLeftColumn } = useFolderPosition();

  useEffect(() => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const foldersColumn = document.getElementById("folders-column");
    if (!foldersColumn) return;

    const target = isLeftColumn ? foldersColumn : document.getElementById(originId);
    target?.insertBefore(element, target.firstChild);
  }, [isLeftColumn, elementId, originId]);
};


export const useFolderPosition = () => {
  const { width } = useWindowSize();

  // Determine if the tab should be on the left (vertical) or top (horizontal)
  const isLeftColumn = width > MOBILE_SCREEN_MAX_WIDTH;

  return { isLeftColumn };
};
