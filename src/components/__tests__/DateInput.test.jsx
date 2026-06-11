import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DateInput from '../DateInput.jsx'

/**
 * Garde-fou pour `DateInput` : (1) toute saisie incomplète ou impossible
 * ne doit JAMAIS propager une chaîne au parent — sans ça, le backend
 * recevait des dates type "2000-20-10" qui faisaient sauter LocalDate.parse
 * en 500 silencieux. (2) Le rendu d'une `value` ISO en dd/mm/yyyy doit
 * rester stable quand le parent réinjecte la même valeur (pas de blink).
 */
describe('DateInput', () => {
  const setup = (props = {}) => {
    const onChange = vi.fn()
    const utils = render(<DateInput value="" onChange={onChange} {...props} />)
    return { onChange, input: screen.getByPlaceholderText('jj/mm/aaaa'), ...utils }
  }

  // --- affichage de la valeur initiale ----------------------------------

  it('rend une value ISO comme dd/mm/yyyy', () => {
    const { input } = setup({ value: '1990-06-15' })
    expect(input.value).toBe('15/06/1990')
  })

  it('rend vide pour value vide / null / undefined', () => {
    const { input } = setup({ value: '' })
    expect(input.value).toBe('')
  })

  it('rend vide pour une value ISO invalide (sans 3 segments)', () => {
    const { input } = setup({ value: '199006' })
    expect(input.value).toBe('')
  })

  // --- formatage automatique pendant la saisie --------------------------

  it('insère les slashes automatiquement au fur et à mesure', async () => {
    const user = userEvent.setup()
    const { input } = setup()

    await user.type(input, '15')
    expect(input.value).toBe('15')

    await user.type(input, '06')
    expect(input.value).toBe('15/06')

    await user.type(input, '1990')
    expect(input.value).toBe('15/06/1990')
  })

  it('ignore les caractères non numériques', async () => {
    const user = userEvent.setup()
    const { input } = setup()

    await user.type(input, '1a5/b06')
    expect(input.value).toBe('15/06')
  })

  it('tronque à 8 chiffres (date complète)', async () => {
    const user = userEvent.setup()
    const { input } = setup()

    await user.type(input, '150619900000')
    expect(input.value).toBe('15/06/1990')
  })

  // --- propagation de onChange -----------------------------------------

  it('émet la date ISO une fois les 8 chiffres saisis sur une date valide', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()

    await user.type(input, '15061990')

    expect(onChange).toHaveBeenLastCalledWith('1990-06-15')
  })

  it('ne propage rien tant que la saisie est incomplète', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()

    await user.type(input, '1506')

    // Pas d'appel avec une chaîne tronquée — sinon le backend recevrait
    // un fragment puis se prendrait un 500.
    expect(onChange).not.toHaveBeenCalledWith(expect.stringMatching(/^\d{4}/))
  })

  it('émet chaîne vide quand l\'utilisateur efface le champ', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup({ value: '1990-06-15' })

    await user.clear(input)

    expect(onChange).toHaveBeenLastCalledWith('')
  })

  // --- validation des dates impossibles --------------------------------

  it('refuse une date impossible (10/20/2000 — mois 20) et ne propage pas', async () => {
    // Le bug d'origine : "20" était toléré comme mois et envoyé au backend.
    const user = userEvent.setup()
    const { input, onChange } = setup()

    await user.type(input, '10202000')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('refuse 31/04 (avril a 30 jours)', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()

    await user.type(input, '31041990')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('refuse 29/02 sur une année non bissextile', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()

    await user.type(input, '29021990')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('accepte 29/02 sur une année bissextile classique (2000)', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()

    await user.type(input, '29022000')

    expect(input).not.toHaveAttribute('aria-invalid')
    expect(onChange).toHaveBeenLastCalledWith('2000-02-29')
  })

  it('refuse 29/02 sur 1900 (divisible par 100, pas par 400)', async () => {
    // Cas piège du calendrier grégorien : 1900 n'est PAS bissextile.
    const user = userEvent.setup()
    const { input, onChange } = setup()

    await user.type(input, '29021900')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('accepte 29/02 sur 2000 (divisible par 400 — bissextile)', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()

    await user.type(input, '29022000')

    expect(onChange).toHaveBeenLastCalledWith('2000-02-29')
  })

  it('refuse une année hors plage [1900, 2100]', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()

    await user.type(input, '15061850')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('refuse une année > 2100', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()

    await user.type(input, '15062150')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('refuse jour 0', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()

    await user.type(input, '00061990')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('refuse mois 0', async () => {
    const user = userEvent.setup()
    const { input, onChange } = setup()

    await user.type(input, '15001990')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  // --- feedback visuel -------------------------------------------------

  it('expose un tooltip explicite quand la date est invalide', async () => {
    const user = userEvent.setup()
    const { input } = setup()

    await user.type(input, '31041990')

    expect(input).toHaveAttribute('title', expect.stringMatching(/invalide/i))
  })

  it('passe les props HTML supplémentaires au <input>', () => {
    const { input } = setup({ id: 'date-naissance', disabled: true })
    expect(input).toHaveAttribute('id', 'date-naissance')
    expect(input).toBeDisabled()
  })

  // --- synchronisation avec le parent ---------------------------------

  it('se resynchronise quand la prop value change après coup', async () => {
    const { input, rerender, onChange } = setup({ value: '1990-06-15' })
    expect(input.value).toBe('15/06/1990')

    rerender(<DateInput value="2000-01-31" onChange={onChange} />)

    expect(input.value).toBe('31/01/2000')
  })
})
