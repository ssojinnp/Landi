# AGENTS.md - Landi 프로젝트 규칙

## 프로젝트 목표

Landi는 조경 전문가가 복잡한 3D 툴 없이 2D 도면 위에 식재(나무, 꽃, 풀, 관목 등)를 배치하고 수량을 시뮬레이션하는 전문 웹 도구이다.

핵심 가치는 **간결함, 직관성, 확장성**이다.

사용자는 여러 조감도를 생성하고, 각 조감도별로 식재 팔레트를 구성한 뒤, 도면 위에 식재를 배치하고 수량을 확인할 수 있어야 한다.

현재 프로젝트는 아래 흐름을 가진다.

- 조감도 목록
- 조감도 미리보기
- 편집보드
- 식재 팔레트 등록/수정/삭제
- 도면 이미지 업로드
- 식재 배치/이동/크기 조절
- 수량 집계
- 이미지 내보내기
- 공유/권한 관리

## 핵심 스택

- React
- Vite
- TypeScript
- Tailwind CSS
- Lucide React
- react-draggable
- html2canvas
- Supabase
- localStorage

현재는 React 단일 앱 구조이며, `src/App.tsx`에 주요 화면과 상태 로직이 집중되어 있다.

향후 구조 개선 시에는 기존 기능을 유지하면서 점진적으로 컴포넌트를 분리한다. 한 번에 대규모 리팩토링하지 않는다.

## 주요 데이터

### 조감도 Plan

조감도는 아래 데이터를 가진다.

- id
- title
- updatedAt
- backgroundUrl
- palette
- plants
- backgroundFade
- plantIntensity
- ownerEmail
- members
- accessEmails

### 식재 PlantTemplate / Plant

식재 팔레트 항목은 아래 데이터를 가진다.

- id
- kind
- category
- name
- label
- size
- colors

캔버스에 배치된 식재는 팔레트 데이터를 기반으로 하며, 추가로 아래 값을 가진다.

- instanceId
- templateId
- x
- y
- size

`PlantKind`는 기존 데이터와 호환되어야 하므로 즉시 대체하지 않는다. 신규 구조화가 필요할 때만 점진적으로 정리한다.

## 아이콘 규칙

- 이모지 사용 금지.
- 모든 아이콘은 `lucide-react`를 사용한다.
- 버튼, 툴바, 패널 액션에는 가능한 텍스트만 쓰지 말고 아이콘을 함께 사용한다.
- 아이콘 전용 버튼에는 반드시 `aria-label`을 제공한다.
- 아이콘 크기는 보통 `16px ~ 18px`, 주요 브랜드 아이콘은 `22px ~ 24px`를 기준으로 한다.

## 디자인 원칙

- Landi는 조경 실무자가 쓰는 전문 도구이므로 장식보다 **명확함, 가독성, 조작 안정성**을 우선한다.
- 전체 톤은 부드러운 조경 톤의 라이트 UI를 기본으로 한다.
- 과한 그라데이션, 장식용 블롭, 유리효과, 불필요한 애니메이션은 사용하지 않는다.
- 편집보드는 도면과 식재가 중심이 되어야 하며, 주변 UI는 조작을 방해하지 않아야 한다.
- 카드나 패널은 `rounded-md` 중심으로 작고 단정하게 유지한다.
- 텍스트는 좁은 패널에서도 잘리지 않게 크기와 줄높이를 일관되게 관리한다.
- 입력창, select, placeholder의 폰트 크기가 서로 달라 보이지 않도록 공통 기준을 사용한다.

## 공통 디자인 시스템

### 1) 톤 & 서페이스

- 앱 배경: `#eceee8`
- 패널 배경: `#fbfbf8`
- 카드/입력 배경: `bg-white`
- 보드 배경: `#f7f7f2`
- 기본 텍스트: `text-slate-900`
- 보조 텍스트: `text-slate-500`
- 경계선: `border-slate-200`, 보드 경계는 `#d8ded4`

