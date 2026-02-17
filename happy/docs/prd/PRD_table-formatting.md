# PRD: Markdown Table Formatting

## Overview

**Feature**: Render markdown tables as styled HTML tables in Claude's responses.

**Priority**: P2 (Quality of life improvement)

**Complexity**: Low

## Problem Statement

When Claude includes tables in responses, they display as raw markdown:

```
| Feature | Complexity | Priority |
|---------|------------|----------|
| Images  | Medium     | P1       |
| Tables  | Low        | P2       |
```

This is readable but:
- Difficult to scan for large tables
- No visual column alignment
- Inconsistent with polished UI

## Goals

1. Detect markdown table syntax in responses
2. Parse and render as proper HTML `<table>` elements
3. Apply consistent styling matching Happy's theme
4. Maintain readability across screen sizes

## User Stories

### US1: Basic Table Rendering
**As a** user,
**I want to** see tables with proper borders and alignment,
**So that** data is easy to read and compare.

**Acceptance Criteria**:
- Markdown tables render as HTML tables
- Column headers visually distinct
- Cell borders/lines visible
- Text properly aligned

### US2: Responsive Tables
**As a** user on mobile,
**I want to** tables to be usable on small screens,
**So that** I don't have broken layouts.

**Acceptance Criteria**:
- Horizontal scroll for wide tables
- Readable font size maintained
- No layout overflow issues

### US3: Theme-Aware Styling
**As a** user,
**I want to** tables to match the app's theme (light/dark),
**So that** they look native to the interface.

**Acceptance Criteria**:
- Background colors from theme
- Border colors appropriate for theme
- Header row uses accent color

## Technical Design

### Markdown Parsing

Option A: **Use existing markdown parser with table extension**
```typescript
// If using react-native-markdown-display or similar
// Enable GFM tables support
<Markdown
  style={markdownStyles}
  rules={{
    table: (node, children) => <StyledTable>{children}</StyledTable>,
    thead: (node, children) => <TableHeader>{children}</TableHeader>,
    tbody: (node, children) => <TableBody>{children}</TableBody>,
    tr: (node, children) => <TableRow>{children}</TableRow>,
    th: (node, children) => <HeaderCell>{children}</HeaderCell>,
    td: (node, children) => <DataCell>{children}</DataCell>,
  }}
/>
```

Option B: **Custom regex-based table detection**
```typescript
const TABLE_REGEX = /\|(.+)\|\n\|[-:| ]+\|\n((?:\|.+\|\n?)+)/g;

function parseMarkdownTable(text: string): Table | null {
  const match = TABLE_REGEX.exec(text);
  if (!match) return null;

  const headers = parseRow(match[1]);
  const rows = match[2].split('\n').filter(Boolean).map(parseRow);

  return { headers, rows };
}
```

### Component Structure

```
TableRenderer/
├── MarkdownTable.tsx    # Main table component
├── TableHeader.tsx      # Header row styling
├── TableRow.tsx         # Data row styling
├── TableCell.tsx        # Individual cell
└── tableStyles.ts       # Unistyles definitions
```

### Styling Approach

```typescript
const styles = StyleSheet.create((theme) => ({
  table: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: theme.margins.sm,
  },
  headerRow: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  headerCell: {
    fontWeight: '600',
    padding: theme.margins.sm,
    color: theme.colors.typography,
  },
  dataRow: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  dataCell: {
    padding: theme.margins.sm,
    color: theme.colors.typographySecondary,
  },
  // Alternating row colors (optional)
  evenRow: {
    backgroundColor: theme.colors.backgroundTertiary,
  },
}));
```

### Responsive Handling

```typescript
// Wrap table in horizontal ScrollView for mobile
const ResponsiveTable = ({ children }) => {
  const { breakpoint } = useStyles();
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';

  if (isMobile) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.tableContainer}>
          {children}
        </View>
      </ScrollView>
    );
  }

  return <View style={styles.tableContainer}>{children}</View>;
};
```

## UI/UX Specifications

### Visual Design

```
┌──────────────────────────────────────────┐
│  Feature    │ Complexity │   Priority   │  ← Header (bold, bg color)
├─────────────┼────────────┼──────────────┤
│  Images     │ Medium     │   P1         │  ← Data rows
│  Tables     │ Low        │   P2         │
│  Questions  │ Medium     │   P0         │
└──────────────────────────────────────────┘
```

### Color Scheme (Example - Light Theme)

| Element | Color |
|---------|-------|
| Header background | `#F5F5F5` |
| Header text | `#1A1A1A` |
| Border | `#E0E0E0` |
| Data text | `#333333` |
| Alternating row | `#FAFAFA` |

### Typography

- Header: Semi-bold, same size as body
- Data: Regular weight
- Minimum font size: 14px
- Cell padding: 8-12px

## Implementation Phases

### Phase 1: Basic Table Parsing & Rendering
- Detect table markdown syntax
- Parse into structured data
- Render basic HTML table
- Apply base styles

### Phase 2: Theme Integration
- Use Unistyles for theming
- Dark mode support
- Proper border colors

### Phase 3: Responsive & Polish
- Horizontal scroll on mobile
- Column width optimization
- Edge case handling (empty cells, long text)

## Success Metrics

| Metric | Target |
|--------|--------|
| Render correctness | 100% of valid tables |
| Performance impact | < 5ms additional parse time |
| User satisfaction | Positive qualitative feedback |

## Edge Cases to Handle

1. **Empty cells**: Render as empty, maintain column structure
2. **Very long cell content**: Wrap text, don't break layout
3. **Single column tables**: Still render properly
4. **Nested markdown in cells**: Support bold, code, links
5. **Alignment syntax** (`|:---|:---:|---:|`): Honor left/center/right

## Out of Scope (v1)

- Sortable columns
- Editable cells
- Export table as CSV
- Table search/filter
- Collapsible large tables

## Dependencies

- Existing markdown rendering solution
- Unistyles theme system
- ScrollView (for responsive)

## Open Questions

1. Should we add copy-table-as-text functionality?
2. Maximum recommended columns before horizontal scroll?
3. Should alternating row colors be optional/configurable?

## Timeline Estimate

- Phase 1: ~1 day
- Phase 2: ~0.5 day
- Phase 3: ~0.5-1 day
- **Total**: ~2-3 days

---

*PRD Version: 1.0*
*Created: 2026-01-24*
*Author: Claude + Julien*
