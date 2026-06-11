import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Wrapper qui maintient le state contrôlé pour les Search — sinon le `value`
 * prop reste « » et chaque frappe est vue isolément par Autocomplete.
 */
function Controlled({ Component, onChange, ...rest }) {
  const [v, setV] = useState('')
  return (
    <Component
      value={v}
      onChange={(val) => { setV(val); onChange?.(val) }}
      {...rest}
    />
  )
}

/**
 * Tests groupés pour les wrappers d'Autocomplete : AddressSearch,
 * PlaceSearch, CountrySearch et PrefectureSearch. Ils partagent tous
 * l'infrastructure d'Autocomplete (déjà testée) — ici on valide
 * uniquement la spécialisation : la source de données qu'ils consultent
 * et le mapping vers les items affichés/sélectionnés.
 */

const mockSearchAdresses = vi.fn()
vi.mock('../../api/adresses.js', () => ({
  searchAdresses: (...a) => mockSearchAdresses(...a),
}))

const mockSearchLieux = vi.fn()
vi.mock('../../api/lieux.js', () => ({
  searchLieux: (...a) => mockSearchLieux(...a),
}))

import AddressSearch from '../AddressSearch.jsx'
import PlaceSearch from '../PlaceSearch.jsx'
import CountrySearch from '../CountrySearch.jsx'
import PrefectureSearch from '../PrefectureSearch.jsx'

// ---------------------------------------------------------------------------
// AddressSearch
// ---------------------------------------------------------------------------

describe('AddressSearch', () => {
  beforeEach(() => mockSearchAdresses.mockReset())

  it('appelle searchAdresses et expose l\'objet structuré dans onSelect', async () => {
    mockSearchAdresses.mockResolvedValueOnce([
      { label: '1 rue de la Paix, 75002 Paris',
        rue: '1 rue de la Paix', codePostal: '75002', ville: 'Paris', pays: 'France' },
    ])
    const onSelect = vi.fn()
    render(<AddressSearch onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('textbox'), 'rue')
    await userEvent.click(await screen.findByText(/rue de la Paix/))

    expect(mockSearchAdresses).toHaveBeenCalledWith('rue', 6)
    expect(onSelect).toHaveBeenCalledWith({
      rue: '1 rue de la Paix',
      codePostal: '75002',
      ville: 'Paris',
      pays: 'France',
    })
  })

  it('résultat API sans pays : pays par défaut « France » dans l\'item', async () => {
    mockSearchAdresses.mockResolvedValueOnce([
      { label: 'X', rue: 'X', codePostal: '01000', ville: 'Bourg', pays: null },
    ])
    const onSelect = vi.fn()
    render(<AddressSearch onSelect={onSelect} />)

    await userEvent.type(screen.getByRole('textbox'), 'bou')
    await userEvent.click(await screen.findByText('X'))

    expect(onSelect.mock.calls[0][0].pays).toBe('France')
  })
})

// ---------------------------------------------------------------------------
// PlaceSearch (lieu de naissance)
// ---------------------------------------------------------------------------

describe('PlaceSearch', () => {
  beforeEach(() => mockSearchLieux.mockReset())

  it('propose les suggestions retournées par searchLieux et émet le label sur sélection', async () => {
    mockSearchLieux.mockResolvedValueOnce([
      { label: 'Besançon (25)' }, { label: 'Tokyo (Japon)' },
    ])
    const onChange = vi.fn()
    render(<Controlled Component={PlaceSearch} onChange={onChange} />)

    await userEvent.type(screen.getByPlaceholderText(/Lieu de naissance/), 'bes')

    // PlaceSearch impose minChars=3 → 'bes' = 3 caractères, suffisant.
    await userEvent.click(await screen.findByText('Besançon (25)'))

    expect(mockSearchLieux).toHaveBeenCalledWith('bes', 6)
    expect(onChange).toHaveBeenLastCalledWith('Besançon (25)')
  })

  it('disabled : input grisé, pas de dropdown', () => {
    render(<PlaceSearch value="X" onChange={vi.fn()} disabled />)

    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})

// ---------------------------------------------------------------------------
// CountrySearch (filtrage local depuis la liste statique)
// ---------------------------------------------------------------------------

describe('CountrySearch', () => {
  it('filtre la liste statique des pays (insensible aux accents)', async () => {
    const onChange = vi.fn()
    render(<Controlled Component={CountrySearch} onChange={onChange} />)

    // Saisie sans accent — doit trouver les pays avec accents.
    await userEvent.type(screen.getByPlaceholderText('Pays'), 'bre')

    expect(await screen.findByText(/Brésil/)).toBeInTheDocument()
  })

  it('clic sur un pays : émet son nom complet', async () => {
    const onChange = vi.fn()
    render(<Controlled Component={CountrySearch} onChange={onChange} />)

    await userEvent.type(screen.getByPlaceholderText('Pays'), 'fran')
    await userEvent.click(await screen.findByText('France'))

    expect(onChange).toHaveBeenLastCalledWith('France')
  })
})

// ---------------------------------------------------------------------------
// PrefectureSearch (filtrage local sur les lieux de délivrance)
// ---------------------------------------------------------------------------

describe('PrefectureSearch', () => {
  it('filtre les lieux de délivrance par ville', async () => {
    const onChange = vi.fn()
    render(<Controlled Component={PrefectureSearch} onChange={onChange} />)

    await userEvent.type(
      screen.getByPlaceholderText(/Préfecture/),
      'paris'
    )

    // Au moins une suggestion contient "Paris".
    expect((await screen.findAllByText(/Paris/i)).length).toBeGreaterThan(0)
  })

  it('clic sur une suggestion : émet une valeur libellée (sans tiret cadratin de badge)', async () => {
    const onChange = vi.fn()
    render(<Controlled Component={PrefectureSearch} onChange={onChange} />)

    await userEvent.type(screen.getByPlaceholderText(/Préfecture/), 'paris')
    const items = await screen.findAllByText(/Paris/i)
    await userEvent.click(items[0])

    // onChange est appelé d'abord par les frappes puis par la sélection ;
    // on vérifie juste que la dernière émission ne contient pas le tiret
    // cadratin (séparateur « — S.-préf. » réservé à l'affichage).
    const valeur = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(valeur).not.toMatch(/—/)
  })
})
