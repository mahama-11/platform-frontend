import { create } from 'zustand'

export type ToastTone = 'info' | 'success' | 'error'

export interface ToastItem {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

interface ToastState {
  items: ToastItem[]
  push: (toast: Omit<ToastItem, 'id'>) => void
  remove: (id: string) => void
}

const timeoutMs = 3800

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: toast => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    set({ items: [...get().items, { id, ...toast }] })
    window.setTimeout(() => {
      get().remove(id)
    }, timeoutMs)
  },
  remove: id => set({ items: get().items.filter(item => item.id !== id) }),
}))
