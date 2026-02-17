import * as React from 'react';
import { ToolViewProps } from "./_all";
import { ToolSectionView } from '../../tools/ToolSectionView';
import { MarkdownView } from '@/components/markdown/MarkdownView';
import { knownTools } from '../../tools/knownTools';
import { View, Text, Pressable } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { Ionicons } from '@expo/vector-icons';
import { PlannotatorModal } from '@/plannotator';

export const ExitPlanToolView = React.memo<ToolViewProps>(({ tool, sessionId }) => {
    const { theme } = useUnistyles();
    const [showReview, setShowReview] = React.useState(false);

    let plan = '<empty>'
    const parsed = knownTools.ExitPlanMode.input.safeParse(tool.input);
    if (parsed.success) {
        plan = parsed.data.plan ?? '<empty>';
    }

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