import "../styles/company.css";

const Company = () => {
  return (
    <div className="cf-dashboard">
      {/* Breadcrumbs */}
      <div className="cf-breadcrumbs">
        <span>Companies</span> &gt; <span className="active">Codeforces</span>
      </div>

      {/* Header Section */}
      <header className="cf-header">
        <div className="cf-header-main">
          <div className="cf-logo">
            <h2>cf</h2>
          </div>
          <div className="cf-title-info">
            <div className="cf-title-row">
              <h1>Codeforces</h1>
              <span className="cf-verified">✔</span>
            </div>
            <p className="cf-tagline">
              Empowering competitive programmers worldwide
            </p>
            <div className="cf-meta-links">
              <span>📍 Saint Petersburg, Russia</span>
              <a href="https://codeforces.com" target="_blank" rel="noreferrer">
                🌐 https://codeforces.com
              </a>
              <span>⏱ Founded 2010</span>
            </div>
          </div>
        </div>
        <div className="cf-header-actions">
          <button className="btn-outline">🔖 Follow</button>
          <button className="btn-primary">Visit Website ↗</button>
        </div>
      </header>

      {/* Stats Section */}
      <section className="cf-stats-grid">
        <div className="cf-stat-card">
          <div className="cf-stat-icon purple-bg">🏆</div>
          <div className="cf-stat-content">
            <span className="cf-stat-label">Contests Hosted</span>
            <span className="cf-stat-value">1,248</span>
            <span className="cf-stat-sub">Total Contests</span>
          </div>
        </div>
        <div className="cf-stat-card">
          <div className="cf-stat-icon green-bg">👥</div>
          <div className="cf-stat-content">
            <span className="cf-stat-label">Participants</span>
            <span className="cf-stat-value">2.3M+</span>
            <span className="cf-stat-sub">Total Participants</span>
          </div>
        </div>
        <div className="cf-stat-card">
          <div className="cf-stat-icon orange-bg">⟠</div>
          <div className="cf-stat-content">
            <span className="cf-stat-label">Problems</span>
            <span className="cf-stat-value">12.5K+</span>
            <span className="cf-stat-sub">Total Problems</span>
          </div>
        </div>
        <div className="cf-stat-card">
          <div className="cf-stat-icon blue-bg">🏅</div>
          <div className="cf-stat-content">
            <span className="cf-stat-label">Rank</span>
            <span className="cf-stat-value">#1</span>
            <span className="cf-stat-sub">Global Rank</span>
          </div>
        </div>
        <div className="cf-stat-card">
          <div className="cf-stat-icon red-bg">📈</div>
          <div className="cf-stat-content">
            <span className="cf-stat-label">Rating Range</span>
            <span className="cf-stat-value">800 - 3500+</span>
            <span className="cf-stat-sub">Supported</span>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <nav className="cf-tabs">
        <a href="#about" className="cf-tab active">
          About
        </a>
        <a href="#contests" className="cf-tab">
          Contests
        </a>
        <a href="#problems" className="cf-tab">
          Problems
        </a>
        <a href="#jobs" className="cf-tab">
          Jobs
        </a>
        <a href="#performers" className="cf-tab">
          Top Performers
        </a>
        <a href="#interviews" className="cf-tab">
          Interviews
        </a>
      </nav>

      {/* Main Content Layout */}
      <main className="cf-main-layout">
        {/* Left Column: About */}
        <section className="cf-card cf-about-section">
          <h3>About Codeforces</h3>
          <p>
            Codeforces is a competitive programming platform that hosts
            algorithmic contests online.
          </p>
          <p>
            It was created by Mike Mirzayanov and is now run by a team of
            developers.
          </p>
          <p>
            Our mission is to provide a platform for programmers to improve
            their skills and compete with worldwide...
          </p>
          <div className="cf-tags">
            <span className="cf-tag">Competitive Programming</span>
            <span className="cf-tag">Online Judge</span>
            <span className="cf-tag">Contests</span>
            <span className="cf-tag">Education</span>
          </div>
        </section>

        {/* Middle Column: Contests */}
        <section className="cf-card cf-contests-section">
          <div className="cf-card-header">
            <h3>Open Contests</h3>
            <a href="#viewall" className="cf-view-all">
              View all
            </a>
          </div>
          <div className="cf-list">
            <div className="cf-list-item">
              <div className="cf-item-icon purple-bg">⚔️</div>
              <div className="cf-item-info">
                <h4>Codeforces Round 945 (Div. 2)</h4>
                <p>May 25, 2024 • 17:35 IST</p>
              </div>
              <div className="cf-item-meta">
                <span>In 2 days</span>
                <span className="cf-muted">1,521 Registered</span>
              </div>
            </div>
            <div className="cf-list-item">
              <div className="cf-item-icon green-bg">{"</>"}</div>
              <div className="cf-item-info">
                <h4>Codeforces Round 945 (Div. 1)</h4>
                <p>May 25, 2024 • 20:35 IST</p>
              </div>
              <div className="cf-item-meta">
                <span>In 2 days</span>
                <span className="cf-muted">981 Registered</span>
              </div>
            </div>
            <div className="cf-list-item">
              <div className="cf-item-icon red-bg">🎯</div>
              <div className="cf-item-info">
                <h4>Codeforces Round 944 (Div. 2)</h4>
                <p>May 18, 2024 • 17:35 IST</p>
              </div>
              <div className="cf-item-meta">
                <span className="cf-success">Completed</span>
                <span className="cf-muted">12,341 Participated</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Performers & Jobs */}
        <div className="cf-right-column">
          <section className="cf-card cf-performers-section">
            <div className="cf-card-header">
              <h3>Top Performers</h3>
              <a href="#viewall" className="cf-view-all">
                View all
              </a>
            </div>
            <div className="cf-list slim-list">
              {[
                { rank: "🥇", name: "tourist", rating: 3897, flag: "🇷🇺" },
                { rank: "🥈", name: "Um_nik", rating: 3781, flag: "🇷🇺" },
                { rank: "🥉", name: "Benq", rating: 3678, flag: "🇵🇱" },
                { rank: "4", name: "Jerry", rating: 3645, flag: "🇨🇳" },
                { rank: "5", name: "maskray", rating: 3612, flag: "🇨🇳" },
              ].map((user, idx) => (
                <div className="cf-performer-item" key={idx}>
                  <span className="cf-rank">{user.rank}</span>
                  <div className="cf-avatar"></div>
                  <div className="cf-performer-info">
                    <h4>{user.name}</h4>
                    <p>Rating: {user.rating}</p>
                  </div>
                  <span className="cf-flag">{user.flag}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="cf-card cf-jobs-section">
            <div className="cf-card-header">
              <h3>Jobs at Codeforces</h3>
              <a href="#viewall" className="cf-view-all">
                View all
              </a>
            </div>
            <div className="cf-list">
              <div className="cf-job-item">
                <div className="cf-job-icon">💼</div>
                <div className="cf-job-info">
                  <h4>Backend Developer</h4>
                  <p>Saint Petersburg, Russia • Full-time</p>
                </div>
                <span className="cf-arrow">&gt;</span>
              </div>
              <div className="cf-job-item">
                <div className="cf-job-icon">💻</div>
                <div className="cf-job-info">
                  <h4>Frontend Developer</h4>
                  <p>Remote • Full-time</p>
                </div>
                <span className="cf-arrow">&gt;</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Company;
