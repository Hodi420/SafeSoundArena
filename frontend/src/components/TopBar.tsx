import React, { useState } from 'react';
import styles from './TopBar.module.css';
import { IconButton } from './IconButton';

const NAV_LABELS = ['Dashboard', 'Bots', 'Marketplace', 'Settings'];

export function TopBar({
  active = 'Dashboard',
  onNav = () => {},
  onProfile = () => {},
  onThemeToggle = () => {},
  onNotifications = () => {},
  onSearch = () => {},
  notificationCount = 0,
  avatarUrl = '',
  isDark = false,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <header className={styles.topBar}>
      <button className={styles.hamburger} aria-label="Open navigation" onClick={() => setShowMenu(!showMenu)}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><rect y="6" width="28" height="3" rx="1.5" fill="#fff"/><rect y="13" width="28" height="3" rx="1.5" fill="#fff"/><rect y="20" width="28" height="3" rx="1.5" fill="#fff"/></svg>
      </button>
      <span className={styles.logo}>SafeSoundArena</span>
      <nav className={styles.navLabels} aria-label="Main navigation">
        {NAV_LABELS.map(label => (
          <button
            key={label}
            className={`${styles.label} ${active === label ? styles.labelActive : ''}`}
            onClick={() => onNav(label)}
            aria-current={active === label ? 'page' : undefined}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className={styles.spacer} />
      <input
        className={styles.search}
        type="search"
        placeholder="Search..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSearch(search);
        }}
        aria-label="Search"
      />
      <div className={styles.actions}>
        <IconButton
          ariaLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onThemeToggle}
        >
          {isDark ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2"/><path d="M11 3v2M11 17v2M4.93 4.93l1.41 1.41M15.66 15.66l1.41 1.41M3 11h2M17 11h2M4.93 17.07l1.41-1.41M15.66 6.34l1.41-1.41" stroke="#fff" strokeWidth="1.4"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2"/><path d="M11 3v2M11 17v2M4.93 4.93l1.41 1.41M15.66 15.66l1.41 1.41M3 11h2M17 11h2M4.93 17.07l1.41-1.41M15.66 6.34l1.41-1.41" stroke="#fff" strokeWidth="1.4"/></svg>
          )}
        </IconButton>
        <div style={{ position: 'relative' }}>
          <IconButton
            ariaLabel="Notifications"
            title="Notifications"
            onClick={onNotifications}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 19c1.66 0 3-1.34 3-3H8c0 1.66 1.34 3 3 3Z" fill="#fff"/><path d="M18 16v-5a7 7 0 0 0-14 0v5l-2 2v1h18v-1l-2-2Z" stroke="#fff" strokeWidth="1.5"/></svg>
            {notificationCount > 0 && <span className={styles.badge}>{notificationCount}</span>}
          </IconButton>
        </div>
        <IconButton
          ariaLabel="Quick Actions"
          title="Quick Actions"
          onClick={() => alert('Quick Actions!')}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8.5" stroke="#fff" strokeWidth="2"/><path d="M11 6v5l3 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>
        </IconButton>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className={styles.avatar}
            onClick={onProfile}
          />
        ) : (
          <IconButton
            ariaLabel="Profile"
            title="Profile"
            onClick={onProfile}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none"><circle cx="13" cy="13" r="12" stroke="#fff" strokeWidth="2"/><circle cx="13" cy="11" r="4" fill="#fff" opacity="0.9"/><ellipse cx="13" cy="19" rx="6" ry="3" fill="#fff" opacity="0.6"/></svg>
          </IconButton>
        )}
      </div>
    </header>
  );
}
