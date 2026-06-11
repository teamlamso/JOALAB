import { describe, it, expect, vi } from 'vitest'
import { useState as useReactState } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Autocomplete, { normalize } from '../Autocomplete.jsx'

/**
 * Wrapper qui maintient le state contrôlé — sans ça, l'input garde toujours
 * sa value initiale et userEvent.type voit chaque caractère comme une saisie
 * unique au lieu d'une chaîne qui s'allonge.
 */
function renderAuto(props = {}) {
  const onChange = vi.fn()
  const onSelect = vi.fn()
  function Wrapper() {
    const [v, setV] = useReactState(props.value ?? '')
    return (
      <Autocomplete
        value={v}
        onChange={(val) => { setV(val); onChange(val) }}
        onSelect={onSelect}
        fetchSuggestions={() => Promise.resolve([])}
        debounceMs={20}
        {...props}
      />
    )
  }
  const utils = render(<Wrapper />)
  return { onChange, onSelect, ...utils }
}

describe('Autocomplete', () => {
  it('appelle onChange à chaque frappe (texte libre, pas seulement sur sélection)', async () => {
    const { onChange } = renderAuto()
    await userEvent.type(screen.getByRole('textbox'), 'ab')

    // Une fois par frappe pour le texte libre.
    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith('ab')
  })

  it('respecte minChars : pas de fetch avant le seuil', async () => {
    const fetchSuggestions = vi.fn(() => Promise.resolve([]))
    renderAuto({ fetchSuggestions, minChars: 3 })

    await userEvent.type(screen.getByRole('textbox'), 'ab')
    await new Promise((r) => setTimeout(r, 100))

    expect(fetchSuggestions).not.toHaveBeenCalled()
  })

  it('déclenche fetchSuggestions après minChars + debounce', async () => {
    const fetchSuggestions = vi.fn(() => Promise.resolve([
      { label: 'Paris', value: 'paris' },
    ]))
    renderAuto({ fetchSuggestions, minChars: 2 })

    await userEvent.type(screen.getByRole('textbox'), 'pa')

    expect(await screen.findByText('Paris')).toBeInTheDocument()
    expect(fetchSuggestions).toHaveBeenCalledTimes(1)
  })

  it('liste vide : n\'ouvre pas le dropdown', async () => {
    const fetchSuggestions = vi.fn(() => Promise.resolve([]))
    renderAuto({ fetchSuggestions, minChars: 2 })

    await userEvent.type(screen.getByRole('textbox'), 'xx')
    await new Promise((r) => setTimeout(r, 100))

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('clic sur une suggestion : appelle onSelect avec l\'item complet et ferme', async () => {
    const fetchSuggestions = vi.fn(() => Promise.resolve([
      { label: 'Paris', value: 'paris', data: { code: '75' } },
      { label: 'Lyon', value: 'lyon', data: { code: '69' } },
    ]))
    const { onSelect } = renderAuto({ fetchSuggestions, minChars: 2 })

    await userEvent.type(screen.getByRole('textbox'), 'pa')
    const suggestion = await screen.findByText('Paris')
    await userEvent.click(suggestion)

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith({ label: 'Paris', value: 'paris', data: { code: '75' } })
    // Le dropdown se ferme après sélection.
    expect(screen.queryByText('Lyon')).not.toBeInTheDocument()
  })

  it('debounce : seule la dernière frappe déclenche un fetch', async () => {
    // Garde-fou : sans debounce, on amplifiait inutilement la charge serveur
    // sur chaque frappe (autocomplete adresses → 10+ fetches par mot).
    const fetchSuggestions = vi.fn(() => Promise.resolve([]))
    renderAuto({ fetchSuggestions, minChars: 2, debounceMs: 100 })

    await userEvent.type(screen.getByRole('textbox'), 'paris')
    await new Promise((r) => setTimeout(r, 200))

    expect(fetchSuggestions).toHaveBeenCalledTimes(1)
    expect(fetchSuggestions.mock.calls[0][0]).toBe('paris')
  })

  it('erreur de fetch : suggestion vide, dropdown fermé', async () => {
    const fetchSuggestions = vi.fn(() => Promise.reject(new Error('réseau')))
    renderAuto({ fetchSuggestions, minChars: 2 })

    await userEvent.type(screen.getByRole('textbox'), 'pa')
    await new Promise((r) => setTimeout(r, 100))

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('clic en dehors : ferme le dropdown', async () => {
    const fetchSuggestions = vi.fn(() => Promise.resolve([
      { label: 'Paris', value: 'paris' },
    ]))
    renderAuto({ fetchSuggestions, minChars: 2 })

    await userEvent.type(screen.getByRole('textbox'), 'pa')
    await screen.findByText('Paris')

    // Clic en dehors — utiliser fireEvent.mouseDown sur body, car
    // userEvent.click ne déclenche pas mousedown sur le body assez fiablement.
    await act(async () => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })

    expect(screen.queryByText('Paris')).not.toBeInTheDocument()
  })

  it('descend en dessous de minChars : ferme le dropdown et vide les suggestions', async () => {
    const fetchSuggestions = vi.fn(() => Promise.resolve([
      { label: 'Paris', value: 'paris' },
    ]))
    renderAuto({ fetchSuggestions, minChars: 3 })

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'par')
    await screen.findByText('Paris')

    await userEvent.clear(input)

    expect(screen.queryByText('Paris')).not.toBeInTheDocument()
  })

  it('disabled : ne rend pas la liste même si suggestions existent', async () => {
    const fetchSuggestions = vi.fn(() => Promise.resolve([
      { label: 'Paris', value: 'paris' },
    ]))
    renderAuto({ fetchSuggestions, minChars: 0, disabled: true, value: 'pa' })

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.queryByText('Paris')).not.toBeInTheDocument()
  })

  it('value/placeholder/required passés au <input>', () => {
    renderAuto({ value: 'init', placeholder: 'Recherche', required: true })
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('init')
    expect(input).toHaveAttribute('placeholder', 'Recherche')
    expect(input).toBeRequired()
  })
})

describe('normalize (helper exporté)', () => {
  it('retire les accents et passe en minuscules', () => {
    expect(normalize('Besançon')).toBe('besancon')
    expect(normalize('ÉCOLE')).toBe('ecole')
    expect(normalize('São Paulo')).toBe('sao paulo')
  })

  it('tolère null/undefined', () => {
    expect(normalize(null)).toBe('')
    expect(normalize(undefined)).toBe('')
  })
})
