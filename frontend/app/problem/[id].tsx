import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { colors, radius } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import Toast from 'react-native-root-toast';

const COMMENT_CHIPS = [
  'I relate because...',
  'One thing I tried...',
  'Have you tried...?',
];

const showToast = (message: string, isError: boolean = false) => {
  Toast.show(message, {
    duration: Toast.durations.SHORT,
    position: Toast.positions.BOTTOM,
    shadow: true,
    animation: true,
    hideOnPress: true,
    backgroundColor: isError ? colors.error : colors.accent,
    textColor: colors.white,
    containerStyle: {
      borderRadius: 8,
      paddingHorizontal: 20,
      paddingVertical: 12,
      marginBottom: 80,
    },
  });
};

export default function ProblemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  
  const [problem, setProblem] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [relatedProblems, setRelatedProblems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (!id) return;
    
    try {
      const [problemData, commentsData, relatedData] = await Promise.all([
        api.getProblem(id),
        api.getComments(id),
        api.getRelatedProblems(id),
      ]);
      setProblem(problemData);
      setComments(commentsData);
      setRelatedProblems(relatedData);
    } catch (error) {
      console.error('Error loading problem:', error);
      Alert.alert('Error', 'Failed to load problem');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Check if current user is the owner
  const isOwner = user && problem && user.id === problem.user_id;

  // Check if any context fields have content
  const hasWhenHappens = problem?.when_happens && problem.when_happens.trim().length > 0;
  const hasWhoAffected = problem?.who_affected && problem.who_affected.trim().length > 0;
  const hasWhatTried = problem?.what_tried && problem.what_tried.trim().length > 0;
  const hasAnyContext = hasWhenHappens || hasWhoAffected || hasWhatTried;

  const handleRelate = async () => {
    if (!problem) return;
    
    try {
      if (problem.user_has_related) {
        await api.unrelateToProblem(problem.id);
        setProblem({ ...problem, user_has_related: false, relates_count: problem.relates_count - 1 });
      } else {
        await api.relateToProblem(problem.id);
        setProblem({ ...problem, user_has_related: true, relates_count: problem.relates_count + 1 });
      }
    } catch (error) {
      console.error('Error toggling relate:', error);
    }
  };

  const handleSave = async () => {
    if (!problem) return;
    
    try {
      if (problem.user_has_saved) {
        await api.unsaveProblem(problem.id);
        setProblem({ ...problem, user_has_saved: false });
      } else {
        await api.saveProblem(problem.id);
        setProblem({ ...problem, user_has_saved: true });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const handleFollow = async () => {
    if (!problem) return;
    
    try {
      if (problem.user_is_following) {
        await api.unfollowProblem(problem.id);
        setProblem({ ...problem, user_is_following: false });
      } else {
        await api.followProblem(problem.id);
        setProblem({ ...problem, user_is_following: true });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleShare = async () => {
    if (!problem) return;
    
    try {
      await Share.share({
        message: `Check out this problem: "${problem.title}" on FRIKT`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleReport = async () => {
    if (!problem) return;
    
    Alert.alert(
      'Report Problem',
      'Are you sure you want to report this problem?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.reportProblem(problem.id);
              Alert.alert('Reported', 'Thank you for your report');
            } catch (error) {
              console.error('Error reporting:', error);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    router.push(`/edit-problem?id=${problem.id}`);
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || commentText.trim().length < 10) {
      Alert.alert('Too Short', 'Comment must be at least 10 characters');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const newComment = await api.createComment(id!, commentText.trim());
      setComments([newComment, ...comments]);
      setCommentText('');
      setProblem({ ...problem, comments_count: problem.comments_count + 1 });
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHelpful = async (commentId: string, isHelpful: boolean) => {
    try {
      if (isHelpful) {
        await api.unmarkHelpful(commentId);
      } else {
        await api.markHelpful(commentId);
      }
      setComments(comments.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            user_marked_helpful: !isHelpful,
            helpful_count: isHelpful ? c.helpful_count - 1 : c.helpful_count + 1,
          };
        }
        return c;
      }));
    } catch (error) {
      console.error('Error toggling helpful:', error);
    }
  };

  const insertChip = (chip: string) => {
    setCommentText(commentText + chip + ' ');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!problem) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Problem</Text>
          <View style={{ width: 32 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Problem not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(problem.created_at), { addSuffix: true });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Problem</Text>
          <View style={styles.headerRight}>
            {isOwner && (
              <TouchableOpacity onPress={handleEdit} style={styles.headerIconButton}>
                <Ionicons name="pencil-outline" size={20} color={colors.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleShare} style={styles.headerIconButton}>
              <Ionicons name="share-outline" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {/* Category and Meta */}
          <View style={styles.metaRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>
                {problem.category_name}
              </Text>
            </View>
            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{problem.title}</Text>

          {/* Signal Summary - Only show fields that have values */}
          <View style={styles.signalSummary}>
            <View style={styles.signalItem}>
              <Text style={styles.signalValue}>{problem.relates_count}</Text>
              <Text style={styles.signalLabel}>Relates</Text>
            </View>
            <View style={styles.signalDivider} />
            <View style={styles.signalItem}>
              <Text style={styles.signalValue}>{problem.comments_count}</Text>
              <Text style={styles.signalLabel}>Comments</Text>
            </View>
            {problem.frequency && (
              <>
                <View style={styles.signalDivider} />
                <View style={styles.signalItem}>
                  <Text style={styles.signalValue}>{problem.frequency}</Text>
                  <Text style={styles.signalLabel}>Frequency</Text>
                </View>
              </>
            )}
            {problem.pain_level && (
              <>
                <View style={styles.signalDivider} />
                <View style={styles.signalItem}>
                  <Text style={styles.signalValue}>{problem.pain_level}/5</Text>
                  <Text style={styles.signalLabel}>Pain</Text>
                </View>
              </>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, problem.user_has_related && styles.actionButtonActive]} 
              onPress={handleRelate}
            >
              <Ionicons 
                name={problem.user_has_related ? 'heart' : 'heart-outline'} 
                size={20} 
                color={problem.user_has_related ? colors.primary : colors.text} 
              />
              <Text style={[styles.actionText, problem.user_has_related && styles.actionTextActive]}>
                Relate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, problem.user_has_saved && styles.actionButtonActive]} 
              onPress={handleSave}
            >
              <Ionicons 
                name={problem.user_has_saved ? 'bookmark' : 'bookmark-outline'} 
                size={20} 
                color={problem.user_has_saved ? colors.primary : colors.text} 
              />
              <Text style={styles.actionText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, problem.user_is_following && styles.actionButtonActive]} 
              onPress={handleFollow}
            >
              <Ionicons 
                name={problem.user_is_following ? 'notifications' : 'notifications-outline'} 
                size={20} 
                color={problem.user_is_following ? colors.warning : colors.text} 
              />
              <Text style={styles.actionText}>Follow</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleReport}>
              <Ionicons name="flag-outline" size={20} color={colors.text} />
              <Text style={styles.actionText}>Report</Text>
            </TouchableOpacity>
          </View>

          {/* Context Section - Only show if has content OR show "Add details" card for owner */}
          {hasAnyContext ? (
            <View style={styles.contextSection}>
              {hasWhenHappens && (
                <>
                  <Text style={styles.contextLabel}>When does this happen?</Text>
                  <View style={styles.contextBox}>
                    <Text style={styles.contextText}>{problem.when_happens}</Text>
                  </View>
                </>
              )}

              {hasWhoAffected && (
                <>
                  <Text style={styles.contextLabel}>Who does it affect?</Text>
                  <View style={styles.contextBox}>
                    <Text style={styles.contextText}>{problem.who_affected}</Text>
                  </View>
                </>
              )}

              {hasWhatTried && (
                <>
                  <Text style={styles.contextLabel}>What have you tried?</Text>
                  <View style={styles.contextBox}>
                    <Text style={styles.contextText}>{problem.what_tried}</Text>
                  </View>
                </>
              )}
            </View>
          ) : isOwner ? (
            <TouchableOpacity style={styles.addDetailsCard} onPress={handleEdit}>
              <View style={styles.addDetailsContent}>
                <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                <View style={styles.addDetailsText}>
                  <Text style={styles.addDetailsTitle}>Add details (optional)</Text>
                  <Text style={styles.addDetailsSubtitle}>Helps others relate faster</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Comments ({problem.comments_count})</Text>

            {/* Comment Input */}
            <View style={styles.commentInputContainer}>
              <View style={styles.chipRow}>
                {COMMENT_CHIPS.map((chip) => (
                  <TouchableOpacity 
                    key={chip} 
                    style={styles.chip}
                    onPress={() => insertChip(chip)}
                  >
                    <Text style={styles.chipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled]}
                onPress={handleAddComment}
                disabled={!commentText.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="send" size={18} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {comments.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons name="chatbubble-outline" size={32} color={colors.textMuted} />
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsHint}>Be the first to share your thoughts</Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {comment.user_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>{comment.user_name}</Text>
                      <Text style={styles.commentTime}>
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                  <TouchableOpacity 
                    style={styles.helpfulButton}
                    onPress={() => handleHelpful(comment.id, comment.user_marked_helpful)}
                  >
                    <Ionicons 
                      name={comment.user_marked_helpful ? 'thumbs-up' : 'thumbs-up-outline'} 
                      size={16} 
                      color={comment.user_marked_helpful ? colors.accent : colors.textMuted} 
                    />
                    <Text style={[
                      styles.helpfulText,
                      comment.user_marked_helpful && styles.helpfulTextActive
                    ]}>
                      Helpful ({comment.helpful_count})
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          {/* Related Problems */}
          {relatedProblems.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>Related Problems</Text>
              {relatedProblems.map((related) => (
                <TouchableOpacity 
                  key={related.id} 
                  style={styles.relatedCard}
                  onPress={() => router.push(`/problem/${related.id}`)}
                >
                  <Text style={styles.relatedTitle} numberOfLines={2}>{related.title}</Text>
                  <View style={styles.relatedStats}>
                    <Ionicons name="heart" size={14} color={colors.primary} />
                    <Text style={styles.relatedStatText}>{related.relates_count}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: colors.softRed,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  timeText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 30,
    marginBottom: 16,
  },
  signalSummary: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 16,
  },
  signalItem: {
    flex: 1,
    alignItems: 'center',
  },
  signalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  signalLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signalDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  actionButtonActive: {
    backgroundColor: colors.softRed,
  },
  actionText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionTextActive: {
    color: colors.primary,
  },
  contextSection: {
    marginBottom: 24,
  },
  contextLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  contextBox: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radius.md,
  },
  contextText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  addDetailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.md,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  addDetailsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addDetailsText: {},
  addDetailsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  addDetailsSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  commentsSection: {
    marginTop: 8,
  },
  commentInputContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    backgroundColor: colors.softRed,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  commentInput: {
    fontSize: 14,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sendButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noCommentsText: {
    fontSize: 15,
    color: colors.text,
    marginTop: 12,
  },
  noCommentsHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  commentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  commentMeta: {
    marginLeft: 10,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  commentTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  commentContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  helpfulText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  helpfulTextActive: {
    color: colors.accent,
  },
  relatedSection: {
    marginTop: 16,
  },
  relatedCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  relatedTitle: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginRight: 12,
  },
  relatedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  relatedStatText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
