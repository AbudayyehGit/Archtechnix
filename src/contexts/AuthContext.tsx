import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';

export interface CapacitySummary {
  maxSlots: number;
  filledSlots: number;
  availableSlots: number;
  dbActiveCount: number;
  weeklyHoursCap: string;
  label: string;
}

export interface WorkspacePayload {
  client: {
    id: number;
    uid: string;
    email: string;
    organizationName: string;
    primaryCloud: string;
    rpoTarget: string;
    repoUrl: string;
  } | null;
  audit: {
    id: number;
    title: string;
    tier: string;
    status: string;
    overallScore: number;
    loomUrl: string;
    roadmapMarkdown: string;
    stripeSessionId?: string | null;
  } | null;
  retainer: {
    id: number;
    status: string;
    monthlyAmountUsd: number;
    cadenceWindow: string;
    stripeSessionId?: string | null;
    activatedAt?: string | null;
  } | null;
  complianceMetrics: Array<{
    id: number;
    framework: 'SOC2' | 'ISO27001' | 'NIST';
    controlCode: string;
    controlTitle: string;
    category: string;
    severity: string;
    rpoRtoImpact: string;
    isCompliant: boolean;
    remediationNote: string;
    updatedAt: string;
  }>;
  adrs: Array<{
    id: number;
    docType: 'SSD' | 'ADR' | 'DATA_FLOW' | 'RISK_REGISTER';
    docNumber: string;
    title: string;
    status: string;
    markdownContent: string;
    updatedAt: string;
  }>;
  syncAgendas: Array<{
    id: number;
    syncDate: string;
    timeWindow: string;
    architectName: string;
    agendaTitle: string;
    preReadChecklist: Array<{
      id: string;
      label: string;
      owner: string;
      completed: boolean;
    }>;
    decisionLogMarkdown: string;
    loomSummaryUrl: string;
    updatedAt: string;
  }>;
}

interface AuthContextValue {
  user: User | null;
  idToken: string | null;
  loadingAuth: boolean;
  authError: string | null;
  workspace: WorkspacePayload | null;
  loadingWorkspace: boolean;
  capacity: CapacitySummary;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  refreshWorkspace: (tokenOverride?: string | null) => Promise<void>;
  refreshCapacity: () => Promise<void>;
}

const DEFAULT_CAPACITY: CapacitySummary = {
  maxSlots: 4,
  filledSlots: 3,
  availableSlots: 1,
  dbActiveCount: 1,
  weeklyHoursCap: '20-25 hrs/week',
  label: 'Active Retainer Slots: 1 / 4 Available',
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState<boolean>(false);
  const [capacity, setCapacity] = useState<CapacitySummary>(DEFAULT_CAPACITY);

  const refreshCapacity = useCallback(async () => {
    try {
      const resp = await fetch('/api/capacity');
      if (resp.ok) {
        const data = await resp.json();
        setCapacity(data);
      }
    } catch {
      // Retain graceful default if offline
    }
  }, []);

  const refreshWorkspace = useCallback(
    async (tokenOverride?: string | null) => {
      const activeToken = tokenOverride ?? idToken;
      if (!activeToken) return;
      setLoadingWorkspace(true);
      try {
        const resp = await fetch('/api/workspace', {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
        });
        if (resp.ok) {
          const data = await resp.json();
          setWorkspace({
            client: data.client,
            audit: data.audit,
            retainer: data.retainer,
            complianceMetrics: data.complianceMetrics || [],
            adrs: data.adrs || [],
            syncAgendas: data.syncAgendas || [],
          });
          if (data.capacity) {
            setCapacity(data.capacity);
          }
        }
      } catch (err) {
        console.warn('Workspace refresh deferred (offline fallback active):', err);
      } finally {
        setLoadingWorkspace(false);
      }
    },
    [idToken]
  );

  useEffect(() => {
    refreshCapacity();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setIdToken(token);
          await refreshWorkspace(token);
        } catch {
          setIdToken(null);
        }
      } else {
        setIdToken(null);
        setWorkspace(null);
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, [refreshCapacity, refreshWorkspace]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      await refreshWorkspace(token);
    } catch (err: any) {
      const msg = err?.message || 'Unable to sign in with Google.';
      setAuthError(msg);
      throw err;
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
    setIdToken(null);
    setWorkspace(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        loadingAuth,
        authError,
        workspace,
        loadingWorkspace,
        capacity,
        signInWithGoogle,
        signOutUser,
        refreshWorkspace,
        refreshCapacity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
