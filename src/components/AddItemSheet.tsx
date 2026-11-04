import { useEffect, useMemo, useState } from 'react';
import { History, Plus, StickyNote } from 'lucide-react';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet';
import { Input, Switch } from './ui/Form';
import { Button } from './ui/Button';
import { Chip, Eyebrow, QtyStepper } from './bits';
import { CATEGORY_ORDER, type AlwaysItem, type Category } from '../lib/types';

export interface NewItem {
  name: string;
  category: Category;
  qty: number;
  always: boolean;
  note?: string;
}

export function AddItemSheet({
  open,
  onOpenChange,
  onAdd,
  history,
  existingNames,
  title = 'Add your own item',
  description = 'Anything we missed — it stays on this trip’s list.',
  showAlways = true,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (item: NewItem) => void;
  /** Items added on earlier trips, offered as quick picks. */
  history: AlwaysItem[];
  existingNames: string[];
  title?: string;
  description?: string;
  showAlways?: boolean;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [qty, setQty] = useState(1);
  const [always, setAlways] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setNote('');
      setQty(1);
      setCategory('Other');
      setAlways(!showAlways);
    }
  }, [open, showAlways]);

  const suggestions = useMemo(() => {
    const have = new Set(existingNames.map((n) => n.toLowerCase()));
    const q = name.trim().toLowerCase();
    return history.filter((h) => !have.has(h.name.toLowerCase()) && (!q || h.name.toLowerCase().includes(q))).slice(0, 8);
  }, [history, existingNames, name]);

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    onAdd({ name: n, category, qty, always, note: note.trim() || undefined });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[var(--bg)] border-[var(--border)]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5 pb-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-center gap-2"
          >
            <Input
              autoFocus
              placeholder="e.g. Kindle, Board game, Gift for host"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 text-sm"
              maxLength={60}
            />
            <QtyStepper value={qty} onChange={setQty} />
          </form>
          <Input
            placeholder="Note (optional) — e.g. Borrow from Sam"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            leftIcon={<StickyNote className="size-4" />}
            className="h-10 text-sm"
            maxLength={200}
          />

          {suggestions.length > 0 && (
            <div className="space-y-2.5">
              <Eyebrow>You’ve packed before</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Chip
                    key={s.name}
                    icon={<History />}
                    onClick={() => {
                      setName(s.name);
                      setCategory(s.category);
                      setQty(s.qty);
                    }}
                  >
                    {s.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <Eyebrow>Category</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ORDER.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>

          {showAlways && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <Switch checked={always} onChange={setAlways} label="Always pack this" description="Add it to every new trip automatically" />
            </div>
          )}
        </SheetBody>
        <SheetFooter className="safe-bottom border-[var(--border)]">
          <Button fullWidth size="lg" leftIcon={<Plus className="size-4" />} onClick={submit} disabled={!name.trim()}>
            Add to list
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
