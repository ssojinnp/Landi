// Landi 식재 팔레트, 색상 옵션, 기본 조감도 샘플 데이터를 정의한다.
import type { PlantColors, PlantKind, PlantKindOption, PlantTemplate } from '../types'

export const STORAGE_KEY = 'landi-plans-v1'
export const BOARD_WIDTH = 1120
export const BOARD_HEIGHT = 640

export const kindOptions: PlantKindOption[] = [
  { kind: 'deciduous', label: '나무', category: '나무', size: 90, colors: { primary: '#6f9f45', secondary: '#a5c96f', accent: '#dfe9ad', stroke: '#233c1f' } },
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

export const plantToneOptions: Partial<Record<PlantKind, PlantColors[]>> = {
  deciduous: [
    { primary: '#4f8738', secondary: '#8fc15f', accent: '#d7e89a', stroke: '#233c1f' },
    { primary: '#6fa83f', secondary: '#b6d86c', accent: '#eef0a8', stroke: '#3d4d1f' },
    { primary: '#3f7f59', secondary: '#76b985', accent: '#c7e6bb', stroke: '#264434' },
    { primary: '#7f9140', secondary: '#c2c55f', accent: '#f0df92', stroke: '#4c4724' },
    { primary: '#2f6f4b', secondary: '#68a96f', accent: '#bfe1a2', stroke: '#1f3d2c' },
    { primary: '#86a84a', secondary: '#cbdc73', accent: '#f2e8a6', stroke: '#4a5128' },
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
  { id: 'pinus', kind: 'evergreen', category: '나무', name: '소나무', label: 'Pinus densiflora', size: 82, colors: { primary: '#4f8738', secondary: '#7ead58', accent: '#c8dc8e', stroke: '#233c1f' } },
  { id: 'zelkova', kind: 'deciduous', category: '나무', name: '느티나무', label: 'Zelkova serrata', size: 94, colors: { primary: '#76a84d', secondary: '#a6c973', accent: '#dfe8ae', stroke: '#2b421f' } },
  { id: 'buxus', kind: 'shrub', category: '나무', name: '회양목', label: 'Buxus microphylla', size: 58, colors: { primary: '#568d4a', secondary: '#86b76a', accent: '#d5e9a8', stroke: '#263d25' } },
  { id: 'liriope', kind: 'groundcover', category: '풀', name: '맥문동', label: 'Liriope muscari', size: 50, colors: { primary: '#6d9c58', secondary: '#9bbb6a', accent: '#dbe9b7', stroke: '#38512f' } },
  { id: 'hydrangea', kind: 'flower', category: '꽃', name: '수국', label: 'Hydrangea macrophylla', size: 56, colors: { primary: '#628b4c', secondary: '#95b96f', accent: '#b8c8f2', stroke: '#33492c' } },
]

export const hedgePoints = [[110,70,28],[155,65,34],[206,64,30],[252,58,26],[305,60,39],[363,57,28],[418,62,33],[474,58,29],[532,62,35],[592,64,24],[653,67,29],[716,66,25],[780,70,30],[845,82,27],[895,122,24],[905,184,27],[900,249,30],[906,321,25],[901,392,27],[112,556,36],[205,558,35],[846,532,26]]
export const borderShrubs = [[117,271],[136,316],[154,386],[167,438],[830,159],[825,213],[850,278],[826,355],[784,398]]
