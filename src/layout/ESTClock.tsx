import { useEffect, useState } from "react";

export default function ESTClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
      }).format(now);

      setTime(formatted);
    };

    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="hidden md:block text-xs font-mono text-muted-foreground">
      {time} EST
    </span>
  );
}