브랜드 컬러는 아래 값을 유지한다.

- Primary green: `#4f8738`
- Hover green: `#3f6f2d`
- Soft green background: `#edf6e7`
- Selection blue: `#2563eb`

### 2) 레이아웃

- 편집 화면은 좌측 팔레트, 중앙 보드, 우측 도구 패널 구조를 유지한다.
- 데스크톱에서는 `lg:flex-row` 기반 3영역 편집 UI를 유지한다.
- 모바일/태블릿에서는 패널 접기와 가로모드 안내를 통해 보드 편집 안정성을 확보한다.
- 좌측 팔레트는 접힘 상태를 지원해야 한다.
- 오른쪽 도구 패널은 공유, 표현 설정, 수량 집계를 탭처럼 전환한다.
- 캔버스는 항상 보드 비율을 유지하고, 스케일 조정 시 식재 좌표가 깨지지 않아야 한다.

### 3) 패널 / 카드

- 기본 패널: `border border-slate-200 bg-[#fbfbf8]`
- 내부 카드: `rounded-md border border-slate-200 bg-white shadow-sm`
- 반복 아이템: `rounded-md bg-white/80 hover:bg-white hover:shadow-sm`
- 패널 제목: `text-sm font-semibold text-slate-700`
- 섹션 라벨: `text-xs font-semibold uppercase tracking-normal text-slate-500`

현재 프로젝트는 `rounded-md` 중심의 단정한 도구형 UI를 사용한다. 신규 코드에서도 과한 라운드(`rounded-3xl` 등)는 특별한 이유가 없으면 사용하지 않는다.

### 4) 버튼

- 메인 액션 버튼은 `.landi-action-button`을 사용한다.
- 메인 액션 버튼 기준:
  - `font-size: 14px`
  - `line-height: 1`
  - `font-weight: 600`
  - 아이콘 크기 `17px`
- 주요 액션은 `bg-[#4f8738] text-white hover:bg-[#3f6f2d]`
- 보조 액션은 `border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`
- 위험 액션은 `text-red-600 hover:bg-red-50`
- 아이콘 전용 버튼은 `grid h-8~10 w-8~10 place-items-center rounded-md` 패턴을 우선 사용한다.
- 버튼 텍스트와 아이콘이 세로 중앙에 맞지 않으면 높이, line-height, icon size를 함께 조정한다.

### 5) 입력 / 폼

- 좁은 패널용 일반 입력/select는 `.landi-form-control` 기준을 사용한다.
- `.landi-form-control` 기준:
  - `min-height: 36px`
  - `font-size: 13px`
  - `line-height: 18px`
  - `font-weight: 500`
- placeholder도 입력값과 같은 크기 기준을 사용한다.
- 입력, select, placeholder의 폰트 크기가 서로 달라 보이면 안 된다.
- 팔레트 등록/수정 폼은 좁은 패널 안에서 안정적으로 보이도록 `h-9`, `px-2.5`, `rounded-md`를 유지한다.
- 에러 메시지는 `text-xs font-semibold text-red-600`을 사용한다.
- 필수 입력 검증은 사용자 행동 직후 명확히 보여준다.

### 6) 식재 팔레트

- 식재 팔레트는 식재 타입별로 그룹화한다.
- 그룹 헤더에는 작은 컬러 도트와 그룹명을 표시한다.
- 식재 아이템은 심볼, 식재명, 라벨을 함께 보여준다.
- 식재명은 `text-sm font-semibold leading-5`
- 식재 라벨/학명은 `.botanical-name text-xs leading-4`
- 팔레트 항목은 클릭으로 배치 가능해야 하며, 드래그로 보드에 놓을 수 있어야 한다.
- 수정/삭제 액션은 항목 우측에 작게 배치하고 hover 시 명확히 보여준다.

### 7) 캔버스 / 보드

