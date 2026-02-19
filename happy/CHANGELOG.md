# Changelog

## Version 7 - 2026-02-18

This release adds powerful data viewers and improves the new session creation experience with folder browsing.

- Added SQLite database viewer: browse tables, run SQL queries, sort columns, and annotate individual cells
- Added CSV/TSV table viewer: parse and display tabular data with sorting, filtering, row numbers, and cell annotations
- Added tabular annotation system: tap any cell in SQLite or CSV viewers to add comments, exported as formatted markdown for LLM review
- Added folder browser in new session creation: browse remote machine directories with an expandable tree view
- Added configurable root folder for the folder browser (default: home directory, configurable in settings)
- Fixed files screen for non-git repositories: file browsing now works on any project, git features hidden when unavailable
- Fixed native Android build: documented `subst` drive approach for paths with spaces/parentheses

## Version 6 - 2026-02-18

This release brings a major overhaul to the file management and annotation experience, making Happy the ideal companion for reviewing and annotating LLM-generated content.

- Fixed Plannotator clipboard: copy plan button now actually copies content to clipboard using expo-clipboard
- Fixed Plannotator redline toggle: tapping a block in redline mode now properly toggles deletion on/off
- Added annotation export: new "Copy Summary" button generates and copies a diff-style summary of all annotations
- Added global comment support in Plannotator for document-level feedback
- Internationalized all Plannotator UI strings across 9 languages (en, ru, pl, es, ca, it, ja, pt, zh-Hans)
- Redesigned files screen with Browse/Changes tabs - now defaults to file tree when repo is clean
- Added file tree caching with MMKV for instant display on subsequent opens
- Fixed file viewer defaulting to diff mode when no diff is available - now shows file content directly
- Added clickable file paths in chat messages - tap any file path mentioned by the LLM to open it
- Added "Open" button on tool calls that create or modify files
- Added image viewer with pinch-to-zoom support for PNG, JPG, GIF, BMP, and WebP files
- Added PDF viewer with embedded WebView rendering
- Improved SVG handling: SVG files now display as text with syntax highlighting instead of "Cannot display binary file"
- Added share/export button for images and PDFs via system share sheet
- Added copy/cut/paste operations in the file manager for moving files between folders
- Added purple annotation badges on markdown files in the file tree that have Plannotator annotations
- Added search bar in file manager for filtering files by name

## Version 5 - 2025-12-22

This release expands AI agent support and refines the voice experience, while improving markdown rendering for a better chat experience.

- We are working on adding Gemini support using ACP and hopefully fixing codex stability issues using the same approach soon! Stay tuned.
- Removed model configurations from agents. We were not able to keep up with the models so for now we are removing the configuration from the mobile app. You can still configure it through your CLIs, happy will simply use defaults.
- Elevenlabs ... is epxensive. Voice conversations will soon require a subscription after 3 free trials - we'll soon allow connecting your own ElevenLabs agent if you want to manage your own spendings.
- Improved markdown table rendering in chat - no more ASCII pipes `|--|`, actual formatted tables (layout still needs work, but much better!)

## Version 4 - 2025-09-12

This release revolutionizes remote development with Codex integration and Daemon Mode, enabling instant AI assistance from anywhere. Start coding sessions with a single tap while maintaining complete control over your development environment.

- Introduced Codex support for advanced AI-powered code completion and generation capabilities.
- Implemented Daemon Mode as the new default, enabling instant remote session initiation without manual CLI startup.
- Added one-click session launch from mobile devices, automatically connecting to your development machine.
- Added ability to connect anthropic and gpt accounts to account

## Version 3 - 2025-08-29

This update introduces seamless GitHub integration, bringing your developer identity directly into Happy while maintaining our commitment to privacy and security.

- Added GitHub account connection through secure OAuth authentication flow
- Integrated profile synchronization displaying your GitHub avatar, name, and bio
- Implemented encrypted token storage on our backend for additional security protection
- Enhanced settings interface with personalized profile display when connected
- Added one-tap GitHub disconnect functionality with confirmation protection
- Improved account management with clear connection status indicators

## Version 2 - 2025-06-26

This update focuses on seamless device connectivity, visual refinements, and intelligent voice interactions for an enhanced user experience.

- Added QR code authentication for instant and secure device linking across platforms
- Introduced comprehensive dark theme with automatic system preference detection
- Improved voice assistant performance with faster response times and reduced latency
- Added visual indicators for modified files directly in the session list
- Implemented preferred language selection for voice assistant supporting 15+ languages

## Version 1 - 2025-05-12

Welcome to Happy - your secure, encrypted mobile companion for Claude Code. This inaugural release establishes the foundation for private, powerful AI interactions on the go.

- Implemented end-to-end encrypted session management ensuring complete privacy
- Integrated intelligent voice assistant with natural conversation capabilities
- Added experimental file manager with syntax highlighting and tree navigation
- Built seamless real-time synchronization across all your devices
- Established native support for iOS, Android, and responsive web interfaces