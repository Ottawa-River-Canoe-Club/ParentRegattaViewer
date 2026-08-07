import { describe, it, expect } from 'vitest'
import { parseSheetId, parseGid, buildScheduleCsvUrl, buildResultsCsvUrl } from '../googleSheets'

const SHEET_ID = '10sjjgYS5cEJladjNqQ0Z2tRqiTIvIES6'
const GID = '1191136310'

describe('parseSheetId', () => {
  it('extracts the ID from an edit URL with a gid fragment', () => {
    expect(parseSheetId(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${GID}`)).toBe(SHEET_ID)
  })

  it('extracts the ID from a share URL with query params', () => {
    expect(parseSheetId(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?usp=sharing`)).toBe(SHEET_ID)
  })

  it('extracts the ID from an export URL', () => {
    expect(parseSheetId(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`)).toBe(
      SHEET_ID,
    )
  })

  it('accepts a bare ID pasted without a URL', () => {
    expect(parseSheetId(SHEET_ID)).toBe(SHEET_ID)
  })

  it('trims surrounding whitespace', () => {
    expect(parseSheetId(`  ${SHEET_ID}  `)).toBe(SHEET_ID)
  })

  it('returns null for empty or unparseable input', () => {
    expect(parseSheetId('')).toBeNull()
    expect(parseSheetId('not a url')).toBeNull()
    expect(parseSheetId('https://example.com/not-a-sheet')).toBeNull()
  })
})

describe('parseGid', () => {
  it('extracts gid from a #fragment', () => {
    expect(parseGid(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${GID}`)).toBe(GID)
  })

  it('extracts gid from a ?query param', () => {
    expect(parseGid(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`)).toBe(GID)
  })

  it('accepts a bare numeric gid', () => {
    expect(parseGid(GID)).toBe(GID)
  })

  it('defaults to "0" when no gid is present anywhere', () => {
    expect(parseGid(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`)).toBe('0')
    expect(parseGid('')).toBe('0')
  })
})

describe('URL builders', () => {
  it('builds the schedule export URL with no gid', () => {
    expect(buildScheduleCsvUrl(SHEET_ID)).toBe(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`)
  })

  it('builds the results export URL with the given gid', () => {
    expect(buildResultsCsvUrl(SHEET_ID, GID)).toBe(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`,
    )
  })
})
