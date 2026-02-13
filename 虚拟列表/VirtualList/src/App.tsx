import { useMemo } from "react";
import { VirtualList } from "./component/VirtualList";
import type { VirtualListItem } from "./component/VirtualList";

type Item = VirtualListItem & { extra?: string };

export default function App() {
  const data = useMemo<Item[]>(() => {
    return Array.from({ length: 10000 }).map((_, idx) => ({
      uid: idx,
      value: `Item-${idx + 1}`,
      extra: `extra info ${idx + 1}`,
    }));
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>TS + React Virtual List</h2>

      <VirtualList<Item>
        listData={data}
        itemSize={50}
        height={500}
        overscan={3}
        renderItem={(item, index) => (
          <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
            <span>
              {index + 1}. {item.value}
            </span>
            <span style={{ opacity: 0.6, fontSize: 12 }}>{item.extra}</span>
          </div>
        )}
      />
    </div>
  );
}

