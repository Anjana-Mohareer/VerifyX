export default function StatCard({ label, value, icon, trend }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>

      <p className="stat-label">{label}</p>

      <h2 className="stat-value">{value}</h2>

      <small className="stat-trend">{trend}</small>
    </div>
  );
}