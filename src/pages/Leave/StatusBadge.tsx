type Props = {
  status: string;
};

export function LeaveStatusBadge({ status }: Props) {
  const map: Record<
    string,
    { label: string; className: string }
  > = {
    PENDING_TL: {
      label: "Pending – TL",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    PENDING_HR: {
      label: "Pending – HR",
      className: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    APPROVED: {
      label: "Approved",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    REJECTED_TL: {
      label: "Rejected – TL",
      className: "bg-red-50 text-red-700 border-red-200",
    },
  };

  const config = map[status] || {
    label: status.replace("_", " "),
    className: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  );
}
