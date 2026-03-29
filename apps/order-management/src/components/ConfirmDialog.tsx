import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, description, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground border border-border rounded-md hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs uppercase tracking-wider text-foreground bg-destructive rounded-md hover:bg-destructive/80 transition-colors"
          >
            Confirmar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
