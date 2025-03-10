### Task 1 (Rich Text Editor)

- CodeBlock
  - Added real-time syntax highlighting for code content and language changes.
  - `Enter` & `Backspace` behavior.
  - Made minor styling improvements.
- TextFormatter
  - Restyled and reorganized buttons for better usability.
  - Added two new icons.
- BlockQuote
  - Fixed a `GramJS` bug in gramjsBuilders that prevented `BlockQuote` collapse updates.
  - Adjusted `Enter` & `Backspace` behavior (similar to Telegram Windows, with double Enter).
  - Added support for nested entities with real-time markdown syntax.
  - Automatically removes when empty (via Backspace or TextFormatter).
  - Made minor styling tweaks for better UX. (pointer style in expanded mode, ..)
- History System
  - Implemented Undo/Redo functionality.
  - Restoring caret position

- Extra Features & Improvements
  - Added `AUTO_INSERT_CHARS`: Automatically doubles special markdown characters when space is available next to the caret.
  - Pressing `Delete` removes the active block. (CodeBlock | QuoteBlock)
  - Caret positioning remains stable after structural changes.
  - Markdown syntax previews on caret movement (similar to Obsidian).

### Task 2 (Chat Folders)

- When the folder settings tab is open, clicking another folder switches to its settings.
- If folder title `starts` with a custom emoji, it becomes the folder icon, and the emoji is removed from the title text.
- The chat folder is responsive and mobile-friendly.
- The Custom Emoji Picker includes a search input field.
- Supports both light and dark modes.

### Bonus Task (Animated Chat Background)

- Sending a message triggers a background effect.
- Compatible with light and dark modes.

### Text Editor Explanation

- When content changes, the rendered elements are converted to Markdown, AST tokens are generated, if the structure has changed, the elements are converted to `ApiFormattedText`, and a render request is triggered. The editor then updates only the changed content using a diffing process to prevent flickering and maintain the state of BlockLevel components.
- A testing system was built to generate `ApiFormattedText` (randomly or manually) and process it in three steps: initial rendering, markdown tokenization, and re-rendering.
- Test mode can be enabled via `src/contest/contest.tsx` (Contest.IS_TESTING - TestingSystem.try_start()).

# Telegram WebA Markdown Syntaxes

- **Bold**             – Platforms: Markdown, TDesktop, TWeb
- *Italic*             – Platforms: Markdown
- ||Spoiler||          – Platforms: TMarkdown2, TDesktop, TWeb
- __Underline__        – Platforms: (Specify platforms)
- ~~Strikethrough~~    – Platforms: GFM, TDesktop, TWeb
- `Inline code`        – Platforms: Markdown, TMarkdown2, TDesktop, TWeb
- ```Code block```     – Platforms: Markdown, TMarkdown2, TDesktop, TWeb
- > Blockquote         – Platforms: Markdown
