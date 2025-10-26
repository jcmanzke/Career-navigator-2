import { useRef } from "react";

export function DraggableList<T>({
  items,
  setItems,
  render,
  itemKey,
}: {
  items: T[];
  setItems: (items: T[]) => void;
  render: (item: T, index: number) => React.ReactNode;
  itemKey: (item: T) => string;
}) {
  const dragIndex = useRef<number | null>(null);

  return (
    <ul className="divide-y divide-accent-700 rounded-xl border border-accent-700 bg-neutrals-0">
      {items.map((item, index) => (
        <li
          key={itemKey(item)}
          draggable
          onDragStart={() => {
            dragIndex.current = index;
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const from = dragIndex.current;
            const to = index;
            if (from === null || to === null || from === to) return;
            const next = items.slice();
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            setItems(next);
            dragIndex.current = null;
          }}
          className="flex items-center gap-3 p-3 hover:bg-neutrals-50"
        >
          <span className="cursor-move text-neutrals-400">↕</span>
          {render(item, index)}
        </li>
      ))}
    </ul>
  );
}
