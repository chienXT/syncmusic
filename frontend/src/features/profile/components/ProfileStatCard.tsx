type ProfileStatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
};

export default function ProfileStatCard({ icon, label, value, accent }: ProfileStatCardProps) {
  return (
    <div className={`profile-stat profile-stat--${accent}`}>
      <div className="profile-stat-icon">{icon}</div>
      <div>
        <div className="profile-stat-value">{value}</div>
        <div className="profile-stat-label">{label}</div>
      </div>
    </div>
  );
}
