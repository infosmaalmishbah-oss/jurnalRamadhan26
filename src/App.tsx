/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import { resolveIsAdmin } from './config';
import type { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem('jurnalRamadhan');
    if (session) {
      setUser(JSON.parse(session));
    }
    const admin = sessionStorage.getItem('isAdmin');
    if (admin === 'true') setIsAdmin(true);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    const admin =
      loggedInUser.isAdmin === true ||
      resolveIsAdmin(loggedInUser.nisn, loggedInUser);
    if (admin) {
      sessionStorage.setItem('isAdmin', 'true');
      sessionStorage.setItem(
        'jurnalRamadhan',
        JSON.stringify({ ...loggedInUser, isAdmin: true }),
      );
      setUser({ ...loggedInUser, isAdmin: true });
      setIsAdmin(true);
      return;
    }
    sessionStorage.removeItem('isAdmin');
    const { isAdmin: _a, ...student } = loggedInUser;
    sessionStorage.setItem('jurnalRamadhan', JSON.stringify(student));
    setUser(student);
    setIsAdmin(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('jurnalRamadhan');
    sessionStorage.removeItem('isAdmin');
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <div className="min-h-screen font-sans text-gray-900">
      {isAdmin ? (
        <AdminDashboard adminUser={user} onLogout={handleLogout} />
      ) : user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}
