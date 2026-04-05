import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Factory, Truck, Package, Activity, UserCircle } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/steel',     label: '共享钢构', icon: Factory },
  { path: '/concrete',  label: '共享商砼', icon: Truck },
  { path: '/materials', label: '共享建材', icon: Package },
  { path: '/tracking',  label: '订单追踪', icon: Activity },
  { path: '/profile',   label: '我的',     icon: UserCircle },
];

const PAGE_TITLES = {
  '/steel':     { title: '共享钢构',   sub: '99钢结构共享工厂' },
  '/concrete':  { title: '郑州商砼拼单', sub: '本周额度实时更新' },
  '/materials': { title: '共享建材',   sub: '组团采购，现金拼价' },
  '/tracking':  { title: '订货跟踪大屏', sub: '全链路实时状态' },
  '/profile':   { title: '个人中心',   sub: '账户与服务管理' },
};

const MobileLayout = () => {
  const location = useLocation();
  const pageMeta = PAGE_TITLES[location.pathname] || { title: '共享平台', sub: '' };

  return (
    <div className="app-shell">
      {/* ── Top Navigation Bar ── */}
      <header className="top-nav">
        <div className="top-nav-inner">
          <div className="brand">
            <div className="brand-icon">99</div>
            <div className="brand-text">
              <span className="brand-name">共享平台</span>
              <span className="brand-sub">共享资源，把握机遇</span>
            </div>
          </div>
          <div className="page-meta">
            <span className="page-meta-title">{pageMeta.title}</span>
            <span className="page-meta-sub">{pageMeta.sub}</span>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="page-content">
        <Outlet />
      </main>

      {/* ── Bottom Tab Bar (mobile feel) ── */}
      <nav className="bottom-tab-bar">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  <div className="tab-icon-wrap">
                    {isActive && <div className="tab-active-bg" />}
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileLayout;
