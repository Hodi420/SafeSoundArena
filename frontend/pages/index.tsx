export default function Home() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', padding: '40px' }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '20px' }}>SafeSoundArena</h1>
      <p style={{ fontSize: '18px', color: '#999', marginBottom: '30px' }}>Welcome to SafeSoundArena - Your gaming platform</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#111', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
          <h2 style={{ color: '#3b82f6', marginBottom: '15px' }}>🗺️ Quests</h2>
          <p style={{ color: '#999' }}>Explore and complete quests</p>
          <button style={{ marginTop: '15px', backgroundColor: '#3b82f6', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Start Quest</button>
        </div>

        <div style={{ backgroundColor: '#111', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #a855f7' }}>
          <h2 style={{ color: '#a855f7', marginBottom: '15px' }}>🤖 AI Guide</h2>
          <p style={{ color: '#999' }}>Chat with AI assistant</p>
          <button style={{ marginTop: '15px', backgroundColor: '#a855f7', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Chat Now</button>
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#ec4899', marginBottom: '20px' }}>🏅 Honor Board</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ backgroundColor: '#111', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
              <p style={{ color: '#3b82f6', fontWeight: 'bold' }}>Player #{i}</p>
              <p style={{ color: '#666', fontSize: '12px' }}>+100 Pi</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px' }}>
        <a href="/dashboard" style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '12px 24px', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>Dashboard</a>
        <a href="/about" style={{ backgroundColor: '#a855f7', color: '#fff', padding: '12px 24px', textDecoration: 'none', borderRadius: '4px', fontWeight: 'bold' }}>About</a>
      </div>
    </div>
  );
}
