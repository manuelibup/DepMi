import styles from "./page.module.css";
import React from 'react';

export default function Home() {
  return (
    <main className={styles.main}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}></span>
          <h1>DepMi</h1>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn}>🔍</button>
          <button className={styles.iconBtn}>🔔</button>
        </div>
      </header>

      {/* Quick Filters */}
      <nav className={styles.filtersWrapper}>
        <div className={styles.filtersScroll}>
          <button className={`${styles.filterChip} ${styles.active}`}>For You</button>
          <button className={styles.filterChip}>Demand Engine</button>
          <button className={styles.filterChip}>Following</button>
          <button className={styles.filterChip}>Fashion</button>
          <button className={styles.filterChip}>Gadgets</button>
        </div>
      </nav>

      {/* Feed Area */}
      <div className={styles.feedContainer}>

        {/* Demand Request Card (The Killer Feature) */}
        <article className={styles.demandCard}>
          <div className={styles.demandHeader}>
            <div className={styles.userInfo}>
              <div className={styles.avatar}>ID</div>
              <div>
                <p className={styles.userName}>Imaobong D.</p>
                <p className={styles.timeAgo}>Looking for • 2h ago</p>
              </div>
            </div>
            <span className={styles.demandBadge}>Demand</span>
          </div>
          <p className={styles.demandText}>
            I need a fairly used iPhone 13 Pro Max (128GB). Direct UK used, battery health above 85%. Uyo region only.
          </p>
          <div className={styles.demandBudget}>
            <span>Budget:</span>
            <strong>₦650,000</strong>
          </div>
          <div className={styles.cardActions}>
            <button className={styles.bidBtn}>Bid as Vendor</button>
            <button className={styles.shareBtn}>Share</button>
          </div>
        </article>

        {/* Regular Product Listing */}
        <article className={styles.productCard}>
          <div className={styles.productHeader}>
            <div className={styles.userInfo}>
              <div className={styles.storeAvatar}>K</div>
              <div>
                <p className={styles.userName}>KicksBySam</p>
                <div className={styles.trustBadge}>
                  <span>⭐</span> 450 Deps
                </div>
              </div>
            </div>
          </div>
          <div className={styles.imagePlaceholder}>
            {/* Placeholder for Product Image */}
            <span className={styles.imageIcon}>�</span>
          </div>
          <div className={styles.productInfo}>
            <div className={styles.titleRow}>
              <h3 className={styles.productTitle}>Nike Air Jordan 1 Retro High</h3>
              <p className={styles.productPrice}>₦85,000</p>
            </div>
            <p className={styles.location}>📍 Uyo, Akwa Ibom</p>
          </div>
          <div className={styles.cardActions}>
            <button className={styles.buyBtn}>Buy via Escrow</button>
            <button className={styles.chatBtn}>💬 Chat</button>
          </div>
        </article>

      </div>

      {/* Bottom Navigation */}
      <nav className={styles.bottomNav}>
        <div className={`${styles.navItem} ${styles.active}`}>
          <span className={styles.navIcon}>🏠</span>
        </div>
        <div className={styles.navItem}>
          <span className={styles.navIcon}>�</span>
        </div>
        <div className={styles.navActionWrap}>
          <button className={styles.addBtn}>+</button>
        </div>
        <div className={styles.navItem}>
          <span className={styles.navIcon}>�</span>
        </div>
        <div className={styles.navItem}>
          <span className={styles.navIcon}>👤</span>
        </div>
      </nav>
    </main>
  );
}
