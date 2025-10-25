import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { LocalStorage } from '../utils/storage';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Load token from localStorage
    this.token = LocalStorage.get('authToken');
    
    // Add token to requests
    this.api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (this.token && config.headers) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Handle responses
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.logout();
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async register(data: {
    username: string;
    email: string;
    password: string;
  }) {
    const response = await this.api.post('/auth/register', data);
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response.data;
  }

  async joinTeam(teamCode: string) {
    const response = await this.api.post('/auth/join-team', { teamCode });
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  logout() {
    this.token = null;
    LocalStorage.remove('authToken');
    LocalStorage.remove('currentUser');
  }

  setToken(token: string) {
    this.token = token;
    LocalStorage.set('authToken', token);
  }

  // Data methods
  async getAllData() {
    const response = await this.api.get('/data/all');
    return response.data;
  }

  async getData(dataType: string) {
    const response = await this.api.get(`/data/${dataType}`);
    return response.data;
  }

  async saveData(dataType: string, data: any) {
    const response = await this.api.post(`/data/${dataType}`, data);
    return response.data;
  }

  async deleteData(dataType: string) {
    const response = await this.api.delete(`/data/${dataType}`);
    return response.data;
  }

  // Team methods
  async getTeamInfo() {
    const response = await this.api.get('/team/info');
    return response.data;
  }

  async getTeamMembers() {
    const response = await this.api.get('/team/members');
    return response.data;
  }

  async updateTeam(data: { name?: string; description?: string }) {
    const response = await this.api.put('/team/update', data);
    return response.data;
  }

  async removeMember(memberId: string) {
    const response = await this.api.delete(`/team/members/${memberId}`);
    return response.data;
  }

  // Health check
  async checkHealth() {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      return { status: 'error', message: 'Server is not responding' };
    }
  }
}

export default new ApiService();