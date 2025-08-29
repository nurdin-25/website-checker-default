const ServerBadge: React.FC<{ status: boolean }> = ({ status }) => (
  <span
    className={`px-2 py-1 rounded-full text-xs font-medium ${
      status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`}
  >
    {status ? "Online" : "Offline"}
  </span>
);

export default ServerBadge;