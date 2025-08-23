import React, {createContext, ReactNode, useContext, useState} from 'react';

type SiteTabJumpContextType = {
  nextSiteTab: string | null;
  setNextSiteTab: (tab: string | null) => void;
};

// Create the context (null initially)
const SiteTabJumpContext = createContext<SiteTabJumpContextType | null>(null);

// Provider component
export function SiteTabJumpProvider({children}: {children: ReactNode}) {
  const [nextSiteTab, setNextSiteTab] = useState<string | null>(null);

  return (
    <SiteTabJumpContext.Provider value={{nextSiteTab, setNextSiteTab}}>
      {children}
    </SiteTabJumpContext.Provider>
  );
}

// A convenience hook so you don’t repeat `useContext`
export function useSiteTabJumpContext() {
  const ctx = useContext(SiteTabJumpContext);
  if (!ctx) {
    throw new Error(
      'useSiteTabJumpContext must be used inside a SiteTabJumpContext',
    );
  }
  return ctx;
}
