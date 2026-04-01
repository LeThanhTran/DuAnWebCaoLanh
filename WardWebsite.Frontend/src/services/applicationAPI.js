import axios from 'axios';

const API_BASE_URL = '/api';

const applicationAPI = {
  // Get all pending applications
  getPendingApplications: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/applications/pending`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      throw error;
    }
  },

  // Get all applications with filtering
  getApplications: async ({
    status = null,
    search = null,
    serviceId = null,
    fromDate = null,
    toDate = null,
    page = 1,
    pageSize = 10
  } = {}) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });

      if (status) params.append('status', status);
      if (search) params.append('search', search);
      if (serviceId) params.append('serviceId', serviceId);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      
      const response = await axios.get(`${API_BASE_URL}/applications?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return {
        data: response.data.data || [],
        pagination: response.data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  },

  // Get application by ID
  getApplicationById: async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/applications/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching application:', error);
      throw error;
    }
  },

  // Create new application
  createApplication: async (formData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/applications`, formData);
      return response.data;
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
  },

  // Update application status
  updateApplicationStatus: async (id, status, notes = null) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_BASE_URL}/applications/${id}/status`,
        { status, notes },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  },

  // Delete application
  deleteApplication: async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_BASE_URL}/applications/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting application:', error);
      throw error;
    }
  }
};

export default applicationAPI;
