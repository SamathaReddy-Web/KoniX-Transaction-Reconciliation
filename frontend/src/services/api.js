import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const runReconciliation = async (formData) => {
    const response = await axios.post(`${API_URL}/reconcile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const getSummary = async (runId) => {
    const response = await axios.get(`${API_URL}/report/${runId}/summary`);
    return response.data;
};

export const getReport = async (runId, params = {}) => {
    const response = await axios.get(`${API_URL}/report/${runId}`, { params });
    return response.data;
};
