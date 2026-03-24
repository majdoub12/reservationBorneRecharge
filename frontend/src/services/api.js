import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; // your backend URL

// Tunisian car authentication
export const tunisianAuth = (data) => axios.post(`${API_URL}/auth/tunisian`, data);

// Foreign car authentication
export const foreignAuth = (data) => axios.post(`${API_URL}/auth/foreign`, data);

// OTP verification
export const verifyOTP = (data) => axios.post(`${API_URL}/auth/verify-otp`, data);