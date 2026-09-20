import { apiClient } from './apiClient';
import type { User, Patient } from '@/lib/types';

export const authClient = {
  async signup(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) {
    return apiClient.post<{
      success?: boolean;
      userId?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      status?: string;
      message?: string;
    }>('/auth/signup', data);
  },

  async verifyOtp(
    emailOrObj: string | { email: string; otp: string; purpose?: string },
    otp?: string,
    purpose: string = 'signup'
  ) {
    const payload = typeof emailOrObj === 'object'
      ? emailOrObj
      : { email: emailOrObj, otp, purpose };
    return apiClient.post<{
      success?: boolean;
      verified?: boolean;
      purpose?: string;
      user?: User;
      token?: string;
      email?: string;
      message?: string;
    }>('/auth/verify-otp', payload);
  },

  async resendOtp(
    emailOrObj: string | { email: string; purpose?: string },
    purpose: string = 'signup'
  ) {
    const payload = typeof emailOrObj === 'object'
      ? emailOrObj
      : { email: emailOrObj, purpose };
    return apiClient.post<{
      success?: boolean;
      status?: string;
      message?: string;
    }>('/auth/resend-otp', payload);
  },

  async signin(
    emailOrObj: string | { email: string; password: string },
    password?: string
  ) {
    const payload = typeof emailOrObj === 'object'
      ? emailOrObj
      : { email: emailOrObj, password };
    return apiClient.post<{
      success?: boolean;
      status?: string;
      user?: User;
      token?: string;
      email?: string;
      message?: string;
      requiresVerification?: boolean;
    }>('/auth/signin', payload);
  },

  async forgotPassword(
    emailOrObj: string | { email: string }
  ) {
    const payload = typeof emailOrObj === 'object'
      ? emailOrObj
      : { email: emailOrObj };
    return apiClient.post<{
      success?: boolean;
      status?: string;
      email?: string;
      message?: string;
    }>('/auth/forgot-password', payload);
  },

  async resetPassword(data: {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return apiClient.post<{
      success?: boolean;
      status?: string;
      message?: string;
    }>('/auth/reset-password', data);
  },

  async demoSignin() {
    return apiClient.post<{
      success?: boolean;
      status?: string;
      user?: User;
      token?: string;
      message?: string;
    }>('/auth/demo-signin', {});
  },

  async loadDemoPatients() {
    return apiClient.post<{
      success: boolean;
      message: string;
      patients: Patient[];
    }>('/demo/load', {});
  },

  async clearDemoPatients() {
    return apiClient.post<{
      success: boolean;
      message: string;
    }>('/demo/clear', {});
  },
};
