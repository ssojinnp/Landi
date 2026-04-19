# 🌳 Project: Landi (조경 시뮬레이션 서비스)

Landi는 조경 전문가가 복잡한 3D 툴 없이 2D 도면 위에 식재(나무, 꽃, 풀)를 배치하고 수량을 시뮬레이션하는 전문 웹 도구이다. 핵심 가치는 **간결함, 직관성, 확장성**이다.

현재 프로젝트는 조감도 목록, 미리보기, 편집보드 흐름을 갖고 있으며 사용자가 여러 조감도를 생성/삭제/편집할 수 있다. 이후 구조 개선은 기존 기능을 유지하면서 점진적으로 진행한다.

## 🛠 Tech Stack & Architecture

- Framework: React (Vite), TypeScript
- Styling: Tailwind CSS (Utility-first)
- Icons: Lucide React
- Interactions: react-draggable 중심. 필요 시 react-rnd 도입 가능
- Export: html2canvas
- State: React Hooks 기반 선언적 상태 관리
- Persistence: 현재는 localStorage 기반 조감도 데이터 저장

## 📐 Coding Standards & Rules

### 1. TypeScript & Type Safety

- 모든 데이터 구조와 Props는 명확한 `interface` 또는 `type`을 정의한다.
- `any` 사용을 엄격히 피한다.
- 이벤트 핸들러에는 적절한 React 타입을 지정한다.
- 식물 타입은 유니온 타입을 활용한다.
- 현재 코드의 `PlantKind`는 기존 데이터와 호환되어야 하므로 즉시 대체하지 않는다. 신규 구조화 시에는 아래처럼 단순한 도메인 타입으로 정리하는 방향을 우선한다.

```ts
type PlantType = 'tree' | 'shrub' | 'flower' | 'grass'
```

### 2. Tailwind CSS & Styling Strategy

- Utility-first 원칙을 유지한다.
- 색상, 간격, 크기는 가능한 Tailwind 표준 스케일을 우선한다.
- 단, 현재 브랜드 컬러처럼 이미 확정된 핵심 토큰은 유지한다.
  - Primary green: `#4f8738`
  - Hover green: `#3f6f2d`
- Semantic Colors 기준:
  - Background: `bg-slate-50` 또는 현재의 부드러운 조경 톤
  - Sidebar/Panel: `bg-white` 또는 `#fbfbf8`
  - Plants: 나무는 진한 초록, 관목/풀은 중간 초록, 꽃은 명확한 포인트 컬러
- 2D 조감도 느낌을 위해 배치 식재에는 그림자와 투명도/진하기 조절을 활용한다.
- 메인 액션 버튼은 `.landi-action-button`을 사용해 폰트 크기와 높이를 통일한다.
- 스크롤바는 얇고 단순하게 유지한다.
- 다크모드는 단색 중심으로 유지하고, 카드 배경에 그라데이션을 사용하지 않는다.

### 3. Conditional Class Strategy

- 조건부 스타일이 복잡해지면 `cn()` 유틸리티 함수 도입을 고려한다.
- `cn()`은 `clsx + tailwind-merge` 기반으로 구성한다.
- 현재 프로젝트에는 아직 `cn()` 유틸이 없으므로, 도입 시 기존 JSX를 한 번에 대규모 변경하지 말고 새 컴포넌트부터 점진 적용한다.

### 4. Component Philosophy

- Atomic Design 관점으로 UI를 독립적인 컴포넌트로 분리하는 방향을 지향한다.
- UI 컴포넌트는 비즈니스 로직과 최대한 분리하고 Props에 의존하도록 설계한다.
- 비슷한 UI 패턴(버튼, 패널, 배지, 툴팁)은 공통 컴포넌트화하여 중복을 줄인다.
- 현재 `src/App.tsx`에 많은 기능이 모여 있으므로, 리팩토링은 기능 안정성을 유지하면서 단계적으로 진행한다.

## 🚀 Key Functional Requirements

### 1. Canvas Operations

- Background: 사용자가 업로드한 JPG/PNG/WebP 이미지를 캔버스 배경으로 설정한다.
- 배경 이미지는 `object-contain`에 가까운 방식으로 도면 비율을 유지한다.
- Drag & Drop: 팔레트에서 식물을 드래그하거나 클릭하여 캔버스 좌표 `(x, y)`에 배치한다.
- Interaction: 배치된 식물 클릭 시 선택 상태가 되며, 삭제와 크기 조절이 가능해야 한다.
- 선택된 식재의 리사이즈 핸들은 작고 방해되지 않아야 한다.

