import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';

const BASE_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${BASE_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setToken(token: string | null) {
    this.token = token;
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async register(name: string, email: string, password: string) {
    const response = await this.client.post('/auth/register', { email, name, password });
    return response.data;
  }

  async getMe() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Profile
  async updateProfile(data: {
    displayName: string;
    bio?: string;
    city?: string;
    showCity?: boolean;
    avatarUrl?: string | null;
  }) {
    const response = await this.client.put('/users/me/profile', data);
    return response.data;
  }

  async uploadAvatar(uri: string) {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // Check if running on web
    if (typeof window !== 'undefined' && uri.startsWith('blob:')) {
      // Web: fetch the blob and append as File
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, filename);
    } else if (typeof window !== 'undefined' && uri.startsWith('data:')) {
      // Web: handle data URI
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, filename);
    } else {
      // Native: use the React Native format
      formData.append('file', {
        uri,
        name: filename,
        type,
      } as any);
    }

    const response = await this.client.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Categories
  async getCategories() {
    const response = await this.client.get('/categories');
    return response.data;
  }

  // Problems
  async getProblems(feed: string = 'new', categoryId?: string, search?: string, skip: number = 0) {
    const params: any = { feed, skip, limit: 50 };
    if (categoryId) params.category_id = categoryId;
    if (search) params.search = search;
    const response = await this.client.get('/problems', { params });
    return response.data;
  }

  async getProblem(id: string) {
    const response = await this.client.get(`/problems/${id}`);
    return response.data;
  }

  async createProblem(data: any) {
    const response = await this.client.post('/problems', data);
    return response.data;
  }

  async updateProblem(id: string, data: any) {
    const response = await this.client.patch(`/problems/${id}`, data);
    return response.data;
  }

  async getSimilarProblems(title: string) {
    const response = await this.client.get('/problems/similar', { params: { title } });
    return response.data;
  }

  async getRelatedProblems(problemId: string) {
    const response = await this.client.get(`/problems/${problemId}/related`);
    return response.data;
  }

  // Relates
  async relateToProblem(problemId: string) {
    const response = await this.client.post(`/problems/${problemId}/relate`);
    return response.data;
  }

  async unrelateToProblem(problemId: string) {
    const response = await this.client.delete(`/problems/${problemId}/relate`);
    return response.data;
  }

  // Save/Follow
  async saveProblem(problemId: string) {
    const response = await this.client.post(`/problems/${problemId}/save`);
    return response.data;
  }

  async unsaveProblem(problemId: string) {
    const response = await this.client.delete(`/problems/${problemId}/save`);
    return response.data;
  }

  async followProblem(problemId: string) {
    const response = await this.client.post(`/problems/${problemId}/follow`);
    return response.data;
  }

  async unfollowProblem(problemId: string) {
    const response = await this.client.delete(`/problems/${problemId}/follow`);
    return response.data;
  }

  async followCategory(categoryId: string) {
    const response = await this.client.post(`/categories/${categoryId}/follow`);
    return response.data;
  }

  async unfollowCategory(categoryId: string) {
    const response = await this.client.delete(`/categories/${categoryId}/follow`);
    return response.data;
  }

  // Comments
  async getComments(problemId: string) {
    const response = await this.client.get(`/problems/${problemId}/comments`);
    return response.data;
  }

  async createComment(problemId: string, content: string) {
    const response = await this.client.post('/comments', { problem_id: problemId, content });
    return response.data;
  }

  async markHelpful(commentId: string) {
    const response = await this.client.post(`/comments/${commentId}/helpful`);
    return response.data;
  }

  async unmarkHelpful(commentId: string) {
    const response = await this.client.delete(`/comments/${commentId}/helpful`);
    return response.data;
  }

  // Notifications
  async getNotifications() {
    const response = await this.client.get('/notifications');
    return response.data;
  }

  async markNotificationsRead() {
    const response = await this.client.post('/notifications/read');
    return response.data;
  }

  // Mission
  async getMission() {
    const response = await this.client.get('/mission');
    return response.data;
  }

  // User
  async getUserStats(userId: string) {
    const response = await this.client.get(`/users/${userId}/stats`);
    return response.data;
  }

  async getSavedProblems() {
    const response = await this.client.get('/users/me/saved');
    return response.data;
  }

  async getMyPosts() {
    const response = await this.client.get('/users/me/posts');
    return response.data;
  }

  // Report
  async reportProblem(problemId: string) {
    const response = await this.client.post(`/problems/${problemId}/report`);
    return response.data;
  }

  // Push Notifications
  async registerPushToken(token: string) {
    const response = await this.client.post('/push/register', { token });
    return response.data;
  }

  async unregisterPushToken() {
    const response = await this.client.delete('/push/unregister');
    return response.data;
  }

  async updateNotificationSettings(settings: {
    newComments: boolean;
    newRelates: boolean;
    trending: boolean;
  }) {
    const response = await this.client.put('/push/settings', settings);
    return response.data;
  }

  async getNotificationSettings() {
    const response = await this.client.get('/push/settings');
    return response.data;
  }

  // Enhanced Reports
  async reportProblemWithReason(problemId: string, reason: string, details?: string) {
    const response = await this.client.post(`/report/problem/${problemId}`, { reason, details });
    return response.data;
  }

  async reportCommentWithReason(commentId: string, reason: string, details?: string) {
    const response = await this.client.post(`/report/comment/${commentId}`, { reason, details });
    return response.data;
  }

  // ===================== ADMIN API =====================

  // Admin: Reports
  async getAdminReports(status: string = 'pending', targetType?: string) {
    const params: any = { status };
    if (targetType) params.target_type = targetType;
    const response = await this.client.get('/admin/reports', { params });
    return response.data;
  }

  async dismissReport(reportId: string) {
    const response = await this.client.post(`/admin/reports/${reportId}/dismiss`);
    return response.data;
  }

  async markReportReviewed(reportId: string) {
    const response = await this.client.post(`/admin/reports/${reportId}/reviewed`);
    return response.data;
  }

  // Admin: Problems
  async getReportedProblems() {
    const response = await this.client.get('/admin/reported-problems');
    return response.data;
  }

  async hideProblem(problemId: string) {
    const response = await this.client.post(`/admin/problems/${problemId}/hide`);
    return response.data;
  }

  async unhideProblem(problemId: string) {
    const response = await this.client.post(`/admin/problems/${problemId}/unhide`);
    return response.data;
  }

  async deleteProblemAdmin(problemId: string) {
    const response = await this.client.delete(`/admin/problems/${problemId}`);
    return response.data;
  }

  async pinProblem(problemId: string) {
    const response = await this.client.post(`/admin/problems/${problemId}/pin`);
    return response.data;
  }

  async unpinProblem(problemId: string) {
    const response = await this.client.post(`/admin/problems/${problemId}/unpin`);
    return response.data;
  }

  async markNeedsContext(problemId: string) {
    const response = await this.client.post(`/admin/problems/${problemId}/needs-context`);
    return response.data;
  }

  async clearNeedsContext(problemId: string) {
    const response = await this.client.post(`/admin/problems/${problemId}/clear-needs-context`);
    return response.data;
  }

  async mergeDuplicates(primaryId: string, duplicateIds: string[]) {
    const response = await this.client.post(`/admin/problems/${primaryId}/merge`, { duplicate_ids: duplicateIds });
    return response.data;
  }

  // Admin: Comments
  async getReportedComments() {
    const response = await this.client.get('/admin/reported-comments');
    return response.data;
  }

  async hideComment(commentId: string) {
    const response = await this.client.post(`/admin/comments/${commentId}/hide`);
    return response.data;
  }

  async unhideComment(commentId: string) {
    const response = await this.client.post(`/admin/comments/${commentId}/unhide`);
    return response.data;
  }

  async deleteCommentAdmin(commentId: string) {
    const response = await this.client.delete(`/admin/comments/${commentId}`);
    return response.data;
  }

  // Admin: Users
  async getAdminUsers(status?: string, role?: string) {
    const params: any = {};
    if (status) params.status = status;
    if (role) params.role = role;
    const response = await this.client.get('/admin/users', { params });
    return response.data;
  }

  async getAdminUserDetail(userId: string) {
    const response = await this.client.get(`/admin/users/${userId}`);
    return response.data;
  }

  async banUser(userId: string) {
    const response = await this.client.post(`/admin/users/${userId}/ban`);
    return response.data;
  }

  async shadowbanUser(userId: string) {
    const response = await this.client.post(`/admin/users/${userId}/shadowban`);
    return response.data;
  }

  async unbanUser(userId: string) {
    const response = await this.client.post(`/admin/users/${userId}/unban`);
    return response.data;
  }

  // Admin: Analytics
  async getAdminAnalytics() {
    const response = await this.client.get('/admin/analytics');
    return response.data;
  }

  // Admin: Audit Log
  async getAuditLog(adminId?: string, action?: string) {
    const params: any = {};
    if (adminId) params.admin_id = adminId;
    if (action) params.action = action;
    const response = await this.client.get('/admin/audit-log', { params });
    return response.data;
  }
}

export const api = new ApiService();
