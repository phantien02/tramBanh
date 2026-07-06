# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai giao diện mới "Premium Dark/Gold" cho dự án Trạm Bánh với cấu trúc Hybrid Layout và phong cách Glassmorphism.

**Architecture:** Sử dụng Tailwind v4 `@theme` trong `globals.css` để thiết lập Design Tokens. Viết lại cấu trúc điều hướng trong `AppShell` theo role người dùng. Áp dụng utility classes của Tailwind để tạo hiệu ứng Glassmorphism trên các thẻ và thành phần UI.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS 4.

---

### Task 1: Setup Global CSS & Theme Tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write tests (if applicable)**
*(Note: Không có unit test cho global CSS, ta sẽ verify UI render sau cùng).*

- [ ] **Step 2: Cập nhật `globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-gold-400: #FACC15;
  --color-gold-500: #EAB308;
  --color-gold-600: #CA8A04;
  
  --color-dark-bg: #0f0f0f;
  --color-dark-surface: rgba(30, 30, 30, 0.6);
  --color-dark-border: rgba(255, 255, 255, 0.1);
  
  --shadow-glow: 0 4px 20px rgba(234, 179, 8, 0.15);
  
  --font-sans: 'Inter', 'Outfit', sans-serif;
}

@layer base {
  body {
    @apply bg-[var(--color-dark-bg)] text-gray-200 font-sans min-h-screen antialiased;
  }
}

.glass-panel {
  @apply bg-[var(--color-dark-surface)] backdrop-blur-md border border-[var(--color-dark-border)] shadow-xl rounded-2xl;
}

.glass-card {
  @apply glass-panel hover:shadow-[var(--shadow-glow)] transition-all duration-300;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: define theme tokens and glassmorphism utilities"
```

### Task 2: Update AppShell Component (Hybrid Layout)

**Files:**
- Modify: `src/components/AppShell.tsx`
- Modify: `src/lib/auth.ts` (nếu cần lấy session role, nhưng ở đây proxy/middleware hoặc page pass role xuống). Ta sẽ sửa trực tiếp AppShell để đọc role từ prop hoặc context. AppShell nhận children và có thể cần biết url hiện tại (dùng `usePathname`).

- [ ] **Step 1: Implement Hybrid Layout trong AppShell**

```tsx
// src/components/AppShell.tsx (ví dụ cấu trúc mới)
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isQuanLy = pathname?.startsWith("/quanly");

  if (isQuanLy) {
    return (
      <div className="flex min-h-screen bg-[var(--color-dark-bg)]">
        {/* Sidebar */}
        <aside className="w-64 glass-panel m-4 flex flex-col rounded-2xl overflow-hidden sticky top-4 h-[calc(100vh-2rem)]">
          <div className="p-6 border-b border-[var(--color-dark-border)]">
            <h1 className="text-2xl font-bold text-gold-400">Trạm Bánh</h1>
            <p className="text-xs text-gray-400">Quản lý Admin</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link href="/quanly" className="block p-3 rounded-xl hover:bg-white/5 transition-colors">Thống kê</Link>
            <Link href="/quanly/don" className="block p-3 rounded-xl hover:bg-white/5 transition-colors">Đơn hàng</Link>
            <Link href="/quanly/banh" className="block p-3 rounded-xl hover:bg-white/5 transition-colors">Sản phẩm</Link>
            <Link href="/quanly/nhan-vien" className="block p-3 rounded-xl hover:bg-white/5 transition-colors">Nhân viên</Link>
          </nav>
          <div className="p-4 border-t border-[var(--color-dark-border)]">
            <Link href="/api/logout" className="text-red-400 text-sm p-2">Đăng xuất</Link>
          </div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 p-4 pl-0">
          <div className="glass-panel min-h-full p-6">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Top Header cho Quầy / Bếp
  return (
    <div className="min-h-screen bg-[var(--color-dark-bg)] flex flex-col">
      <header className="glass-panel mx-4 mt-4 mb-6 rounded-2xl flex items-center justify-between p-4 px-6 sticky top-4 z-50">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-bold text-gold-400">Trạm Bánh</h1>
          <nav className="flex items-center gap-4">
            <Link href="/quay" className="px-4 py-2 rounded-xl hover:bg-white/5 transition-colors font-medium">Quầy</Link>
            <Link href="/bep" className="px-4 py-2 rounded-xl hover:bg-white/5 transition-colors font-medium">Bếp</Link>
          </nav>
        </div>
        <Link href="/api/logout" className="text-red-400 text-sm p-2 hover:bg-red-500/10 rounded-lg transition-colors">Đăng xuất</Link>
      </header>
      <main className="flex-1 px-4 pb-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppShell.tsx
git commit -m "feat: implement hybrid layout with glassmorphism in AppShell"
```

### Task 3: Refactor OrderCard Component

**Files:**
- Modify: `src/components/OrderCard.tsx`

- [ ] **Step 1: Áp dụng class `glass-card` cho OrderCard**

```tsx
// Trong src/components/OrderCard.tsx
// Thay thế container div hiện tại bằng kiểu glass-card
export default function OrderCard({ order }: { order: OrderType }) {
  return (
    <div className="glass-card p-5 group cursor-pointer relative overflow-hidden">
      {/* Góc viền accent color để trang trí */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gold-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gold-400">#{order.id}</h3>
        <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-gray-300">
          {order.status}
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-4">{order.customerName}</p>
      {/* ... rendering chi tiết bánh ... */}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/OrderCard.tsx
git commit -m "style: apply premium dark style to OrderCard"
```

### Task 4: Refactor Login Page

**Files:**
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Áp dụng style mới cho trang Login**

```tsx
// src/app/login/page.tsx
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-dark-bg)] p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="glass-panel w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold-400 mb-2">Trạm Bánh</h1>
          <p className="text-gray-400">Đăng nhập hệ thống</p>
        </div>
        <form className="space-y-6">
           {/* Inputs */}
           <div>
             <input type="text" placeholder="Tên đăng nhập" 
               className="w-full bg-black/30 border border-[var(--color-dark-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500 transition-colors" />
           </div>
           <div>
             <input type="password" placeholder="Mật khẩu" 
               className="w-full bg-black/30 border border-[var(--color-dark-border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500 transition-colors" />
           </div>
           <button type="submit" 
             className="w-full bg-gradient-to-r from-gold-600 to-gold-400 text-black font-semibold py-3 rounded-xl hover:shadow-[var(--shadow-glow)] hover:-translate-y-0.5 transition-all duration-300">
             Đăng nhập
           </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "style: update login page to premium dark style"
```

### Task 5: Refactor OrderDetail & OrderForm

**Files:**
- Modify: `src/components/OrderDetail.tsx`
- Modify: `src/components/OrderForm.tsx`

- [ ] **Step 1: Update form/detail components**
Cập nhật các form input và hiển thị chi tiết sử dụng style từ Login Page và cấu trúc `glass-panel`.
*(Chi tiết code sẽ được subagent triển khai dựa trên cấu trúc fields có sẵn của components).*

- [ ] **Step 2: Commit**

```bash
git add src/components/OrderDetail.tsx src/components/OrderForm.tsx
git commit -m "style: update forms and details to premium dark style"
```
