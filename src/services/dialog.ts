import Swal from 'sweetalert2'

export const dialog = Swal.mixin({
  background: '#111b30',
  color: '#f4f7ff',
  buttonsStyling: false,
  reverseButtons: true,
  customClass: {
    popup: 'bingo-modal', title: 'bingo-modal-title', htmlContainer: 'bingo-modal-copy',
    confirmButton: 'action-button primary-action', cancelButton: 'action-button secondary-action',
    input: 'bingo-modal-input', actions: 'bingo-modal-actions'
  },
  confirmButtonText: 'Entendido',
  cancelButtonText: 'Cancelar'
})

export function showError(error: unknown) {
  return dialog.fire({ icon: 'error', title: 'No pudimos completar la acción', text: error instanceof Error ? error.message : 'Inténtalo otra vez.' })
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!))
}