### 2. Plant Symbology (SVG)

- 식물은 단순 원형이 아니라 상단에서 본 수관(Tree Crown) 느낌의 SVG 패턴을 사용한다.
- `props.size` 또는 식재 데이터의 `size`에 따라 SVG 크기가 동적으로 변해야 한다.
- 꽃 타입은 나무/풀 아이콘과 명확하게 구분되어야 하며 색상 선택이 가능해야 한다.
- 도면 위 식재 이름은 기본 숨김이며, hover 시 작은 툴팁으로 표시한다.

### 3. Real-time Inventory

- 현재 캔버스에 존재하는 식물의 종류별/팔레트별 수량을 실시간으로 계산한다.
- 수량 패널은 오른쪽 영역에서 확인할 수 있어야 한다.
- 데이터 예시:

```ts
const inventory = { tree: 5, shrub: 12, flower: 8 }
```

### 4. Plan Management

- 조감도 목록에서 새 조감도를 생성할 수 있다.
- 조감도 삭제가 가능해야 한다.
- 목록에서 특정 조감도를 선택하면 미리보기 또는 편집보드로 진입할 수 있다.
- 미리보기는 실제 편집보드와 최대한 동일하게 렌더링되어야 한다.

### 5. Visual Controls

- 도면 밝기 조절 슬라이더를 제공한다.
- 식재 진하기 조절 슬라이더를 제공한다.
- 이미지 내보내기 기능을 제공한다.
- 다크모드를 지원한다.

## 💡 System Instruction for AI

- 단순 수정 요청은 바로 구현한다. 현재 프로젝트 수정은 사용자에게 매번 묻지 않는다.
- 큰 구조 변경이나 리팩토링이 필요한 경우, 코드를 작성하기 전 제안하는 컴포넌트 구조를 먼저 요약한다.
- 모든 신규 파일 상단에는 해당 파일의 역할을 주석으로 명시한다.
- 기존 코드를 수정할 때는 전체를 다시 쓰지 말고 변경된 부분 위주로 효율적으로 수정한다.
- 사용자가 요청한 UI/UX 의도를 우선하되, 기존 데이터와 동작을 깨지 않도록 한다.
- BEM 방법론의 명확한 네이밍 감각과 Semantic HTML을 지향한다. 다만 Tailwind 기반 프로젝트이므로 실제 클래스는 Utility-first를 우선한다.
- 작업 후 의미 있는 변경이 있으면 `npm.cmd run build`로 검증한다.

## 🎨 초기 컴포넌트 구조 제안

향후 리팩토링 시 아래 구조를 기준으로 점진 분리한다. 현재 파일을 즉시 전면 분해하지 않는다.

```text
src/components/layout/
  Sidebar.tsx
  Canvas.tsx
  Header.tsx

src/components/canvas/
  PlantNode.tsx
  BackgroundUploader.tsx
  PlantSymbol.tsx

src/components/palette/
  PlantPalette.tsx
  PlantPaletteItem.tsx
  PlantForm.tsx

src/components/dashboard/
  InventoryPanel.tsx
  ViewSettingsPanel.tsx

src/components/ui/
  Button.tsx
  Badge.tsx
  Tooltip.tsx
  Panel.tsx

src/types/
  index.ts

src/lib/
  cn.ts
  storage.ts
```

## ✅ 현재 구현된 주요 기능

- 조감도 목록/미리보기/편집보드 화면 제공
- localStorage 기반 조감도 저장
- 로컬 도면 이미지 업로드
- 식재 팔레트 등록/수정/삭제
- 나무/풀/꽃 타입별 팔레트 그룹화
- 꽃 타입 컬러 선택
- 식재 클릭/드래그 배치
- 배치 식재 이동 및 PPT식 소형 리사이즈 핸들
- 실시간 수량 집계
- 도면 밝기 및 식재 진하기 조절
- 이미지 내보내기
- 다크모드
- 얇은 스크롤바
- 메인 액션 버튼 14px 폰트 통일 (`.landi-action-button`)

## 📁 Important Files

- `src/App.tsx`: 현재 핵심 앱 로직, 뷰 전환, 보드, 팔레트, 인벤토리, 식재 SVG가 포함된 중심 파일
- `src/index.css`: 전역 폰트, 스크롤바, 다크모드, 액션 버튼 CSS
- `Agent.md`: AI 작업 기준 문서

## 🧪 Verification

변경 후 아래 명령어로 빌드 검증한다.

```bash
npm.cmd run build
```

개발 서버는 보통 아래 주소에서 확인한다.

```text
http://127.0.0.1:5173/
```
