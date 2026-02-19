import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import WebView from 'react-native-webview';
import { Text } from '@/components/StyledText';
import { Typography } from '@/constants/Typography';
import { useUnistyles, StyleSheet } from 'react-native-unistyles';
import { t } from '@/text';

interface SqliteViewerProps {
    base64Content: string;
    fileName: string;
    sessionId: string;
    onAnnotate?: (data: { table: string; row: number; column: string; value: string }) => void;
}

/**
 * SQLite database viewer using WebView + sql.js (WASM).
 * Displays table list, data browser, SQL query input, and supports cell-level annotations.
 * Pattern: same as MermaidRenderer.tsx and PdfViewer in file.tsx (CDN-loaded libs in WebView).
 */
export const SqliteViewer = React.memo((props: SqliteViewerProps) => {
    const { theme } = useUnistyles();
    const [isLoading, setIsLoading] = React.useState(true);

    const isDark = theme.dark;
    const bg = isDark ? '#1e1e1e' : '#ffffff';
    const fg = isDark ? '#d4d4d4' : '#1e1e1e';
    const headerBg = isDark ? '#2d2d2d' : '#f0f0f0';
    const borderColor = isDark ? '#404040' : '#ddd';
    const accentColor = isDark ? '#569cd6' : '#0066cc';
    const rowHover = isDark ? '#2a2d2e' : '#f5f5f5';
    const zebraColor = isDark ? '#252526' : '#fafafa';

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js"></script>
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
        }
        .toolbar select {
            flex: 1;
            padding: 6px 8px;
            border: 1px solid ${borderColor};
            border-radius: 6px;
            background: ${bg};
            color: ${fg};
            font-size: 14px;
        }
        .toolbar .row-count {
            font-size: 12px;
            color: ${isDark ? '#888' : '#666'};
            white-space: nowrap;
        }
        .sql-bar {
            display: flex;
            padding: 8px 12px;
            background: ${headerBg};
            border-bottom: 1px solid ${borderColor};
            gap: 8px;
            flex-shrink: 0;
        }
        .sql-bar input {
            flex: 1;
            padding: 6px 10px;
            border: 1px solid ${borderColor};
            border-radius: 6px;
            background: ${bg};
            color: ${fg};
            font-size: 13px;
            font-family: 'SF Mono', 'Fira Code', monospace;
        }
        .sql-bar button {
            padding: 6px 14px;
            border: none;
            border-radius: 6px;
            background: ${accentColor};
            color: white;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
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
        .table-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            padding: 8px 12px;
            background: ${headerBg};
            border-bottom: 1px solid ${borderColor};
        }
        .table-chip {
            padding: 4px 10px;
            border-radius: 12px;
            background: ${bg};
            border: 1px solid ${borderColor};
            font-size: 12px;
            cursor: pointer;
        }
        .table-chip.active {
            background: ${accentColor};
            color: white;
            border-color: ${accentColor};
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="loading" id="loader">Loading SQLite database...</div>
    </div>
    <script>
    (async function() {
        try {
            const SQL = await initSqlJs({
                locateFile: f => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/' + f
            });

            // Decode base64 content
            const raw = atob('${props.base64Content}');
            const arr = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);

            const db = new SQL.Database(arr);

            // Get table list
            const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
            const tableNames = tables.length > 0 ? tables[0].values.map(r => r[0]) : [];

            if (tableNames.length === 0) {
                document.getElementById('app').innerHTML = '<div class="error">No tables found in database</div>';
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loaded' }));
                return;
            }

            let currentTable = tableNames[0];
            let sortCol = null;
            let sortAsc = true;
            let currentQuery = '';

            function renderApp() {
                document.getElementById('app').innerHTML = \`
                    <div class="table-list" id="tableList"></div>
                    <div class="sql-bar">
                        <input id="sqlInput" placeholder="SELECT * FROM ..." value="\${currentQuery}" />
                        <button onclick="runQuery()">Run</button>
                    </div>
                    <div class="table-container" id="tableContainer"></div>
                    <div class="status" id="status"></div>
                \`;

                // Render table chips
                const listEl = document.getElementById('tableList');
                tableNames.forEach(name => {
                    const chip = document.createElement('span');
                    chip.className = 'table-chip' + (name === currentTable ? ' active' : '');
                    chip.textContent = name;
                    chip.onclick = () => { currentTable = name; sortCol = null; currentQuery = ''; renderApp(); loadTable(); };
                    listEl.appendChild(chip);
                });

                loadTable();
            }

            function loadTable() {
                const query = currentQuery || \`SELECT * FROM "\${currentTable}" LIMIT 500\`;
                try {
                    const result = db.exec(query);
                    if (result.length === 0) {
                        document.getElementById('tableContainer').innerHTML = '<div class="error">No results</div>';
                        document.getElementById('status').textContent = '0 rows';
                        return;
                    }

                    const cols = result[0].columns;
                    const rows = result[0].values;

                    // Sort if needed
                    let sortedRows = [...rows];
                    if (sortCol !== null) {
                        const idx = cols.indexOf(sortCol);
                        if (idx >= 0) {
                            sortedRows.sort((a, b) => {
                                const va = a[idx], vb = b[idx];
                                if (va == null) return 1;
                                if (vb == null) return -1;
                                if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va;
                                return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
                            });
                        }
                    }

                    let html = '<table><thead><tr>';
                    html += '<th style="width:40px">#</th>';
                    cols.forEach(col => {
                        const arrow = sortCol === col ? (sortAsc ? ' \\u25B2' : ' \\u25BC') : '';
                        html += \`<th onclick="sortBy('\${col}')">\${col}<span class="sort-arrow">\${arrow}</span></th>\`;
                    });
                    html += '</tr></thead><tbody>';

                    sortedRows.forEach((row, ri) => {
                        html += '<tr>';
                        html += \`<td style="color:${isDark ? '#666' : '#999'};font-size:11px">\${ri + 1}</td>\`;
                        row.forEach((val, ci) => {
                            const display = val === null ? '<i style="color:${isDark ? '#666' : '#999'}">NULL</i>' : escapeHtml(String(val));
                            html += \`<td onclick="annotateCell('\${escapeAttr(currentTable)}', \${ri}, '\${escapeAttr(cols[ci])}', '\${escapeAttr(String(val))}')">\${display}</td>\`;
                        });
                        html += '</tr>';
                    });
                    html += '</tbody></table>';

                    document.getElementById('tableContainer').innerHTML = html;
                    document.getElementById('status').textContent = \`\${sortedRows.length} rows \${sortedRows.length >= 500 ? '(limited to 500)' : ''} | \${cols.length} columns | Table: \${currentTable}\`;
                } catch (e) {
                    document.getElementById('tableContainer').innerHTML = '<div class="error">' + escapeHtml(e.message) + '</div>';
                }
            }

            window.sortBy = function(col) {
                if (sortCol === col) sortAsc = !sortAsc;
                else { sortCol = col; sortAsc = true; }
                loadTable();
            };

            window.runQuery = function() {
                currentQuery = document.getElementById('sqlInput').value.trim();
                if (currentQuery) loadTable();
            };

            window.annotateCell = function(table, row, column, value) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'annotate',
                    table: table,
                    row: row,
                    column: column,
                    value: value
                }));
            };

            function escapeHtml(s) {
                return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            }
            function escapeAttr(s) {
                return String(s || '').replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'");
            }

            renderApp();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loaded' }));
        } catch (e) {
            document.getElementById('app').innerHTML = '<div class="error">Failed to load database: ' + e.message + '</div>';
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
                        {t('files.loadingSqlite')}
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
