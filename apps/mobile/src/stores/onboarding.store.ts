import { create } from 'zustand';

interface OnboardingState {
  selfieUri: string | null;
  selfieMime: string | undefined;
  tazkiraFrontUri: string | null;
  tazkiraFrontMime: string | undefined;
  tazkiraBackUri: string | null;
  tazkiraBackMime: string | undefined;
  setSelfie: (uri: string | null, mime?: string) => void;
  setTazkiraFront: (uri: string | null, mime?: string) => void;
  setTazkiraBack: (uri: string | null, mime?: string) => void;
  clear: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  selfieUri: null,
  selfieMime: undefined,
  tazkiraFrontUri: null,
  tazkiraFrontMime: undefined,
  tazkiraBackUri: null,
  tazkiraBackMime: undefined,
  setSelfie: (uri, mime) => set({ selfieUri: uri, selfieMime: mime }),
  setTazkiraFront: (uri, mime) => set({ tazkiraFrontUri: uri, tazkiraFrontMime: mime }),
  setTazkiraBack: (uri, mime) => set({ tazkiraBackUri: uri, tazkiraBackMime: mime }),
  clear: () =>
    set({
      selfieUri: null,
      selfieMime: undefined,
      tazkiraFrontUri: null,
      tazkiraFrontMime: undefined,
      tazkiraBackUri: null,
      tazkiraBackMime: undefined,
    }),
}));
