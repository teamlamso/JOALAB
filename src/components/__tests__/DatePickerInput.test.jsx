import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DatePickerInput from '../DatePickerInput.jsx'

/**
 * Variante « date picker natif » de DateInput, utilisée dans les filtres de
 * l'Accueil. Plus permissive (pas de validation jj/mm/yyyy) — on s'attache
 * surtout au formatage à la frappe et à la propagation onChange.
 */
describe('DatePickerInput', () => {
  const setup = (props = {}) => {
    const onChange = vi.fn()
    const utils = render(<DatePickerInput value="" onChange={onChange} {...props} />)
    const text = screen.getByPlaceholderText('jj/mm/aaaa')
    return { onChange, text, ...utils }
  }

  it('rend une value ISO en dd/mm/yyyy', () => {
    const { text } = setup({ value: '2026-06-10' })
    expect(text).toHaveValue('10/06/2026')
  })

  it('insère les slashes automatiquement', async () => {
    const { text } = setup()
    await userEvent.type(text, '10062026')
    expect(text).toHaveValue('10/06/2026')
  })

  it('émet la date ISO une fois les 8 chiffres saisis', async () => {
    const { text, onChange } = setup()
    await userEvent.type(text, '10062026')
    expect(onChange).toHaveBeenLastCalledWith('2026-06-10')
  })

  it('émet chaîne vide quand le champ est vidé', async () => {
    const { text, onChange } = setup({ value: '2026-06-10' })
    await userEvent.clear(text)
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('ne propage rien tant que la saisie est incomplète', async () => {
    const { text, onChange } = setup()
    await userEvent.type(text, '1006')
    // Pas d'appel onChange avec une date ISO partielle.
    expect(onChange).not.toHaveBeenCalled()
  })

  it('le bouton calendrier appelle showPicker() de l\'input date caché', async () => {
    const showPicker = vi.fn()
    // jsdom ne fournit pas showPicker() — on le patche sur le prototype.
    HTMLInputElement.prototype.showPicker = showPicker

    setup()
    await userEvent.click(screen.getByRole('button', { name: /calendrier/i }))

    expect(showPicker).toHaveBeenCalled()
    delete HTMLInputElement.prototype.showPicker
  })

  it('changement via l\'input date caché émet directement la valeur ISO', () => {
    const { onChange } = setup()
    const dateInput = document.querySelector('input[type="date"]')

    // fireEvent.change passe par le synthetic event React, contrairement à
    // dispatchEvent natif qui ne déclenche pas le onChange React.
    fireEvent.change(dateInput, { target: { value: '2027-01-15' } })

    expect(onChange).toHaveBeenLastCalledWith('2027-01-15')
  })
})
