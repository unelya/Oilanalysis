import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NewCardPayload } from '@/types/kanban';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarCmp } from '@/components/ui/calendar';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useI18n } from '@/i18n';

interface NewCardDialogProps {
  onCreate: (payload: NewCardPayload) => void;
  existingSampleIds?: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewCardDialog({ onCreate, existingSampleIds = [], open, onOpenChange }: NewCardDialogProps) {
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const toDigits = (value: string) => value.replace(/\D/g, '');
  const storageFormatRegex = /^Fridge\s+[A-Za-z0-9]+\s*·\s*Bin\s+[A-Za-z0-9]+\s*·\s*Place\s+[A-Za-z0-9]+$/;
  const isValidStorageLocation = (value: string) => storageFormatRegex.test(value.trim());
  const formatStorageLocation = (parts: { fridge: string; bin: string; place: string }) =>
    `Fridge ${parts.fridge.trim()} · Bin ${parts.bin.trim()} · Place ${parts.place.trim()}`;
  const [form, setForm] = useState<NewCardPayload>({
    sampleId: '',
    wellId: '',
    horizon: '',
    samplingDate: today,
    arrivalDate: today,
    storageLocation: '',
  });
  const [storageParts, setStorageParts] = useState({ fridge: '', bin: '', place: '' });
  const [error, setError] = useState('');
  const [dateOpen, setDateOpen] = useState(false);
  const [arrivalDateOpen, setArrivalDateOpen] = useState(false);
  const isFutureSamplingDate = form.samplingDate > today;
  const isFutureArrivalDate = form.arrivalDate > today;
  const isArrivalBeforeSampling = Boolean(form.arrivalDate && form.samplingDate && form.arrivalDate < form.samplingDate);

  useEffect(() => {
    if (!dialogOpen) {
      setForm({ sampleId: '', wellId: '', horizon: '', samplingDate: today, arrivalDate: today, storageLocation: '' });
      setStorageParts({ fridge: '', bin: '', place: '' });
      setError('');
      setDateOpen(false);
      setArrivalDateOpen(false);
    }
  }, [dialogOpen, today]);

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

  const onChange = (field: keyof NewCardPayload) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = field === 'wellId' ? toDigits(event.target.value) : event.target.value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
    setError('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.sampleId || !form.wellId || !form.horizon || !form.samplingDate || !form.arrivalDate) {
      setError(t('board.newSampleDialog.errors.required'));
      return;
    }
    if (isFutureSamplingDate) {
      setError(t('board.newSampleDialog.errors.futureDate'));
      return;
    }
    if (isFutureArrivalDate) {
      setError(t('board.newSampleDialog.errors.futureArrivalDate'));
      return;
    }
    if (isArrivalBeforeSampling) {
      setError(t('board.newSampleDialog.errors.arrivalBeforeSampling'));
      return;
    }
    const normalized = form.sampleId.trim().toLowerCase();
    if (existingSampleIds.some((id) => id.trim().toLowerCase() === normalized)) {
      setError(t('board.newSampleDialog.errors.duplicateSampleId'));
      return;
    }
    let storageLocation = '';
    if (storageParts.fridge || storageParts.bin || storageParts.place) {
      if (!storageParts.fridge || !storageParts.bin || !storageParts.place) {
        setError(t('board.newSampleDialog.errors.fillStorageParts'));
        return;
      }
      storageLocation = formatStorageLocation(storageParts);
      if (!isValidStorageLocation(storageLocation)) {
        setError(t('board.newSampleDialog.errors.invalidStorageFormat'));
        return;
      }
    }
    onCreate({ ...form, storageLocation });
    setOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t("board.newSample")}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("board.newSampleDialog.title")}</DialogTitle>
          <DialogDescription>{t("board.newSampleDialog.description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="sampleId">{t("board.newSampleDialog.sampleId")}</Label>
            <Input id="sampleId" value={form.sampleId} onChange={onChange('sampleId')} className="field-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="wellId">{t("board.newSampleDialog.wellId")}</Label>
              <Input
                id="wellId"
                value={form.wellId}
                onChange={onChange('wellId')}
                inputMode="numeric"
                pattern="[0-9]*"
                className="field-muted"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="horizon">{t("board.newSampleDialog.horizon")}</Label>
              <Input id="horizon" value={form.horizon} onChange={onChange('horizon')} className="field-muted" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="samplingDate">{t("board.newSampleDialog.samplingDate")}</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal field-muted"
                  type="button"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {form.samplingDate || t("board.newSampleDialog.pickDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <CalendarCmp
                  mode="single"
                  selected={form.samplingDate ? new Date(form.samplingDate) : new Date()}
                  disabled={{ after: new Date() }}
                  onSelect={(date) => {
                    const next = date ? format(date, 'yyyy-MM-dd') : today;
                    setForm((prev) => ({ ...prev, samplingDate: next }));
                    setError('');
                    setDateOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label htmlFor="arrivalDate">{t("board.newSampleDialog.arrivalDate")}</Label>
            <Popover open={arrivalDateOpen} onOpenChange={setArrivalDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal field-muted"
                  type="button"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {form.arrivalDate || t("board.newSampleDialog.pickDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <CalendarCmp
                  mode="single"
                  selected={form.arrivalDate ? new Date(form.arrivalDate) : new Date()}
                  disabled={{ after: new Date() }}
                  onSelect={(date) => {
                    const next = date ? format(date, 'yyyy-MM-dd') : today;
                    setForm((prev) => ({ ...prev, arrivalDate: next }));
                    setError('');
                    setArrivalDateOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label>{t("board.newSampleDialog.storageLocation")}</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Input
                  value={storageParts.fridge}
                  onChange={(e) => setStorageParts((prev) => ({ ...prev, fridge: e.target.value }))}
                  placeholder="A1"
                  className="field-muted"
                />
                <p className="text-xs text-muted-foreground">{t("board.card.fridge")}</p>
              </div>
              <div className="space-y-1">
                <Input
                  value={storageParts.bin}
                  onChange={(e) => setStorageParts((prev) => ({ ...prev, bin: e.target.value }))}
                  placeholder="B2"
                  className="field-muted"
                />
                <p className="text-xs text-muted-foreground">{t("board.card.bin")}</p>
              </div>
              <div className="space-y-1">
                <Input
                  value={storageParts.place}
                  onChange={(e) => setStorageParts((prev) => ({ ...prev, place: e.target.value }))}
                  placeholder="C3"
                  className="field-muted"
                />
                <p className="text-xs text-muted-foreground">{t("board.card.place")}</p>
              </div>
            </div>
          </div>
          {isFutureSamplingDate && (
            <p className="text-sm text-destructive">{t("board.newSampleDialog.errors.futureDate")}</p>
          )}
          {isFutureArrivalDate && (
            <p className="text-sm text-destructive">{t("board.newSampleDialog.errors.futureArrivalDate")}</p>
          )}
          {isArrivalBeforeSampling && (
            <p className="text-sm text-destructive">{t("board.newSampleDialog.errors.arrivalBeforeSampling")}</p>
          )}
          {error &&
            error !== t("board.newSampleDialog.errors.futureDate") &&
            error !== t("board.newSampleDialog.errors.futureArrivalDate") &&
            error !== t("board.newSampleDialog.errors.arrivalBeforeSampling") && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("board.cancel")}</Button>
            <Button type="submit" disabled={isFutureSamplingDate || isFutureArrivalDate || isArrivalBeforeSampling}>{t("board.newSampleDialog.create")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
