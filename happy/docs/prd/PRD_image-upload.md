# PRD: Image Upload for Analysis

## Overview

**Feature**: Allow users to upload images from the web/mobile interface for Claude to analyze.

**Priority**: P1 (High value feature)

**Complexity**: Medium

## Problem Statement

Claude Code CLI supports image analysis via the `Read` tool, but users must:
1. Have the image already saved locally
2. Provide the full file path manually

This creates friction when users want Claude to analyze:
- Screenshots of errors
- UI mockups/designs
- Diagrams or architecture drawings
- Photos of physical documents

## Goals

1. Enable drag-and-drop or click-to-upload images
2. Support common image formats (PNG, JPG, GIF, WebP)
3. Pass images to Claude for multimodal analysis
4. Work seamlessly across web and mobile platforms

## User Stories

### US1: Drag & Drop Upload (Web)
**As a** web user,
**I want to** drag an image into the chat input area,
**So that** Claude can analyze it without me saving/typing paths.

**Acceptance Criteria**:
- Drop zone visual indicator when dragging
- Preview thumbnail after drop
- Image sent with next message
- Clear button to remove before sending

### US2: Click to Upload
**As a** user on any platform,
**I want to** click an upload button to select an image,
**So that** I can browse my files/photos.

**Acceptance Criteria**:
- Upload icon/button in input area
- Native file picker opens (filtered to images)
- Preview shown after selection
- Works on web, iOS, Android

### US3: Paste from Clipboard (Web)
**As a** web user,
**I want to** paste an image from clipboard (Ctrl+V),
**So that** I can quickly share screenshots.

**Acceptance Criteria**:
- Detect image data in paste event
- Show preview immediately
- Support PNG screenshots from OS

### US4: Mobile Camera/Gallery
**As a** mobile user,
**I want to** take a photo or select from gallery,
**So that** I can share images easily on mobile.

**Acceptance Criteria**:
- Camera option (where supported)
- Gallery picker option
- Proper permissions handling

## Technical Design

### Architecture Options

#### Option A: Base64 Inline (Recommended for MVP)
```typescript
// Encode image as base64, send inline with message
interface MessageWithImage {
  role: 'user';
  content: [
    { type: 'image', source: { type: 'base64', data: string, media_type: string } },
    { type: 'text', text: string }
  ];
}
```

**Pros**: Simple, no storage needed
**Cons**: Large payloads, no persistence

#### Option B: Temporary File Upload
```typescript
// Upload to temp storage, pass path to Claude
// 1. Upload image → /api/upload → returns tempPath
// 2. Send message referencing path
// 3. Claude uses Read tool on path
```

**Pros**: Smaller messages, reusable
**Cons**: More infrastructure, cleanup needed

### Component Structure

```
ImageUpload/
├── ImageDropZone.tsx       # Drag & drop overlay
├── ImagePicker.tsx         # Button + file input
├── ImagePreview.tsx        # Thumbnail with remove
├── useImageUpload.ts       # Hook for upload logic
└── imageUtils.ts           # Resize, compress, validate
```

### Image Processing

```typescript
interface ImageConstraints {
  maxWidth: 2048;      // Resize if larger
  maxHeight: 2048;
  maxFileSize: 5MB;    // Compress if larger
  allowedFormats: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
}

async function processImage(file: File): Promise<ProcessedImage> {
  // 1. Validate format
  // 2. Resize if needed
  // 3. Compress if needed
  // 4. Convert to base64
  return { base64, mediaType, width, height };
}
```

### Platform-Specific Implementation

| Platform | Upload Method | Camera | Clipboard |
|----------|--------------|--------|-----------|
| Web | `<input type="file">` | Via WebRTC (optional) | `paste` event |
| iOS | expo-image-picker | Yes | No |
| Android | expo-image-picker | Yes | No |

## UI/UX Specifications

### Input Area Changes

```
┌─────────────────────────────────────────────┐
│ [📎] Type your message...            [Send] │
└─────────────────────────────────────────────┘

With image attached:
┌─────────────────────────────────────────────┐
│ ┌──────┐                                    │
│ │ IMG  │ ✕                                  │
│ └──────┘                                    │
│ [📎] Describe this error...          [Send] │
└─────────────────────────────────────────────┘
```

### Drop Zone Overlay (Web)

- Full input area becomes drop target
- Blue dashed border when dragging over
- "Drop image here" text centered
- Subtle animation feedback

### Preview Thumbnail

- 60x60px thumbnail
- Rounded corners
- X button to remove
- Click to view full size (optional)

## Implementation Phases

### Phase 1: Web Basic Upload
- Click-to-upload button
- File picker with image filter
- Base64 encoding
- Preview thumbnail
- Send with message

### Phase 2: Drag & Drop + Clipboard
- Drop zone implementation
- Paste event handling
- Visual feedback during drag

### Phase 3: Mobile Support
- expo-image-picker integration
- Camera access
- Gallery picker
- Platform-specific UI adjustments

### Phase 4: Enhancements
- Multiple images (up to 4?)
- Image compression optimization
- Progress indicator for large files

## Success Metrics

| Metric | Target |
|--------|--------|
| Upload success rate | > 99% |
| Time from drop to preview | < 500ms |
| User adoption | Track usage analytics |

## Security Considerations

- Validate file type (not just extension)
- Limit file size (5MB max)
- Sanitize/strip EXIF data (privacy)
- No server-side storage for base64 approach
- Rate limit uploads if using server storage

## Out of Scope (v1)

- PDF upload (separate feature)
- Video upload
- Image editing/cropping before send
- OCR extraction (Claude handles this)

## Dependencies

- Claude API multimodal support (already exists)
- expo-image-picker (mobile)
- expo-document-picker (fallback)

## Open Questions

1. Maximum number of images per message?
2. Should images persist in conversation history?
3. Compression quality trade-off (size vs quality)?

## Timeline Estimate

- Phase 1: ~2-3 days
- Phase 2: ~1-2 days
- Phase 3: ~2-3 days
- Phase 4: ~1-2 days
- **Total**: ~6-10 days

---

*PRD Version: 1.0*
*Created: 2026-01-24*
*Author: Claude + Julien*
