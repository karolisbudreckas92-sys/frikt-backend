import axios, { AxiosInstance } from 'axios';

// Production backend URL - HARDCODED for reliability
const BASE_URL = 'https://frikt-backend-production.up.railway.app';

// Log the URL being used (for debugging)
console.log('[API] Using backend URL:', BASE_URL);

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    console.log('[API] Initializing with baseURL:', `${BASE_URL}/api`);
    
    this.client = axios.create({
      baseURL: `${BASE_URL}/api`,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      console.log('[API] Request:', config.method?.toUpperCase(), config.url);
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        console.log('[API] Response OK:', response.status);
        return response;
      },
      (error) => {
        console.log('[API] Error:', error.message);
        if (error.response) {
          console.log('[API] Error status:', error.response.status);
          console.log('[API] Error data:', JSON.stringify(error.response.data));
        } else if (error.request) {
          console.log('[API] No response received - network error');
        }
        throw error;
      }
    );
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

  async uploadAvatarBase64(base64: string, mimeType: string = 'image/jpeg') {
    const response = await this.client.post('/users/me/avatar-base64', {
      image: base64,
      mimeType,
    });
    // Convert relative URL to full URL
    const data = response.data;
    if (data.url && data.url.startsWith('/')) {
      data.url = BASE_URL + data.url;
    }
    return data;
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

  async deleteProblem(id: string) {
    const response = await this.client.delete(`/problems/${id}`);
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

  async getUserProfile(userId: string) {
    const response = await this.client.get(`/users/${userId}/profile`);
    return response.data;
  }

  async searchUsers(query: string, limit: number = 20) {
    const response = await this.client.get('/users/search', { params: { q: query, limit } });
    return response.data;
  }

  async getUserPosts(userId: string, sort: 'newest' | 'top' = 'newest') {
    const response = await this.client.get(`/users/${userId}/posts`, { params: { sort } });
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

  // ===================== CHANGE PASSWORD =====================

  async changePassword(currentPassword: string, newPassword: string) {
    const response = await this.client.post('/users/me/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response.data;
  }

  // ===================== DELETE ACCOUNT =====================

  async deleteAccount() {
    const response = await this.client.delete('/users/me');
    return response.data;
  }

  // ===================== BLOCKED USERS =====================

  async getBlockedUsers() {
    const response = await this.client.get('/users/me/blocked');
    return response.data;
  }

  async blockUser(userId: string) {
    const response = await this.client.post(`/users/${userId}/block`);
    return response.data;
  }

  async unblockUser(userId: string) {
    const response = await this.client.delete(`/users/${userId}/block`);
    return response.data;
  }

  // ===================== REPORT USER =====================

  async reportUser(userId: string, reason: string, details?: string) {
    const response = await this.client.post(`/report/user/${userId}`, { reason, details });
    return response.data;
  }

  // ===================== FEEDBACK =====================

  async submitFeedback(data: { message: string; appVersion?: string }) {
    const response = await this.client.post('/feedback', data);
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

  // Admin: Feedback
  async getAdminFeedback(isRead?: string) {
    const params: any = {};
    if (isRead !== undefined) params.is_read = isRead;
    const response = await this.client.get('/admin/feedback', { params });
    return response.data;
  }

  async markFeedbackRead(feedbackId: string) {
    const response = await this.client.post(`/admin/feedback/${feedbackId}/read`);
    return response.data;
  }

  async markFeedbackUnread(feedbackId: string) {
    const response = await this.client.post(`/admin/feedback/${feedbackId}/unread`);
    return response.data;
  }

  async deleteFeedback(feedbackId: string) {
    const response = await this.client.delete(`/admin/feedback/${feedbackId}`);
    return response.data;
  }
}

export const api = new ApiService();
