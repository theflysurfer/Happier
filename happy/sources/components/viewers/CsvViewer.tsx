import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import WebView from 'react-native-webview';
import { Text } from '@/components/StyledText';
import { Typography } from '@/constants/Typography';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { t } from '@/text';

interface CsvViewerProps {
    content: string;
    fileName: string;
    sessionId: string;
    separator?: string;
    onAnnotate?: (data: { row: number; column: string; value: string }) => void;
}

/**
 * CSV/TSV table viewer using WebView with PapaParse (CDN).
 * Renders tabular data with sticky headers, sorting, and cell annotation support.
 * Pattern: same as MermaidRenderer.tsx and SqliteViewer.tsx.
 */
export const CsvViewer = React.memo((props: CsvViewerProps) => {
    const { theme } = useUnistyles();
    const [isLoading, setIsLoading] = React.useState(true);

    const isDark = theme.dark;
    const bg = isDark ? '#1e1e1e' : '#ffffff';
    const fg = isDark ? '#d4d4d4' : '#1e1e1e';
    const headerBg = isDark ? '#2d2d2d' : '#f0f0f0';
    const borderColor = isDark ? '#404040' : '#ddd';
    const rowHover = isDark ? '#2a2d2e' : '#f5f5f5';
    const zebraColor = isDark ? '#252526' : '#fafafa';

    // Detect separator from file extension
    const separator = props.separator || (props.fileName.endsWith('.tsv') ? '\\t' : ',');

    // Escape content for embedding in HTML
    const escapedContent = props.content
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-size: 14px;
            background: ${bg};
            color: ${fg};
            overflow: hidden;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .toolbar {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            background: ${headerBg};
            border-bottom: 1px solid ${borderColor};
            gap: 8px;
            flex-shrink: 0;
            font-size: 13px;
        }
        .toolbar .info { color: ${isDark ? '#888' : '#666'}; }
        .toolbar .filter-input {
            flex: 1;
            padding: 5px 8px;
            border: 1px solid ${borderColor};
            border-radius: 6px;
            background: ${bg};
            color: ${fg};
            font-size: 13px;
        }
        .table-container {
            flex: 1;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        thead { position: sticky; top: 0; z-index: 1; }
        th {
            background: ${headerBg};
            padding: 8px 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid ${borderColor};
            white-space: nowrap;
            cursor: pointer;
            user-select: none;
        }
        th:hover { background: ${isDark ? '#3a3a3a' : '#e0e0e0'}; }
        th .sort-arrow { margin-left: 4px; font-size: 10px; }
        td {
            padding: 6px 12px;
            border-bottom: 1px solid ${borderColor};
            max-width: 300px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        tr:nth-child(even) { background: ${zebraColor}; }
        tr:hover { background: ${rowHover}; }
        td.annotated {
            background: ${isDark ? '#3b3000' : '#fff8e1'} !important;
            border-left: 3px solid #ff9800;
        }
        .error {
            padding: 16px;
            color: #ff4444;
            text-align: center;
        }
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            color: ${isDark ? '#888' : '#666'};
        }
        .status {
            padding: 8px 12px;
            background: ${headerBg};
            border-top: 1px solid ${borderColor};
            font-size: 12px;
            color: ${isDark ? '#888' : '#666'};
            flex-shrink: 0;
        }
    </style>
</head>
<body>
    <div id="app"><div class="loading">Parsing CSV...</div></div>
    <script>
    (function() {
        try {
            const csvText = \`${escapedContent}\`;
            const result = Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                delimiter: '${separator}' === '\\t' ? '\\t' : '${separator}',
                dynamicTyping: true
            });

            if (result.errors.length > 0 && result.data.length === 0) {
                document.getElementById('app').innerHTML = '<div class="error">Parse error: ' + result.errors[0].message + '</div>';
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loaded' }));
                return;
            }

            const headers = result.meta.fields || [];
            const rows = result.data;
            let sortCol = null;
            let sortAsc = true;
            let filterText = '';

            function render() {
                document.getElementById('app').innerHTML = \`
                    <div class="toolbar">
                        <span class="info">\${rows.length} rows | \${headers.length} cols</span>
                        <input class="filter-input" id="filterInput" placeholder="Filter rows..." value="\${filterText}" oninput="filterRows(this.value)" />
                    </div>
                    <div class="table-container" id="tableContainer"></div>
                    <div class="status" id="status"></div>
                \`;
                renderTable();
            }

            function renderTable() {
                let filtered = rows;
                if (filterText) {
                    const q = filterText.toLowerCase();
                    filtered = rows.filter(row => headers.some(h => String(row[h] ?? '').toLowerCase().includes(q)));
                }

                // Sort
                let sorted = [...filtered];
                if (sortCol !== null) {
                    sorted.sort((a, b) => {
                        const va = a[sortCol], vb = b[sortCol];
                        if (va == null) return 1;
                        if (vb == null) return -1;
                        if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va;
                        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
                    });
                }

                let html = '<table><thead><tr>';
                html += '<th style="width:40px">#</th>';
                headers.forEach(h => {
                    const arrow = sortCol === h ? (sortAsc ? ' \\u25B2' : ' \\u25BC') : '';
                    html += '<th onclick="sortBy(\\'' + escapeAttr(h) + '\\')">' + escapeHtml(h) + '<span class="sort-arrow">' + arrow + '</span></th>';
                });
                html += '</tr></thead><tbody>';

                const limit = Math.min(sorted.length, 1000);
                for (let i = 0; i < limit; i++) {
                    const row = sorted[i];
                    html += '<tr>';
                    html += '<td style="color:${isDark ? '#666' : '#999'};font-size:11px">' + (i + 1) + '</td>';
                    headers.forEach(h => {
                        const val = row[h];
                        const display = val === null || val === undefined ? '<i style="color:${isDark ? '#666' : '#999'}">-</i>' : escapeHtml(String(val));
                        html += '<td onclick="annotateCell(' + i + ',\\'' + escapeAttr(h) + '\\',\\'' + escapeAttr(String(val ?? '')) + '\\')">' + display + '</td>';
                    });
                    html += '</tr>';
                }
                html += '</tbody></table>';

                document.getElementById('tableContainer').innerHTML = html;
                document.getElementById('status').textContent = sorted.length + ' rows' + (sorted.length >= 1000 ? ' (showing first 1000)' : '') + (filterText ? ' (filtered)' : '');
            }

            window.sortBy = function(col) {
                if (sortCol === col) sortAsc = !sortAsc;
                else { sortCol = col; sortAsc = true; }
                renderTable();
            };

            window.filterRows = function(text) {
                filterText = text;
                renderTable();
            };

            window.annotateCell = function(row, column, value) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'annotate',
                    row: row,
                    column: column,
                    value: value
                }));
            };

            function escapeHtml(s) {
                return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            }
            function escapeAttr(s) {
                return String(s || '').replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'");
            }

            render();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loaded' }));
        } catch (e) {
            document.getElementById('app').innerHTML = '<div class="error">Failed to parse CSV: ' + e.message + '</div>';
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: e.message }));
        }
    })();
    </script>
</body>
</html>`;

    const handleMessage = React.useCallback((event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'loaded') {
                setIsLoading(false);
            } else if (data.type === 'annotate' && props.onAnnotate) {
                props.onAnnotate(data);
            }
        } catch {
            // ignore parse errors
        }
    }, [props.onAnnotate]);

    return (
        <View style={styles.container}>
            {isLoading && (
                <View style={[styles.loader, { backgroundColor: theme.colors.surface }]}>
                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                    <Text style={{ color: theme.colors.textSecondary, marginTop: 12, ...Typography.default() }}>
                        {t('files.loadingCsv')}
                    </Text>
                </View>
            )}
            <WebView
                source={{ html }}
                style={{ flex: 1, opacity: isLoading ? 0 : 1 }}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                onMessage={handleMessage}
            />
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    loader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
}));
