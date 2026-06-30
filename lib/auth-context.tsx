import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'operator' | 'reviewer';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextProps {
  user: UserProfile | null;
  toggleRole: () => void;
  isLoggingIn: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Default logged in user in simulation profile
    setUser({
      uid: 'user-001',
      name: 'Sarah Chen',
      email: 'sarah.chen@axon-governance.ai',
      role: 'operator'
    });
  }, []);

  const toggleRole = () => {
    if (!user) return;
    const newRole: UserRole = user.role === 'operator' ? 'reviewer' : 'operator';
    setUser({
      ...user,
      role: newRole,
      name: newRole === 'reviewer' ? 'Sarah Chen (Lead Auditor)' : 'Sarah Chen',
    });
  };

  return (
    <AuthContext.Provider value={{ user, toggleRole, isLoggingIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
