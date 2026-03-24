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
  TextInput,
  Platform,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/src/theme/colors';
import { api } from '@/src/services/api';
import { useAuth } from '@/src/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import Toast from 'react-native-root-toast';

type Tab = 'overview' | 'feedback' | 'reports' | 'broadcast' | 'users' | 'audit' | 'communities';

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
  
  // Broadcast data
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  const [broadcastStats, setBroadcastStats] = useState<any>(null);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);

  // Communities data
  const [commRequests, setCommRequests] = useState<any[]>([]);
  const [commList, setCommList] = useState<any[]>([]);
  const [commTotal, setCommTotal] = useState(0);
  const [commSearch, setCommSearch] = useState('');
  const [expandedComm, setExpandedComm] = useState<string | null>(null);
  const [commJoinReqs, setCommJoinReqs] = useState<Record<string, any[]>>({});
  const [newCommName, setNewCommName] = useState('');
  const [newCommCode, setNewCommCode] = useState('');
  const [newCommEmail, setNewCommEmail] = useState('');
  const [isCreatingComm, setIsCreatingComm] = useState(false);
  const [changeCodeId, setChangeCodeId] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [exportPeriod, setExportPeriod] = useState<Record<string, string>>({});
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

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
          // Load total users for broadcast
          try {
            const usersCount = await api.getAdminUsersCount();
            setTotalUsers(usersCount.total_users || 0);
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
        case 'broadcast':
          const [historyData, statsData, usersCountData] = await Promise.all([
            api.getBroadcastHistory(),
            api.getBroadcastStats(),
            api.getAdminUsersCount()
          ]);
          setBroadcastHistory(historyData.broadcasts || []);
          setBroadcastStats(statsData);
          setTotalUsers(usersCountData.total_users || 0);
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
        case 'communities':
          const [commReqs, commListData] = await Promise.all([
            api.adminGetCommunityRequests(),
            api.adminGetCommunities(commSearch || undefined)
          ]);
          setCommRequests(commReqs || []);
          setCommList(commListData.communities || []);
          setCommTotal(commListData.total || 0);
          break;
      }
    } catch (error) {
      // Silent fail
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

        {/* LOCAL Stats */}
        {analytics?.local && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>LOCAL Communities</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { borderLeftColor: '#E85D3A' }]}>
                <Text style={styles.statValue}>{analytics.local.total_communities}</Text>
                <Text style={styles.statLabel}>Communities</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#E85D3A' }]}>
                <Text style={styles.statValue}>{analytics.local.total_members}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#E85D3A' }]}>
                <Text style={styles.statValue}>{analytics.local.local_frikts_total}</Text>
                <Text style={styles.statLabel}>Local Frikts</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#E85D3A' }]}>
                <Text style={styles.statValue}>{analytics.local.local_frikts_today}</Text>
                <Text style={styles.statLabel}>Local Today</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#E85D3A' }]}>
                <Text style={styles.statValue}>{analytics.local.local_frikts_week}</Text>
                <Text style={styles.statLabel}>Local This Week</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#E85D3A' }]}>
                <Text style={styles.statValue}>{analytics.local.pending_join_requests}</Text>
                <Text style={styles.statLabel}>Pending Joins</Text>
              </View>
            </View>
          </>
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
      <View style={styles.totalCountBanner}>
        <Ionicons name="people" size={20} color={colors.primary} />
        <Text style={styles.totalCountText}>Total Users: {users.length}</Text>
      </View>
      
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

  // Broadcast notification handlers
  const handleSendBroadcast = () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      Alert.alert('Error', 'Please enter both title and body');
      return;
    }
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Send this notification to all ${totalUsers} users?`);
      if (confirmed) {
        performSendBroadcast();
      }
    } else {
      Alert.alert(
        'Send Notification',
        `Send this notification to all ${totalUsers} users?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send', onPress: performSendBroadcast },
        ]
      );
    }
  };

  const performSendBroadcast = async () => {
    setIsSendingBroadcast(true);
    try {
      const result = await api.broadcastNotification(broadcastTitle.trim(), broadcastBody.trim());
      Toast.show(`Notification sent to ${result.recipient_count} users`, {
        duration: Toast.durations.LONG,
        position: Toast.positions.TOP,
      });
      setBroadcastTitle('');
      setBroadcastBody('');
      loadData(); // Refresh history
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to send notification');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const renderBroadcast = () => (
    <ScrollView 
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />
      }
    >
      {/* Rate limit info */}
      {broadcastStats && (
        <View style={styles.broadcastStatsCard}>
          <View style={styles.broadcastStatItem}>
            <Text style={styles.broadcastStatValue}>{broadcastStats.remaining_broadcasts}</Text>
            <Text style={styles.broadcastStatLabel}>Remaining today</Text>
          </View>
          <View style={styles.broadcastStatItem}>
            <Text style={styles.broadcastStatValue}>{broadcastStats.total_push_tokens}</Text>
            <Text style={styles.broadcastStatLabel}>Active tokens</Text>
          </View>
        </View>
      )}

      {/* Compose Form */}
      <View style={styles.broadcastCard}>
        <Text style={styles.broadcastSectionTitle}>Compose Notification</Text>
        
        <View style={styles.inputGroup}>
          <View style={styles.inputHeader}>
            <Text style={styles.inputLabel}>Title</Text>
            <Text style={[
              styles.charCount,
              broadcastTitle.length > 50 && styles.charCountOver
            ]}>
              {broadcastTitle.length}/50
            </Text>
          </View>
          <TextInput
            style={styles.broadcastInput}
            value={broadcastTitle}
            onChangeText={(text) => setBroadcastTitle(text.slice(0, 50))}
            placeholder="Notification title"
            placeholderTextColor={colors.textMuted}
            maxLength={50}
            data-testid="broadcast-title-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.inputHeader}>
            <Text style={styles.inputLabel}>Body</Text>
            <Text style={[
              styles.charCount,
              broadcastBody.length > 150 && styles.charCountOver
            ]}>
              {broadcastBody.length}/150
            </Text>
          </View>
          <TextInput
            style={[styles.broadcastInput, styles.broadcastInputMultiline]}
            value={broadcastBody}
            onChangeText={(text) => setBroadcastBody(text.slice(0, 150))}
            placeholder="Notification message"
            placeholderTextColor={colors.textMuted}
            maxLength={150}
            multiline
            numberOfLines={3}
            data-testid="broadcast-body-input"
          />
        </View>

        {/* Preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.previewNotification}>
            <View style={styles.previewIcon}>
              <Ionicons name="notifications" size={20} color={colors.white} />
            </View>
            <View style={styles.previewContent}>
              <Text style={styles.previewAppName}>FRIKT</Text>
              <Text style={styles.previewNotifTitle} numberOfLines={1}>
                {broadcastTitle || 'Notification Title'}
              </Text>
              <Text style={styles.previewNotifBody} numberOfLines={2}>
                {broadcastBody || 'Notification message will appear here...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!broadcastTitle.trim() || !broadcastBody.trim() || isSendingBroadcast) && styles.sendButtonDisabled
          ]}
          onPress={handleSendBroadcast}
          disabled={!broadcastTitle.trim() || !broadcastBody.trim() || isSendingBroadcast}
          data-testid="broadcast-send-button"
        >
          {isSendingBroadcast ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="send" size={18} color={colors.white} />
              <Text style={styles.sendButtonText}>Send to all {totalUsers} users</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* History */}
      <View style={styles.broadcastCard}>
        <Text style={styles.broadcastSectionTitle}>Recent Broadcasts</Text>
        
        {broadcastHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No broadcasts yet</Text>
          </View>
        ) : (
          broadcastHistory.map((broadcast) => (
            <View key={broadcast.id} style={styles.historyItem}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle} numberOfLines={1}>{broadcast.title}</Text>
                <Text style={styles.historyRecipients}>{broadcast.recipient_count} users</Text>
              </View>
              <Text style={styles.historyBody} numberOfLines={2}>{broadcast.body}</Text>
              <Text style={styles.historyTime}>
                {formatDistanceToNow(new Date(broadcast.sent_at), { addSuffix: true })}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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

  const loadJoinRequests = async (communityId: string) => {
    try {
      const data = await api.adminGetJoinRequests(communityId);
      setCommJoinReqs(prev => ({ ...prev, [communityId]: data }));
    } catch (e) {}
  };

  const handleCreateCommunity = async () => {
    if (!newCommName.trim() || !newCommCode.trim() || !newCommEmail.trim()) return;
    setIsCreatingComm(true);
    try {
      await api.adminCreateCommunity(newCommName.trim(), newCommCode.trim(), newCommEmail.trim());
      setNewCommName(''); setNewCommCode(''); setNewCommEmail('');
      Alert.alert('Success', 'Community created');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create community');
    } finally {
      setIsCreatingComm(false);
    }
  };

  const handleChangeCode = async (communityId: string) => {
    if (!newCode.trim()) return;
    try {
      await api.adminUpdateCommunityCode(communityId, newCode.trim());
      setChangeCodeId(null); setNewCode('');
      Alert.alert('Success', 'Code updated');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update code');
    }
  };

  const handleSendCode = (email: string, code: string, commName: string) => {
    const subject = encodeURIComponent(`Your invite code for ${commName}`);
    const body = encodeURIComponent(`Hi!\n\nHere's your invite code to join ${commName} on Frikt:\n\n${code}\n\nOpen the app, tap the Local tab, and enter this code.\n\nSee you there!`);
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const handleExport = async (communityId: string) => {
    const period = exportPeriod[communityId] || 'all';
    try {
      const data = await api.adminExportCommunityData(communityId, period);
      await Share.share({ message: data.content, title: data.filename });
    } catch (error) {
      Alert.alert('Error', 'Failed to export');
    }
  };

  const toggleExpandComm = (communityId: string) => {
    if (expandedComm === communityId) {
      setExpandedComm(null);
    } else {
      setExpandedComm(communityId);
      loadJoinRequests(communityId);
    }
  };

  const CORAL = '#E85D3A';

  const renderCommunities = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} tintColor={CORAL} />}
    >
      {/* Community Requests */}
      <Text style={styles.sectionTitle}>Community Requests ({commRequests.length})</Text>
      {commRequests.length === 0 ? (
        <Text style={{ color: colors.textMuted, paddingHorizontal: 16, marginBottom: 16 }}>No pending requests</Text>
      ) : (
        commRequests.map((req) => (
          <View key={req.id} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: CORAL }]}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{req.community_name}</Text>
            <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{req.email}</Text>
            {req.description && <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>{req.description}</Text>}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CORAL, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }}
                onPress={() => {
                  const subject = encodeURIComponent(`Re: Community request - ${req.community_name}`);
                  const body = encodeURIComponent(`Hi!\n\nRegarding your request to create the community "${req.community_name}" on Frikt:\n\n`);
                  Linking.openURL(`mailto:${req.email}?subject=${subject}&body=${body}`);
                }}
                data-testid={`contact-request-${req.id}`}
              >
                <Ionicons name="mail" size={14} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Contact</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.border, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }}
                onPress={async () => {
                  try {
                    await api.adminDismissCommunityRequest(req.id);
                    loadData();
                  } catch (error) {
                    Alert.alert('Error', 'Failed to dismiss request');
                  }
                }}
                data-testid={`dismiss-request-${req.id}`}
              >
                <Ionicons name="close-circle" size={14} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Create Community */}
      <Text style={styles.sectionTitle}>Create Community</Text>
      <View style={[styles.card, { gap: 10 }]}>
        <TextInput
          style={styles.input}
          placeholder="Community name"
          placeholderTextColor={colors.textMuted}
          value={newCommName}
          onChangeText={setNewCommName}
          data-testid="admin-comm-name"
        />
        <TextInput
          style={styles.input}
          placeholder="Invite code (e.g. MELB-CBD)"
          placeholderTextColor={colors.textMuted}
          value={newCommCode}
          onChangeText={setNewCommCode}
          autoCapitalize="characters"
          data-testid="admin-comm-code"
        />
        <TextInput
          style={styles.input}
          placeholder="Moderator email"
          placeholderTextColor={colors.textMuted}
          value={newCommEmail}
          onChangeText={setNewCommEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          data-testid="admin-comm-email"
        />
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: CORAL }, (!newCommName.trim() || !newCommCode.trim() || !newCommEmail.trim()) && { opacity: 0.5 }]}
          onPress={handleCreateCommunity}
          disabled={!newCommName.trim() || !newCommCode.trim() || !newCommEmail.trim() || isCreatingComm}
          data-testid="admin-create-comm-btn"
        >
          {isCreatingComm ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Community</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Communities */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <Text style={styles.sectionTitle}>Active Communities ({commTotal})</Text>
      </View>
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <TextInput
          style={styles.input}
          placeholder="Search communities..."
          placeholderTextColor={colors.textMuted}
          value={commSearch}
          onChangeText={(text) => { setCommSearch(text); }}
          onSubmitEditing={() => loadData()}
          returnKeyType="search"
          data-testid="admin-comm-search"
        />
      </View>

      {commList.map((comm) => {
        const isExpanded = expandedComm === comm.id;
        const joinReqs = commJoinReqs[comm.id] || [];
        const period = exportPeriod[comm.id] || 'all';

        return (
          <View key={comm.id} style={[styles.card, { marginBottom: 8 }]}>
            {/* Collapsible header */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => toggleExpandComm(comm.id)}
              data-testid={`comm-row-${comm.id}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{comm.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                  Code: {comm.active_code} | {comm.member_count} members | {comm.frikt_count} frikts
                  {comm.pending_join_requests > 0 && ` | ${comm.pending_join_requests} pending`}
                </Text>
              </View>
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Expanded content */}
            {isExpanded && (
              <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                {/* Change Code */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Change Code</Text>
                  {changeCodeId === comm.id ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="New code"
                        value={newCode}
                        onChangeText={setNewCode}
                        autoCapitalize="characters"
                      />
                      <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: CORAL, paddingHorizontal: 16 }]}
                        onPress={() => handleChangeCode(comm.id)}
                      >
                        <Text style={styles.primaryButtonText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ justifyContent: 'center' }}
                        onPress={() => { setChangeCodeId(null); setNewCode(''); }}
                      >
                        <Ionicons name="close" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      onPress={() => { setChangeCodeId(comm.id); setNewCode(comm.active_code); }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '700', color: CORAL }}>{comm.active_code}</Text>
                      <Ionicons name="pencil" size={14} color={CORAL} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Join Requests */}
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>
                  Join Requests ({joinReqs.length})
                </Text>
                {joinReqs.length === 0 ? (
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>No pending join requests</Text>
                ) : (
                  joinReqs.map((jr) => (
                    <View key={jr.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: jr.status === 'sent' ? 0.5 : 1 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: colors.text }}>{jr.user_email}</Text>
                        {jr.message && <Text style={{ fontSize: 12, color: colors.textMuted }}>{jr.message}</Text>}
                      </View>
                      {jr.status === 'sent' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.border, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 }}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.textMuted} />
                          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>Sent</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 4,
                            backgroundColor: CORAL, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8,
                          }}
                          onPress={() => {
                            handleSendCode(jr.user_email, comm.active_code, comm.name);
                            api.adminUpdateJoinRequest(comm.id, jr.id, 'sent').then(() => loadJoinRequests(comm.id));
                          }}
                          data-testid={`send-code-${jr.id}`}
                        >
                          <Ionicons name="mail" size={14} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Send Code</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}

                {/* Export */}
                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 }}>Export Data</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {['all', '7d', '30d', '90d'].map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={{
                          paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16,
                          backgroundColor: period === p ? CORAL : colors.background,
                          borderWidth: 1, borderColor: period === p ? CORAL : colors.border,
                        }}
                        onPress={() => setExportPeriod(prev => ({ ...prev, [comm.id]: p }))}
                      >
                        <Text style={{ fontSize: 12, color: period === p ? '#fff' : colors.textSecondary, fontWeight: '500' }}>
                          {p === 'all' ? 'All time' : p === '7d' ? '7 days' : p === '30d' ? '30 days' : '90 days'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    onPress={() => handleExport(comm.id)}
                    data-testid={`export-${comm.id}`}
                  >
                    <Ionicons name="download-outline" size={16} color={CORAL} />
                    <Text style={{ fontSize: 13, color: CORAL, fontWeight: '600' }}>Export {period === 'all' ? 'All' : period}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}

      <View style={{ height: 40 }} />
    </ScrollView>
  );

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
          { key: 'broadcast', label: 'Broadcast', icon: 'megaphone' },
          { key: 'users', label: 'Users', icon: 'people' },
          { key: 'audit', label: 'Audit', icon: 'list' },
          { key: 'communities', label: 'Local', icon: 'location' },
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
          {activeTab === 'broadcast' && renderBroadcast()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'audit' && renderAudit()}
          {activeTab === 'communities' && renderCommunities()}
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
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  tabInner: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 10,
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
  totalCountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalCountText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
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
  // ========== FEEDBACK STYLES ==========
  feedbackCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radius.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedbackCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.softRed,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  feedbackUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  feedbackAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  feedbackAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  feedbackUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  feedbackEmail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  feedbackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  feedbackTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  feedbackMessage: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  feedbackVersion: {
    fontSize: 11,
    color: colors.textMuted,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  feedbackActions: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackActionText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  // Broadcast styles
  broadcastStatsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
    gap: 16,
  },
  broadcastStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  broadcastStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
  },
  broadcastStatLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  broadcastCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  broadcastSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  charCount: {
    fontSize: 12,
    color: colors.textMuted,
  },
  charCountOver: {
    color: colors.error,
  },
  broadcastInput: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  broadcastInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  previewCard: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewNotification: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewContent: {
    flex: 1,
  },
  previewAppName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  previewNotifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  previewNotifBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  historyRecipients: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '500',
    marginLeft: 8,
  },
  historyBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 14,
    color: colors.text,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