- 보드 기본 크기는 `BOARD_WIDTH`, `BOARD_HEIGHT` 값을 기준으로 한다.
- 보드는 배경 이미지가 없을 때 기본 조경 베이스를 렌더링한다.
- 업로드된 도면 이미지는 비율을 유지하고 contain 방식에 가깝게 표시한다.
- 도면 밝기 조절은 `backgroundFade` 값을 사용한다.
- 식재 진하기 조절은 `plantIntensity` 값을 사용한다.
- 보드 위 빈 상태 문구는 식재 배치를 유도하되, 도면 작업을 방해하지 않게 중앙에 작게 표시한다.

### 8) 식재 심볼

- 식재는 단순 원형이 아니라 상단에서 본 수관 느낌의 SVG 심볼로 표시한다.
- `PlantSymbol`은 식재 타입, 색상, 크기를 기반으로 렌더링한다.
- 꽃 타입은 나무/풀/관목과 명확히 구분되어야 한다.
- 꽃 타입은 색상 선택이 가능해야 한다.
- 배치된 식재 이름은 기본 숨김이며 hover 시 작은 툴팁으로 표시한다.
- 선택된 식재의 리사이즈 핸들은 작고 방해되지 않아야 한다.

### 9) 수량 집계

- 현재 조감도에 배치된 식재 수량은 실시간으로 계산한다.
- 수량 집계는 팔레트 항목 기준으로 보여준다.
- 식재명, 라벨, 수량이 한눈에 보여야 한다.
- 수량 숫자는 `text-lg font-semibold text-slate-900` 기준을 유지한다.

### 10) 공유 / 권한

- 공유 패널은 우측 도구 패널 안에서 제공한다.
- 권한은 `owner`, `editor`, `viewer` 기준을 유지한다.
- 소유자만 초대, 권한 변경, 멤버 제거를 할 수 있다.
- 읽기전용 사용자는 조감도 확인과 이미지 내보내기만 가능해야 한다.
- Supabase 환경 변수가 없을 때는 기능 제한 안내를 표시한다.

### 11) 내보내기

- 이미지 내보내기는 `html2canvas`를 사용한다.
- 내보내기 중에는 편집용 UI가 결과물에 들어가지 않도록 `export-hidden` 계열을 유지한다.
- 내보내기 스타일 보정은 `.landi-exporting`에서 관리한다.
- 내보내기 결과의 색상, 경계선, 배경은 라이트 테마 기준으로 안정적으로 고정한다.

### 12) 다크모드

- 다크모드는 단색 중심으로 유지한다.
- 카드 배경에 그라데이션을 사용하지 않는다.
- 기존 라이트 UI의 구조와 대비를 유지한다.
- 다크모드에서 input/select의 배경, 글자색, border가 읽기 어렵지 않아야 한다.

### 13) 스크롤바

- 스크롤바는 얇고 단순하게 유지한다.
- 전역 스크롤바 스타일은 `src/index.css`에서 관리한다.
- 패널 내부 스크롤은 콘텐츠 조작을 방해하지 않아야 한다.

## 색상 토큰

| 용도 | 값 | Tailwind / 사용 예시 |
| --- | --- | --- |
| Primary green | `#4f8738` | `bg-[#4f8738]`, `text-[#4f8738]` |
| Hover green | `#3f6f2d` | `hover:bg-[#3f6f2d]` |
| Soft green | `#edf6e7` | `bg-[#edf6e7]` |
| App background | `#eceee8` | `bg-[#eceee8]` |
| Panel background | `#fbfbf8` | `bg-[#fbfbf8]` |
| Board background | `#f7f7f2` | `bg-[#f7f7f2]` |
| Board border | `#d8ded4` | `border-[#d8ded4]` |
| Selection blue | `#2563eb` | outline, resize handle |
| Text primary | slate-900 | `text-slate-900` |
| Text secondary | slate-500 | `text-slate-500` |
| Border | slate-200 | `border-slate-200` |

## 타이포그래피

