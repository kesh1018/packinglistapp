import { Trash2 } from 'lucide-react';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet';
import { Switch, Textarea } from './ui/Form';
import { Button } from './ui/Button';
import type { PackItem } from '../lib/types';

export function ItemActionsSheet({
  item,
  onClose,
  onPatch,
  onRemove,
  alwaysPack,
  onToggleAlways,
}: {
  item: PackItem | null;
  onClose: () => void;
  onPatch: (patch: Partial<PackItem>) => void;
  onRemove: () => void;
  alwaysPack: boolean;
  onToggleAlways: (on: boolean) => void;
}) {
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-[var(--bg)] border-[var(--border)]">
        {item && (
          <>
            <SheetHeader>
              <SheetTitle>{item.name}</SheetTitle>
              <SheetDescription>
                {item.category}
                {item.reason ? ` · ${item.reason}` : ''}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4 pb-4">
              <div className="space-y-2">
                <label htmlFor="item-note" className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  Note
                </label>
                <Textarea
                  id="item-note"
                  value={item.note ?? ''}
                  onChange={(e) => onPatch({ note: e.target.value || undefined })}
                  placeholder="e.g. Borrow from Sam · In the blue packing cube · Size M"
                  maxLength={200}
                  className="min-h-[72px] text-sm"
                />
              </div>
              <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <Switch
                  className="p-4"
                  checked={!!item.essential}
                  onChange={(v) => onPatch({ essential: v })}
                  label="Essential"
                  description="Starred, and named in the reminder the evening before you leave"
                />
                <Switch
                  className="p-4"
                  checked={!!item.toBuy}
                  onChange={(v) => onPatch({ toBuy: v, ...(v ? { packed: false } : {}) })}
                  label="Need to buy"
                  description="Adds it to this trip’s shopping list"
                />
                <Switch
                  className="p-4"
                  checked={!!item.consumable}
                  onChange={(v) => onPatch({ consumable: v })}
                  label="Used up on the trip"
                  description="Hidden when you repack for the way home"
                />
                <Switch
                  className="p-4"
                  checked={alwaysPack}
                  onChange={onToggleAlways}
                  label="Always pack"
                  description="Add this item to every new trip"
                />
              </div>
            </SheetBody>
            <SheetFooter className="safe-bottom border-[var(--border)]">
              <Button
                variant="destructive"
                fullWidth
                size="lg"
                leftIcon={<Trash2 className="size-4" />}
                onClick={() => {
                  onRemove();
                  onClose();
                }}
              >
                Remove from list
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
