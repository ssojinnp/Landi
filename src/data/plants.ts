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
    { primary: '#5f913f', secondary: '#91bd64', accent: '#d7e6a2', stroke: '#243f1f' },
    { primary: '#6fa54d', secondary: '#a9cf76', accent: '#e4edb8', stroke: '#2f4727' },
    { primary: '#4f7f4a', secondary: '#83b76c', accent: '#cce5af', stroke: '#273f2b' },
    { primary: '#7f9841', secondary: '#bcc86f', accent: '#ece4a2', stroke: '#454223' },
  ],
  groundcover: [
    { primary: '#5f985c', secondary: '#98c474', accent: '#d8ecc1', stroke: '#355233' },
    { primary: '#6f9f77', secondary: '#a6ccb0', accent: '#def0d8', stroke: '#345840' },
    { primary: '#7c9860', secondary: '#b7c97f', accent: '#eef1c8', stroke: '#435235' },
    { primary: '#4f9477', secondary: '#8fc6a9', accent: '#d6efe7', stroke: '#2f5549' },
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
