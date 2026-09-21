import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';

import LandingPage from '../pages/LandingPage';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import VerifyEmail from '../pages/auth/VerifyEmail';
import ForgotPassword from '../pages/auth/ForgotPassword';
import VerifyResetOtp from '../pages/auth/VerifyResetOtp';
import ResetPassword from '../pages/auth/ResetPassword';

import CitizenDashboard from '../pages/citizen/CitizenDashboard';
import MyRequests from '../pages/citizen/MyRequests';
import CreateRequest from '../pages/citizen/CreateRequest';
import RequestDetails from '../pages/citizen/RequestDetails';

import StaffDashboard from '../pages/staff/StaffDashboard';
import StaffRequestDetails from '../pages/staff/StaffRequestDetails';

import AdminDashboard from '../pages/admin/AdminDashboard';
import UserManagement from '../pages/admin/UserManagement';
import AnalyticsPage from '../pages/admin/AnalyticsPage';
import ActivityLogsPage from '../pages/admin/ActivityLogsPage';
import FeedbackPage from '../pages/admin/FeedbackPage';
import ReportsPage from '../pages/admin/ReportsPage';
import DepartmentsPage from '../pages/admin/DepartmentsPage';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage';

import ProfilePage from '../pages/ProfilePage';
import NotificationsPage from '../pages/NotificationsPage';
import NotFound from '../pages/NotFound';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        {/* Public Routes */}
        <Route index element={<LandingPage />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="verify-reset-otp" element={<VerifyResetOtp />} />
        <Route path="reset-password" element={<ResetPassword />} />

        {/* Common Protected Routes */}
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="requests/:id"
          element={
            <ProtectedRoute>
              <RequestDetails />
            </ProtectedRoute>
          }
        />

        {/* Citizen Routes */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute allowedRoles={['CITIZEN']}>
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="requests"
          element={
            <ProtectedRoute allowedRoles={['CITIZEN']}>
              <MyRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="my-requests"
          element={
            <ProtectedRoute allowedRoles={['CITIZEN']}>
              <MyRequests />
            </ProtectedRoute>
          }
        />
        <Route
          path="requests/create"
          element={
            <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
              <CreateRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="create-request"
          element={
            <ProtectedRoute allowedRoles={['CITIZEN', 'ADMIN']}>
              <CreateRequest />
            </ProtectedRoute>
          }
        />

        {/* Staff Routes */}
        <Route
          path="staff/dashboard"
          element={
            <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/requests"
          element={
            <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff/requests/:id"
          element={
            <ProtectedRoute allowedRoles={['STAFF', 'ADMIN']}>
              <StaffRequestDetails />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/requests"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/analytics"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/activity-logs"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ActivityLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/feedback"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <FeedbackPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/departments"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <DepartmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/settings"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;

