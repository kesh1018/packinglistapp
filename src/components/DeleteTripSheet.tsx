import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet';
import { DragToConfirm } from './ui/DragToConfirm';

export function DeleteTripSheet({
  open,
  onOpenChange,
  tripName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tripName: string;
  onConfirm: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-[var(--bg)] border-[var(--border)]">
        <SheetHeader>
          <SheetTitle>Delete trip to {tripName}?</SheetTitle>
          <SheetDescription>The trip and its packing list will be removed from this device.</SheetDescription>
        </SheetHeader>
        <SheetBody className="safe-bottom flex justify-center pb-8 pt-4">
          <DragToConfirm
            actionType="delete"
            size="lg"
            label="Slide to delete trip"
            confirmedLabel="Deleted"
            autoResetDelay={0}
            onConfirm={() => setTimeout(onConfirm, 450)}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
