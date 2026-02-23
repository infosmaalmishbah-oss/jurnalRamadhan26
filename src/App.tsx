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

  useEffect(() => {
    const session = sessionStorage.getItem('jurnalRamadhan');
    if (session) {
      setUser(JSON.parse(session));
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    sessionStorage.setItem('jurnalRamadhan', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('jurnalRamadhan');
    setUser(null);
  };

  return (
    <div className="min-h-screen font-sans text-gray-900">
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}
