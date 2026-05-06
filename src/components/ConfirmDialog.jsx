/**
 * Modal de confirmation réutilisable.
 *
 * @param {boolean} open
 * @param {string} title
 * @param {string|JSX.Element} message
 * @param {string} confirmLabel - libellé du bouton de confirmation (défaut "Confirmer")
 * @param {string} cancelLabel - libellé du bouton d'annulation (défaut "Annuler")
 * @param {'danger'|'primary'} variant - style du bouton de confirmation
 * @param {() => void} onConfirm
 * @param {() => void} onCancel
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'primary',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const confirmClass = variant === 'danger' ? 'btn btn-danger' : 'btn btn-primary'

  return (
    <div className="modal-overlay" onClick={onCancel} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {title && <div className="modal-title">{title}</div>}
        <div className="modal-body">{message}</div>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={confirmClass} onClick={onConfirm} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