- 기본 폰트:
  - `Pretendard`
  - `Noto Sans KR`
  - `Inter`
  - system sans-serif
- 본문: `text-sm` 또는 `text-[13px]`
- 좁은 패널 폼: `13px / 18px`
- 보조 설명: `text-xs` 또는 `text-sm text-slate-500`
- 패널 제목: `text-sm font-semibold`
- 화면 제목: `text-xl ~ text-2xl font-semibold`
- 버튼: `text-sm font-semibold`
- 식재 학명/메모: `.botanical-name`

## TypeScript 규칙

- `any` 사용을 피한다.
- 모든 주요 데이터 구조는 `type` 또는 `interface`로 정의한다.
- 이벤트 핸들러에는 적절한 React 이벤트 타입을 지정한다.
- 식재 타입은 유니온 타입을 유지한다.
- 기존 `PlantKind`, `PlantTemplate`, `Plant`, `Plan` 타입과 호환성을 깨지 않는다.
- Supabase 관련 row 변환 함수는 타입 안정성을 유지한다.

## 스타일링 규칙

- Tailwind utility-first 원칙을 유지한다.
- 단, 반복되는 앱 전용 디자인 기준은 `src/index.css`에 의미 있는 클래스로 둘 수 있다.
- 현재 허용된 앱 전용 클래스 예:
  - `.landi-action-button`
  - `.landi-form-control`
  - `.landi-range`
  - `.landi-panel-toggle`
  - `.landi-editor-panel`
  - `.landi-exporting`
  - `.botanical-name`
- 색상, 간격, 크기는 가능한 Tailwind 표준 스케일을 우선한다.
- 브랜드 컬러처럼 이미 확정된 핵심 토큰은 유지한다.
- 조건부 클래스가 복잡해지면 `cn()` 유틸 도입을 고려한다.
- `cn()` 도입 시 기존 JSX를 한 번에 대규모 변경하지 않고 새 컴포넌트부터 점진 적용한다.

## 컴포넌트 분리 원칙

현재 `src/App.tsx`에 많은 기능이 집중되어 있으므로, 리팩토링은 기능 안정성을 유지하면서 단계적으로 진행한다.

향후 분리 기준은 아래 구조를 따른다.

```text
src/components/layout/
  Sidebar.tsx
  Header.tsx
  EditorShell.tsx

src/components/canvas/
  PlanBoard.tsx
  StaticPlanBoard.tsx
  PlacedPlant.tsx
  ResizeHandle.tsx
  PlantSymbol.tsx
  PlanBase.tsx

src/components/palette/
  PlantPalette.tsx
  PlantPaletteGroup.tsx
  PlantPaletteItem.tsx
  PlantForm.tsx
  FlowerColorPicker.tsx

src/components/dashboard/
  InventoryPanel.tsx
  ViewSettingsPanel.tsx
  SharePanel.tsx

src/components/ui/
  Button.tsx
  Badge.tsx
  Panel.tsx
  IconButton.tsx

src/data/
  plants.ts

src/types/
  index.ts

src/lib/
  supabase.ts
  storage.ts
  export.ts
  cn.ts
```

컴포넌트 분리 시 원칙:

- UI 컴포넌트는 비즈니스 로직과 최대한 분리한다.
- Props 기반으로 동작하게 만든다.
- 기존 동작을 깨지 않는 작은 단위로 분리한다.
- 큰 구조 변경이 필요한 경우 먼저 구조 제안을 요약한 뒤 진행한다.
- 단순 수정 요청은 바로 구현한다.

## 접근성 규칙

- 아이콘 전용 버튼은 반드시 `aria-label`을 제공한다.
- 숨김 텍스트가 필요한 경우 `sr-only`를 사용한다.
- 클릭 가능한 요소는 `button`을 우선 사용한다.
- disabled 상태는 시각적으로도 명확해야 한다.
- 에러 메시지는 가능한 `role="alert"`을 사용한다.
- 상태 메시지는 가능한 `role="status"`를 사용한다.

