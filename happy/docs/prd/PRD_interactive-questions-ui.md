# PRD: Interactive Questions UI

## Overview

**Feature**: Transform `AskUserQuestion` tool responses from raw JSON into interactive UI components.

**Priority**: P0 (Critical UX improvement)

**Complexity**: Medium

## Problem Statement

Currently, when Claude Code uses the `AskUserQuestion` tool, the user sees raw JSON output:

```json
{
  "questions": [
    {
      "question": "Which library should we use?",
      "header": "Library",
      "options": [
        {"label": "React Query", "description": "For server state"},
        {"label": "SWR", "description": "Lightweight alternative"}
      ]
    }
  ]
}
```

This is technically functional but provides a poor user experience compared to clickable UI elements.

## Goals

1. Detect `AskUserQuestion` tool calls in Claude's responses
2. Render interactive UI components (buttons/radio) instead of JSON
3. Send selected answer back to Claude seamlessly
4. Support all question types (single-select, multi-select)

## User Stories

### US1: Single-Select Question
**As a** user,
**I want to** see clickable option buttons when Claude asks a question,
**So that** I can respond with one click instead of typing.

**Acceptance Criteria**:
- Options display as distinct clickable buttons
- Only one option can be selected
- Selection is immediately sent to Claude
- "Other" option opens text input field

### US2: Multi-Select Question
**As a** user,
**I want to** select multiple options with checkboxes,
**So that** I can answer questions that allow multiple choices.

**Acceptance Criteria**:
- Options display as checkboxes
- Multiple selections allowed
- "Confirm" button sends all selections
- Clear visual indication of selected items

### US3: Question Header Display
**As a** user,
**I want to** see a clear header/context for each question,
**So that** I understand what I'm being asked.

**Acceptance Criteria**:
- Header displayed prominently above options
- Full question text visible
- Option descriptions shown when available

## Technical Design

### Detection Logic

```typescript
// Detect AskUserQuestion in tool_use content blocks
interface ToolUseBlock {
  type: 'tool_use';
  name: string;
  input: unknown;
}

function isAskUserQuestion(block: ToolUseBlock): boolean {
  return block.name === 'AskUserQuestion';
}
```

### Component Structure

```
QuestionRenderer/
├── QuestionCard.tsx        # Container for question
├── SingleSelectOptions.tsx # Radio-style buttons
├── MultiSelectOptions.tsx  # Checkbox-style options
├── TextInputOption.tsx     # "Other" free-text input
└── SubmitButton.tsx        # Confirm selection
```

### Response Flow

1. Claude sends `AskUserQuestion` tool call
2. Frontend detects and renders interactive UI
3. User clicks option(s)
4. Frontend sends tool result back to API
5. Conversation continues normally

### Data Schema

```typescript
interface AskUserQuestionInput {
  questions: Question[];
}

interface Question {
  question: string;
  header: string;
  options: Option[];
  multiSelect?: boolean;
}

interface Option {
  label: string;
  description?: string;
}

// Response format
interface UserAnswer {
  answers: Record<string, string | string[]>;
}
```

## UI/UX Specifications

### Visual Design

- Question card with subtle border/shadow
- Header as bold text with icon
- Options as pill-shaped buttons (single) or checkboxes (multi)
- Hover states for interactivity feedback
- Selected state with primary color highlight
- "Other" option always last with expandable text field

### Responsive Behavior

- Mobile: Full-width options, stacked vertically
- Tablet/Desktop: Options can wrap horizontally if space permits

### Accessibility

- Keyboard navigation (Tab/Enter/Space)
- Screen reader support with proper ARIA labels
- Focus indicators on all interactive elements

## Implementation Phases

### Phase 1: Basic Single-Select
- Detect AskUserQuestion tool calls
- Render basic button options
- Send selection back to API

### Phase 2: Multi-Select Support
- Add checkbox-style multi-select
- Implement confirm button
- Handle array responses

### Phase 3: Polish & Edge Cases
- "Other" text input option
- Loading states during submission
- Error handling for failed submissions
- Animation/transitions

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to answer question | < 2 seconds (vs ~10s typing) |
| User satisfaction | Qualitative feedback positive |
| Error rate | < 1% failed submissions |

## Out of Scope

- Custom question types beyond Claude's schema
- Persistent question history
- Question analytics/tracking

## Dependencies

- Claude API tool_use format understanding
- Existing message rendering system
- Theme/styling system (Unistyles)

## Open Questions

1. Should we show the raw JSON as a fallback if rendering fails?
2. How to handle very long option lists (>6 options)?
3. Should answers be editable after submission?

## Timeline Estimate

- Phase 1: ~2-3 days
- Phase 2: ~1-2 days
- Phase 3: ~1-2 days
- **Total**: ~5-7 days

---

*PRD Version: 1.0*
*Created: 2026-01-24*
*Author: Claude + Julien*
