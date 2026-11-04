import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/Button';
import { AddItemSheet } from './AddItemSheet';
import type { AlwaysItem } from '../lib/types';

/** Manage the items that get added to every new trip. */
export function AlwaysPackSheet({
  open,
  onOpenChange,
  items,
  history,
  onChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: AlwaysItem[];
  history: AlwaysItem[];
  onChange: (items: AlwaysItem[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="bg-[var(--bg)] border-[var(--border)]">
          <SheetHeader>
            <SheetTitle>Always-pack list</SheetTitle>
            <SheetDescription>These items are added to every new trip, on top of our suggestions.</SheetDescription>
          </SheetHeader>
          <SheetBody className="pb-4">
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs leading-relaxed text-[var(--text-muted)]">
                Nothing here yet. Add things you take on every trip — your favourite pillow, a Kindle, contact lenses.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <AnimatePresence initial={false}>
                  {items.map((it) => (
                    <motion.div
                      key={it.name}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm">{it.name}</div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {it.category}
                            {it.qty > 1 ? ` · ×${it.qty}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${it.name} from always-pack list`}
                          onClick={() => onChange(items.filter((x) => x.name !== it.name))}
                          className="grid size-7 place-items-center rounded-md text-[var(--text-subtle)] hover:text-rose-400 focus-ring"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </SheetBody>
          <SheetFooter className="safe-bottom border-[var(--border)]">
            <Button fullWidth size="lg" variant="secondary" leftIcon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
              Add an item
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <AddItemSheet
        open={adding}
        onOpenChange={setAdding}
        title="Always pack"
        description="Added to every new trip you create."
        showAlways={false}
        history={history}
        existingNames={items.map((i) => i.name)}
        onAdd={(n) => onChange([...items.filter((x) => x.name.toLowerCase() !== n.name.toLowerCase()), { name: n.name, category: n.category, qty: n.qty }])}
      />
    </>
  );
}
