/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { User } from './types';

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
    sessionStorage.setItem('jurnalRamadhan', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('jurnalRamadhan');
    sessionStorage.removeItem('isAdmin');
    setUser(null);
  };

  return (
    <div className="min-h-screen font-sans text-gray-900">
      {isAdmin ? (
        // render dashboard in admin mode with placeholder admin user
        <Dashboard user={{ nama: 'Admin', kelas: 'Admin', nisn: '0000000000' }} onLogout={handleLogout} />
      ) : user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}
