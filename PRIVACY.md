# Privacy

English | [简体中文](PRIVACY.zh-CN.md)

## Data handled by the plugin

- Model-authored build commands contain visible titles, notes, translations, geometry, materials, hierarchy, and rest-rig data.
- Accepted build snapshots are returned as DeepSeek Harness tool-result metadata so the transcript can replay the scene.
- Per-step human thoughts are stored under build-specific `dsh-illusion:step-thoughts:v1:*` keys in the current browser's `localStorage`.
- The interface language is stored under `dsh-illusion:ui-language:v1` in the current browser's `localStorage`.
- The per-session drawing-mode switch is stored under `dsh-illusion:drawing-mode:v1:*` in browser `localStorage`. Toggling it submits a visible mode-on or mode-off instruction to the current DSH session.
- Build JSON and step GLB files are generated locally only when the user selects an export action.
- Review text is sent only after the user selects **Yes, continue**, **Send adjustment**, **Run plan / to target**, or **Finish build**.
- Files selected in the checkpoint review are not read or uploaded until the user selects **Send adjustment**. DSH stores them under a session-scoped upload receipt and includes them in that submitted prompt.
- Pixel-editor drafts are stored in browser `localStorage` as bounded coordinate/color patches. Saving an editor reference creates a PNG and patch JSON locally in memory; neither is uploaded until the user explicitly selects **Send adjustment**. That submission deliberately sends both files to DSH and the configured model provider as the editor's authoritative visual reference.
- Selecting **Branch from this step** asks DSH to create a child session at the checkpoint event and sends the child a build-resume prompt.
- Submitting a review from an older timeline step also creates a child session, then sends a resume prompt together with the selected review action, text, and any deliberately attached files.

## Data not collected by the plugin

The plugin contains no analytics, telemetry, advertising, or tracking pixels, and it makes no direct third-party requests. It does not read the clipboard, arbitrary local files, environment variables, browser cookies, or account credentials. Files are accessible only through the browser picker initiated by the user. It does not attempt to expose or preserve private chain-of-thought.

## Service boundary

DeepSeek Harness and the configured model provider process the conversation, review submissions, selected reference files, and tool calls outside this plugin's control. Their privacy, retention, and network behavior are governed by their own configuration and policies. Anything placed in build titles, notes, translations, review text, attachments, or tool arguments may become part of the DSH transcript or provider request. Do not place secrets in those fields.

2D Style Contracts are ordinary tool and transcript data. Their descriptions, reference labels, visual invariants, and declared rights status may reach the configured model provider. Illusion preserves the supplied rights label but does not verify ownership or grant a license.

Clearing site data removes browser-local thoughts, pixel-editor drafts, and the language preference. Transcript snapshots must be removed through the controls provided by DeepSeek Harness. Exported files remain wherever the user saved them.
