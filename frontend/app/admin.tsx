import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'overview' | 'feedback' | 'reports' | 'users' | 'audit';

export default function AdminPanel() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Analytics data
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Feedback data
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbackFilter, setFeedbackFilter] = useState('all');
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);
  
  // Reports data
  const [reports, setReports] = useState<any[]>([]);
  const [reportFilter, setReportFilter] = useState('pending');
  
  // Users data
  const [users, setUsers] = useState<any[]>([]);
  const [userFilter, setUserFilter] = useState('all');
  
  // Audit data
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(tabs)/home');
      return;
    }
    loadData();
  }, [isAdmin, activeTab]);

  const loadData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      switch (activeTab) {
        case 'overview':
          const analyticsData = await api.getAdminAnalytics();
          setAnalytics(analyticsData);
          // Also load unread feedback count for the badge
          try {
            const feedbackData = await api.getAdminFeedback('false');
            setUnreadFeedbackCount(feedbackData.unread_count || 0);
          } catch (e) {}
          break;
        case 'feedback':
          const isReadParam = feedbackFilter === 'all' ? undefined : feedbackFilter === 'unread' ? 'false' : 'true';
          const feedbackResult = await api.getAdminFeedback(isReadParam);
          setFeedbacks(feedbackResult.feedbacks || []);
          setUnreadFeedbackCount(feedbackResult.unread_count || 0);
          break;
        case 'reports':
          const reportsData = await api.getAdminReports(reportFilter);
          setReports(reportsData.reports || []);
          break;
        case 'users':
          const status = userFilter === 'all' ? undefined : userFilter;
          const usersData = await api.getAdminUsers(status);
          setUsers(usersData.users || []);
          break;
        case 'audit':
          const auditData = await api.getAuditLog();
          setAuditLogs(auditData.logs || []);
          break;
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'feedback') loadData();
  }, [feedbackFilter]);

  useEffect(() => {
    if (activeTab === 'reports') loadData();
  }, [reportFilter]);

  useEffect(() => {
    if (activeTab === 'users') loadData();
  }, [userFilter]);

  const handleDismissReport = async (reportId: string) => {
    try {
      await api.dismissReport(reportId);
      setReports(reports.filter(r => r.id !== reportId));
      Alert.alert('Success', 'Report dismissed');
    } catch (error) {
      Alert.alert('Error', 'Failed to dismiss report');
    }
  };

  const handleHideContent = async (report: any) => {
    try {
      if (report.target_type === 'problem') {
        await api.hideProblem(report.target_id);
      } else {
        await api.hideComment(report.target_id);
      }
      await api.markReportReviewed(report.id);
      setReports(reports.filter(r => r.id !== report.id));
      Alert.alert('Success', 'Content hidden');
    } catch (error) {
      Alert.alert('Error', 'Failed to hide content');
    }
  };

  const handleBanUser = async (userId: string, userName: string) => {
    Alert.alert(
      'Ban User',
      `Are you sure you want to ban ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.banUser(userId);
              loadData();
              Alert.alert('Success', 'User banned');
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to ban user');
            }
          }
        }
      ]
    );
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      await api.unbanUser(userId);
      loadData();
      Alert.alert('Success', 'User unbanned');
    } catch (error) {
      Alert.alert('Error', 'Failed to unban user');
    }
  };

  const renderOverview = () => {
    // Handle case where analytics is loading or empty
    if (!analytics) {
      return (
        <ScrollView style={styles.tabContent}>
          <View style={styles.emptyState}>
            <Ionicons name="stats-chart-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No analytics data</Text>
            <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView 
        style={styles.tabContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* Key Metrics */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.users?.dau || 0}</Text>
            <Text style={styles.metricLabel}>DAU</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.users?.wau || 0}</Text>
            <Text style={styles.metricLabel}>WAU</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.problems?.today || 0}</Text>
            <Text style={styles.metricLabel}>Frikts Today</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.comments?.today || 0}</Text>
            <Text style={styles.metricLabel}>Comments Today</Text>
          </View>
        </View>
        
        {/* DAU/WAU Definition */}
        <View style={styles.definitionCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
          <Text style={styles.definitionText}>
            Active = posted, related, or commented (not just opened app)
          </Text>
        </View>

        {/* Totals */}
        <Text style={styles.sectionTitle}>Totals</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{analytics.users?.total || 0}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="document-text" size={20} color={colors.accent} />
            <Text style={styles.statValue}>{analytics.problems?.total || 0}</Text>
            <Text style={styles.statLabel}>Frikts</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubbles" size={20} color={colors.amber} />
            <Text style={styles.statValue}>{analytics.comments?.total || 0}</Text>
            <Text style={styles.statLabel}>Comments</Text>
          </View>
        </View>

        {/* Alerts */}
        {(analytics.pending_reports || 0) > 0 && (
          <TouchableOpacity 
            style={styles.alertCard}
            onPress={() => setActiveTab('reports')}
            activeOpacity={0.7}
          >
            <Ionicons name="warning" size={24} color={colors.primary} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{analytics.pending_reports} Pending Reports</Text>
              <Text style={styles.alertText}>Tap to review</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        {(analytics.users?.banned || 0) > 0 && (
          <View style={styles.infoCard}>
            <Ionicons name="ban" size={20} color={colors.error} />
            <Text style={styles.infoText}>{analytics.users.banned} banned users</Text>
          </View>
        )}

        {/* Top Frikts */}
        <Text style={styles.sectionTitle}>Top Frikts by Signal</Text>
        
        {/* Signal Formula Info */}
        <View style={styles.formulaCard}>
          <Text style={styles.formulaTitle}>Signal Formula</Text>
          <Text style={styles.formulaText}>
            (relates × 3) + (comments × 2) + (unique × 1) + pain + recency
          </Text>
          <Text style={styles.formulaNotes}>
            Recency boost decays to 0 over 72h. Engagement always wins.
          </Text>
        </View>
        
        {analytics.top_problems && analytics.top_problems.length > 0 ? (
          analytics.top_problems.map((problem: any, index: number) => (
            <TouchableOpacity 
              key={problem.id}
              style={styles.topProblemCard}
              onPress={() => router.push(`/problem/${problem.id}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.rankNumber}>#{index + 1}</Text>
              <View style={styles.topProblemContent}>
                <Text style={styles.topProblemTitle} numberOfLines={1}>{problem.title}</Text>
                <View style={styles.topProblemStats}>
                  <Text style={styles.signalScore}>Signal: {(problem.signal_score || 0).toFixed(1)}</Text>
                  <Text style={styles.topProblemStat}>{problem.relates_count || 0} relates</Text>
                  <Text style={styles.topProblemStat}>{problem.comments_count || 0} comments</Text>
                </View>
                {/* Signal Breakdown */}
                {problem.signal_breakdown && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownItem}>
                      R:{problem.signal_breakdown.relates?.score || 0}
                    </Text>
                    <Text style={styles.breakdownItem}>
                      C:{problem.signal_breakdown.comments?.score || 0}
                    </Text>
                    <Text style={styles.breakdownItem}>
                      U:{problem.signal_breakdown.unique_commenters?.score || 0}
                    </Text>
                    <Text style={styles.breakdownItem}>
                      +{problem.signal_breakdown.recency?.boost?.toFixed(1) || 0} recency
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noDataCard}>
            <Ionicons name="trophy-outline" size={24} color={colors.textMuted} />
            <Text style={styles.noDataText}>No top Frikts yet</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  // ============ FEEDBACK HANDLERS ============

  const handleMarkFeedbackRead = async (feedbackId: string) => {
    try {
      await api.markFeedbackRead(feedbackId);
      setFeedbacks(feedbacks.map(f => 
        f.id === feedbackId ? { ...f, is_read: true } : f
      ));
      setUnreadFeedbackCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as read');
    }
  };

  const handleMarkFeedbackUnread = async (feedbackId: string) => {
    try {
      await api.markFeedbackUnread(feedbackId);
      setFeedbacks(feedbacks.map(f => 
        f.id === feedbackId ? { ...f, is_read: false } : f
      ));
      setUnreadFeedbackCount(prev => prev + 1);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark as unread');
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to delete this feedback?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteFeedback(feedbackId);
              const deleted = feedbacks.find(f => f.id === feedbackId);
              setFeedbacks(feedbacks.filter(f => f.id !== feedbackId));
              if (deleted && !deleted.is_read) {
                setUnreadFeedbackCount(prev => Math.max(0, prev - 1));
              }
              Alert.alert('Success', 'Feedback deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete feedback');
            }
          }
        }
      ]
    );
  };

  const renderFeedback = () => (
    <View style={styles.tabContent}>
      <View style={styles.filterRow}>
        {['all', 'unread', 'read'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, feedbackFilter === filter && styles.filterChipActive]}
            onPress={() => setFeedbackFilter(filter)}
          >
            <Text style={[styles.filterChipText, feedbackFilter === filter && styles.filterChipTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
              {filter === 'unread' && unreadFeedbackCount > 0 && ` (${unreadFeedbackCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
          />
        }
      >
        {feedbacks.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbox-ellipses-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No feedback yet</Text>
            <Text style={styles.emptySubtitle}>User feedback will appear here</Text>
          </View>
        ) : (
          feedbacks.map((feedback) => (
            <View 
              key={feedback.id} 
              style={[
                styles.feedbackCard,
                !feedback.is_read && styles.feedbackCardUnread
              ]}
            >
              <View style={styles.feedbackHeader}>
                <View style={styles.feedbackUser}>
                  <View style={styles.feedbackAvatar}>
                    <Text style={styles.feedbackAvatarText}>
                      {(feedback.user_name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.feedbackUserName}>{feedback.user_name}</Text>
                    <Text style={styles.feedbackEmail}>{feedback.user_email}</Text>
                  </View>
                </View>
                <View style={styles.feedbackMeta}>
                  {!feedback.is_read && (
                    <View style={styles.unreadDot} />
                  )}
                  <Text style={styles.feedbackTime}>
                    {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.feedbackMessage}>{feedback.message}</Text>
              
              <View style={styles.feedbackFooter}>
                <Text style={styles.feedbackVersion}>v{feedback.app_version}</Text>
                <View style={styles.feedbackActions}>
                  {feedback.is_read ? (
                    <TouchableOpacity 
                      style={styles.feedbackActionBtn}
                      onPress={() => handleMarkFeedbackUnread(feedback.id)}
                    >
                      <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                      <Text style={styles.feedbackActionText}>Mark Unread</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.feedbackActionBtn}
                      onPress={() => handleMarkFeedbackRead(feedback.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} />
                      <Text style={[styles.feedbackActionText, { color: colors.accent }]}>Mark Read</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.feedbackActionBtn}
                    onPress={() => handleDeleteFeedback(feedback.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                    <Text style={[styles.feedbackActionText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderReports = () => (
    <View style={styles.tabContent}>
      <View style={styles.filterRow}>
        {['pending', 'reviewed', 'dismissed'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, reportFilter === filter && styles.filterChipActive]}
            onPress={() => setReportFilter(filter)}
          >
            <Text style={[styles.filterChipText, reportFilter === filter && styles.filterChipTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.listContainer}>
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
            <Text style={styles.emptyTitle}>No {reportFilter} reports</Text>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={[styles.reportTypeBadge, { backgroundColor: report.target_type === 'problem' ? colors.softRed : colors.softGreen }]}>
                  <Text style={[styles.reportTypeText, { color: report.target_type === 'problem' ? colors.primary : colors.accent }]}>
                    {report.target_type}
                  </Text>
                </View>
                <View style={styles.reasonBadge}>
                  <Text style={styles.reasonText}>{report.reason}</Text>
                </View>
                <Text style={styles.reportTime}>
                  {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                </Text>
              </View>
              
              <Text style={styles.reporterInfo}>Reported by: {report.reporter_name}</Text>
              
              {report.target_data && (
                <View style={styles.targetPreview}>
                  <Text style={styles.targetText} numberOfLines={2}>
                    {report.target_data.title || report.target_data.content}
                  </Text>
                  <Text style={styles.targetAuthor}>by {report.target_data.user_name}</Text>
                </View>
              )}

              {report.details && (
                <Text style={styles.reportDetails}>"{report.details}"</Text>
              )}

              {reportFilter === 'pending' && (
                <View style={styles.reportActions}>
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => handleDismissReport(report.id)}
                  >
                    <Ionicons name="close-circle-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.actionBtnText}>Dismiss</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.actionBtnDanger]}
                    onPress={() => handleHideContent(report)}
                  >
                    <Ionicons name="eye-off-outline" size={18} color={colors.primary} />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Hide Content</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderUsers = () => (
    <View style={styles.tabContent}>
      <View style={styles.filterRow}>
        {['all', 'active', 'banned', 'shadowbanned'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, userFilter === filter && styles.filterChipActive]}
            onPress={() => setUserFilter(filter)}
          >
            <Text style={[styles.filterChipText, userFilter === filter && styles.filterChipTextActive]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.listContainer}>
        {users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>{user.name?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: user.status === 'active' ? colors.softGreen : colors.softRed }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: user.status === 'active' ? colors.accent : colors.primary }
                ]}>
                  {user.status}
                </Text>
              </View>
            </View>
            
            {user.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}

            <Text style={styles.userJoined}>
              Joined {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
            </Text>

            {user.role !== 'admin' && (
              <View style={styles.userActions}>
                {user.status === 'active' ? (
                  <>
                    <TouchableOpacity 
                      style={styles.userActionBtn}
                      onPress={() => handleBanUser(user.id, user.name)}
                    >
                      <Ionicons name="ban-outline" size={16} color={colors.error} />
                      <Text style={[styles.userActionText, { color: colors.error }]}>Ban</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity 
                    style={styles.userActionBtn}
                    onPress={() => handleUnbanUser(user.id)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} />
                    <Text style={[styles.userActionText, { color: colors.accent }]}>Unban</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderAudit = () => (
    <ScrollView style={styles.tabContent}>
      {auditLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No audit logs yet</Text>
        </View>
      ) : (
        auditLogs.map((log) => (
          <View key={log.id} style={styles.auditCard}>
            <View style={styles.auditHeader}>
              <View style={styles.auditIcon}>
                <Ionicons 
                  name={getAuditIcon(log.action)} 
                  size={16} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.auditAction}>{formatAction(log.action)}</Text>
              <Text style={styles.auditTime}>
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </Text>
            </View>
            <Text style={styles.auditAdmin}>by {log.admin_email}</Text>
            <Text style={styles.auditTarget}>Target: {log.target_type}/{log.target_id.slice(0, 8)}...</Text>
          </View>
        ))
      )}
    </ScrollView>
  );

  const getAuditIcon = (action: string) => {
    if (action.includes('ban')) return 'ban';
    if (action.includes('hide')) return 'eye-off';
    if (action.includes('delete')) return 'trash';
    if (action.includes('pin')) return 'pin';
    return 'create';
  };

  const formatAction = (action: string) => {
    return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Panel</Text>
        <View style={styles.adminBadgeHeader}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
        </View>
      </View>

      <View style={styles.tabs}>
        {[
          { key: 'overview', label: 'Overview', icon: 'stats-chart' },
          { key: 'feedback', label: 'Feedback', icon: 'chatbox-ellipses' },
          { key: 'reports', label: 'Reports', icon: 'flag' },
          { key: 'users', label: 'Users', icon: 'people' },
          { key: 'audit', label: 'Audit', icon: 'list' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as Tab)}
          >
            <View style={styles.tabInner}>
              <Ionicons 
                name={tab.icon as any} 
                size={18} 
                color={activeTab === tab.key ? colors.primary : colors.textMuted} 
              />
              {tab.key === 'feedback' && unreadFeedbackCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {unreadFeedbackCount > 9 ? '9+' : unreadFeedbackCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'feedback' && renderFeedback()}
          {activeTab === 'reports' && renderReports()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'audit' && renderAudit()}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  adminBadgeHeader: {
    backgroundColor: colors.softRed,
    padding: 6,
    borderRadius: radius.sm,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.softRed,
    padding: 14,
    borderRadius: radius.md,
    marginTop: 16,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  alertText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.md,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  topProblemCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    width: 30,
  },
  topProblemContent: {
    flex: 1,
  },
  topProblemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  topProblemStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  signalScore: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  topProblemStat: {
    fontSize: 11,
    color: colors.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.white,
  },
  listContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  reportCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reportTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  reportTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  reasonBadge: {
    backgroundColor: colors.softAmber,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  reasonText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.amber,
    textTransform: 'uppercase',
  },
  reportTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 'auto',
  },
  reporterInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  targetPreview: {
    backgroundColor: colors.background,
    padding: 10,
    borderRadius: radius.sm,
    marginBottom: 8,
  },
  targetText: {
    fontSize: 13,
    color: colors.text,
  },
  targetAuthor: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  reportDetails: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  actionBtnDanger: {
    backgroundColor: colors.softRed,
  },
  actionBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  userCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: colors.softRed,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  userJoined: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 8,
  },
  userActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  userActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  userActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  auditCard: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  auditIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.softRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  auditAction: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  auditTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  auditAdmin: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
    marginLeft: 36,
  },
  auditTarget: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 36,
  },
  definitionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.softGreen,
    padding: 10,
    borderRadius: radius.sm,
    marginTop: 8,
    gap: 6,
  },
  definitionText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  formulaCard: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formulaTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  formulaText: {
    fontSize: 11,
    color: colors.primary,
    fontFamily: 'monospace',
  },
  formulaNotes: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  breakdownItem: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
});