## 반응형 규칙

- 데스크톱 편집 화면은 좌측 팔레트, 중앙 보드, 우측 도구 패널 구조를 유지한다.
- 모바일에서는 세로 스크롤과 패널 접힘을 허용한다.
- 태블릿 세로 화면에서는 편집 안정성을 위해 가로모드 안내를 표시한다.
- 사용자가 계속하기를 선택한 경우 세로 편집을 허용한다.
- 텍스트가 버튼이나 패널 밖으로 넘치지 않도록 `min-w-0`, `truncate`, 고정 높이를 적절히 사용한다.

## Next 단계 참고

향후 우선 개선 후보:

- `PlantForm.tsx` 분리
- `PlantPalette.tsx` 분리
- `SharePanel.tsx` 분리
- `ViewSettingsPanel.tsx` 분리
- `InventoryPanel.tsx` 분리
- `cn()` 유틸 도입
- 폼 컨트롤 공통 컴포넌트 도입
- Supabase 저장/동기화 로직 분리
- 이미지 내보내기 로직 분리

## 작업 규칙

- 단순 수정 요청은 바로 구현한다.
- 큰 구조 변경이나 리팩토링이 필요한 경우, 코드를 작성하기 전 제안하는 컴포넌트 구조를 먼저 요약한다.
- 모든 신규 파일 상단에는 해당 파일의 역할을 주석으로 명시한다.
- 기존 코드를 수정할 때는 전체를 다시 쓰지 말고 변경된 부분 위주로 효율적으로 수정한다.
- 사용자가 요청한 UI/UX 의도를 우선하되, 기존 데이터와 동작을 깨지 않도록 한다.
- 의미 있는 변경 후에는 `npm.cmd run build`로 검증한다.
- 개발 서버 확인이 필요한 UI 변경은 필요 시 로컬 dev 서버에서 직접 확인한다.
- Git 작업 시 사용자가 만들었을 수 있는 기존 변경을 되돌리지 않는다.

## 검증

변경 후 아래 명령어로 빌드 검증한다.

```bash
npm.cmd run build
```

개발 서버는 보통 아래 주소에서 확인한다.

```text
http://127.0.0.1:5173/
```

## 커밋 규칙

- 커밋 메시지는 반드시 **제목(subject)** 과 **본문(body)** 을 분리해서 작성한다.
- 제목은 한 줄로 간결하게 작성하고, 반드시 맨 앞에 커밋 컨벤션 타입을 붙인다.
- 제목 형식은 반드시 `<type>: <요약>` 을 따른다.
- 허용 타입:
  - `feat`: 새 기능 추가
  - `fix`: 버그 수정
  - `modify`: 일반 수정(리팩터링, 구조/문구/스타일 조정 등)
  - `chore`: 패키지/빌드 설정/에셋 등 부가 작업
  - `remove`: 단순 파일 삭제
  - `rename`: 파일 이동 또는 이름 변경
  - `refactor`: 컴포넌트 분리, 함수 분리 등의 코드 개선
- 본문에는 이번 커밋의 대략적인 수정 사항을 1~3줄로 간단히 적는다.
- 본문은 불필요한 장문 설명 대신, 바뀐 핵심 항목 위주로 요약한다.

사용 예시:

```text
modify: 식재 등록 폼 텍스트 크기 정리

식재 타입 등록 폼의 input/select/placeholder 폰트 기준 통일
전역 select 폰트 상속 기준 추가
```

```text
refactor: 식재 팔레트 폼 컴포넌트 분리

팔레트 등록/수정 폼을 PlantForm 컴포넌트로 분리
기존 상태와 검증 흐름은 App.tsx에서 유지
```

```text
feat: 조감도 공유 권한 패널 추가

소유자 기준 멤버 초대와 권한 변경 UI 추가
읽기전용 사용자 안내 상태 추가
```
