const ClientBadge: React.FC<{ mode: "online" | "protected" | "offline"  }> = ({ mode }) => {
  const m =
    mode
      ? { cls: "bg-green-100 text-green-700", label: "Online" }
      : mode
        ? { cls: "bg-amber-100 text-amber-700", label: "Online – Protected" }
        : { cls: "bg-red-100 text-red-700", label: "Offline" };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.cls}`}>{m.label}</span>;
};

export default ClientBadge;