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
}

export const api = new ApiService();
