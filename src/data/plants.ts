// Landi 식재 팔레트, 색상 옵션, 기본 조감도 샘플 데이터를 정의한다.
import type { PlantColors, PlantKind, PlantKindOption, PlantTemplate } from '../types'

export const STORAGE_KEY = 'landi-plans-v1'
export const BOARD_WIDTH = 1120
export const BOARD_HEIGHT = 640

export const kindOptions: PlantKindOption[] = [
  { kind: 'deciduous', label: '나무', category: '나무', size: 90, colors: { primary: '#5f8f3e', secondary: '#8fb95a', accent: '#c9dc7a', stroke: '#233c1f' } },
  { kind: 'groundcover', label: '풀', category: '풀', size: 50, colors: { primary: '#6d9c58', secondary: '#9bbb6a', accent: '#dbe9b7', stroke: '#38512f' } },
  { kind: 'flower', label: '꽃', category: '꽃', size: 56, colors: { primary: '#5c8a49', secondary: '#77a85c', accent: '#d58bd9', stroke: '#33492c' } },
]

export const flowerColorOptions = [
  { name: '핑크', value: '#f28ab2' },
  { name: '보라', value: '#b78cf0' },
  { name: '블루', value: '#7fb7f2' },
  { name: '옐로', value: '#f1d65c' },
  { name: '레드', value: '#e85f5c' },
  { name: '화이트', value: '#f8f4df' },
]

export const plantAssetSlotCount: Record<PlantKind, number> = {
  evergreen: 3,
  deciduous: 4,
  shrub: 5,
  groundcover: 5,
  flower: 2,
}

export const plantToneOptions: Partial<Record<PlantKind, PlantColors[]>> = {
  deciduous: [
    { primary: '#446f32', secondary: '#78a84b', accent: '#bfd36c', stroke: '#20391e' },
    { primary: '#648f36', secondary: '#9fbd55', accent: '#d8dc79', stroke: '#39491e' },
    { primary: '#356d4c', secondary: '#68a56e', accent: '#aeca8e', stroke: '#233f31' },
    { primary: '#6f7f38', secondary: '#acb653', accent: '#dbcf72', stroke: '#464323' },
    { primary: '#285f42', secondary: '#5f9864', accent: '#9fc77c', stroke: '#1c3529' },
    { primary: '#78923d', secondary: '#b8ca63', accent: '#e0d984', stroke: '#444d27' },
  ],
  shrub: [
    { primary: '#568d4a', secondary: '#86b76a', accent: '#d5e9a8', stroke: '#263d25' },
    { primary: '#4f7f5a', secondary: '#7eb077', accent: '#cde4a5', stroke: '#2d422b' },
    { primary: '#6f8f45', secondary: '#a6bd63', accent: '#e2e59b', stroke: '#3f4825' },
    { primary: '#477a5d', secondary: '#74aa7d', accent: '#c5dfb0', stroke: '#2b4536' },
  ],
  groundcover: [
    { primary: '#5f985c', secondary: '#9acb66', accent: '#d9ed9a', stroke: '#355233' },
    { primary: '#4f9477', secondary: '#89c9a6', accent: '#d2efe4', stroke: '#2f5549' },
    { primary: '#7c9860', secondary: '#bfcc66', accent: '#edf0a8', stroke: '#435235' },
    { primary: '#3f8b78', secondary: '#76c4b0', accent: '#c9eee6', stroke: '#285449' },
    { primary: '#6f9f45', secondary: '#b2d85f', accent: '#e7ef9a', stroke: '#3a5128' },
    { primary: '#528f9b', secondary: '#8fcad0', accent: '#d6f0ef', stroke: '#2f5660' },
  ],
}

export const defaultPalette: PlantTemplate[] = [
  { id: 'pinus', kind: 'evergreen', category: '나무', name: '소나무', label: 'Pinus densiflora', size: 82, colors: { primary: '#315f2e', secondary: '#5f8d48', accent: '#9ebd64', stroke: '#1f351d' }, assetVariant: 0, toneVariant: 0 },
  { id: 'zelkova', kind: 'deciduous', category: '나무', name: '느티나무', label: 'Zelkova serrata', size: 94, colors: { primary: '#5f8f3e', secondary: '#92b95c', accent: '#cadb7a', stroke: '#283f1e' }, assetVariant: 0, toneVariant: 3 },
  { id: 'buxus', kind: 'shrub', category: '나무', name: '회양목', label: 'Buxus microphylla', size: 58, colors: { primary: '#4a7d43', secondary: '#77a45f', accent: '#bdd286', stroke: '#263d25' }, assetVariant: 0, toneVariant: 6 },
  { id: 'kochia', kind: 'groundcover', category: '풀', name: '댑싸리', label: 'Bassia scoparia', size: 56, colors: { primary: '#6d9c58', secondary: '#9bbb6a', accent: '#dbe9b7', stroke: '#38512f' }, assetVariant: 0, toneVariant: 2 },
  { id: 'hydrangea', kind: 'flower', category: '꽃', name: '수국', label: 'Hydrangea macrophylla', size: 56, colors: { primary: '#568d4a', secondary: '#86b76a', accent: '#8fa8e8', stroke: '#263d25' }, assetVariant: 0, toneVariant: 5 },
]

export const hedgePoints = [[110,70,28],[155,65,34],[206,64,30],[252,58,26],[305,60,39],[363,57,28],[418,62,33],[474,58,29],[532,62,35],[592,64,24],[653,67,29],[716,66,25],[780,70,30],[845,82,27],[895,122,24],[905,184,27],[900,249,30],[906,321,25],[901,392,27],[112,556,36],[205,558,35],[846,532,26]]
export const borderShrubs = [[117,271],[136,316],[154,386],[167,438],[830,159],[825,213],[850,278],[826,355],[784,398]]
