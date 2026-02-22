import * as React from 'react';
import { ToolViewProps } from "./_all";
import { ToolSectionView } from '../../tools/ToolSectionView';
import { MarkdownView } from '@/components/markdown/MarkdownView';
import { knownTools } from '../../tools/knownTools';
import { View, Text, Pressable } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { PlannotatorModal } from '@/plannotator';
import { useSessionMessages } from '@/sync/storage';

/**
 * Extracts plan content from ExitPlanMode tool input, falling back to the
 * most recent long agent text message in the session. Newer Claude Code versions
 * write the plan as text before calling ExitPlanMode with empty input.
 */
function usePlanContent(tool: ToolViewProps['tool'], sessionId?: string): string {
    const { messages } = useSessionMessages(sessionId ?? '');

    return React.useMemo(() => {
        // Try to get plan from tool input (legacy behavior)
        const parsed = knownTools.ExitPlanMode.input.safeParse(tool.input);
        if (parsed.success && parsed.data.plan && parsed.data.plan !== '<empty>') {
            return parsed.data.plan;
        }

        // Fallback: find the most recent substantial agent text before this tool call.
        // Claude writes the plan as text, then calls ExitPlanMode to signal completion.
        const toolCreatedAt = tool.createdAt;
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg.kind === 'agent-text' && !msg.isThinking && msg.createdAt <= toolCreatedAt) {
                // A plan typically has headers or bullet points and is substantial
                if (msg.text.length > 200 && (/^#+\s/m.test(msg.text) || /^[-*]\s/m.test(msg.text))) {
                    return msg.text;
                }
            }
        }

        return '<empty>';
    }, [tool.input, tool.createdAt, messages]);
}

export const ExitPlanToolView = React.memo<ToolViewProps>(({ tool, sessionId }) => {
    const { theme } = useUnistyles();
    const [showReview, setShowReview] = React.useState(false);
    const plan = usePlanContent(tool, sessionId);

    const handleApprove = React.useCallback(() => {
        // The modal handles sending the approval message
    }, []);

    const handleSendFeedback = React.useCallback((feedback: string) => {
        // The modal handles sending the feedback message
    }, []);

    return (
        <ToolSectionView>
            <View style={{ paddingHorizontal: 8, marginTop: -10 }}>
                {/* Review Plan button */}
                <Pressable
                    onPress={() => setShowReview(true)}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        backgroundColor: theme.colors.textLink,
                        marginBottom: 12,
                    }}
                >
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={{ marginLeft: 8, color: '#fff', fontWeight: '600', fontSize: 14 }}>
                        Review Plan with Annotations
                    </Text>
                </Pressable>

                {/* Plan content preview */}
                <MarkdownView markdown={plan} />
            </View>

            {/* Plan Review Modal */}
            {sessionId && (
                <PlannotatorModal
                    visible={showReview}
                    onClose={() => setShowReview(false)}
                    planMarkdown={plan}
                    sessionId={sessionId}
                    onApprove={handleApprove}
                    onSendFeedback={handleSendFeedback}
                />
            )}
        </ToolSectionView>
    );
});
