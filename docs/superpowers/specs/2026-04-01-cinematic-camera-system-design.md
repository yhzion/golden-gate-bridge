# Cinematic Camera System Design

## Overview

기존 단일 원형 오비트 + 6개 정적 뷰포인트를 제거하고, CF 촬영 스타일의 **6개 시네마틱 카메라 샷이 자동으로 루프**하는 시스템으로 교체한다. 드라이브 모드(자유 비행)는 유지한다.

## Goals

- 금문교를 관광/홍보 영상처럼 멋있게 보여주는 다양한 카메라 앵글
- 각 샷이 자연스럽게 다음 샷으로 전환되는 무한 루프
- 사용자가 언제든 자유 비행 모드로 전환 가능

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/camera/CinematicShot.ts` | 단일 시네마틱 샷 (스플라인 경로 + lookAt 경로) |
| `src/camera/CinematicDirector.ts` | 샷 시퀀스 관리, 루프, 샷 간 전환 |
| `src/camera/shots.ts` | 6개 샷의 키프레임 데이터 정의 |

### Modified Files

| File | Change |
|------|--------|
| `src/camera/FlightCamera.ts` | `autoFly` 로직 → CinematicDirector 위임, VIEWPOINTS/goToViewpoint 제거 |
| `src/engine/InputManager.ts` | 1~6 키 뷰포인트 → 시네마틱 모드 토글(Escape/클릭으로 복귀) |
| `src/main.ts` | CinematicDirector 연결 |

## CinematicShot

각 샷은 **카메라 위치 경로**와 **lookAt 경로** 두 개의 CatmullRom 스플라인으로 구성된다.

```typescript
interface ShotKeyframe {
  position: [number, number, number];
  lookAt: [number, number, number];
}

interface ShotConfig {
  name: string;
  duration: number;          // seconds
  keyframes: ShotKeyframe[];
  easing?: 'linear' | 'easeInOut';  // default: easeInOut
}
```

- `THREE.CatmullRomCurve3`로 position과 lookAt 각각 보간
- 시간 t (0→1)에 따라 스플라인 위의 점을 샘플링
- easeInOut: smoothstep `t² × (3 - 2t)` 적용으로 시작/끝에서 감속

## CinematicDirector

샷 시퀀스를 관리하는 상태머신:

```
[Shot 0] → [Crossfade] → [Shot 1] → [Crossfade] → ... → [Shot 5] → [Crossfade] → [Shot 0] (loop)
```

- 현재 샷이 끝나면 다음 샷으로 **2초 크로스페이드** 전환
- 크로스페이드 중: 현재 샷의 마지막 위치/방향에서 다음 샷의 첫 위치/방향으로 position lerp + quaternion slerp
- `isActive` 프로퍼티로 시네마틱 모드 on/off
- `update(dt)` → 카메라 position/quaternion 직접 설정

## 6개 시네마틱 샷 설계

브릿지 좌표계 참고:
- mainSpan = 1280 (남쪽 타워 z=0, 북쪽 타워 z=1280)
- deckH = 67, towerH = 227
- 다리 중심 x=0, 데크 폭 ±13.7

### Shot 1: Dramatic Reveal (12s)

수면에서 시작해 상승하며 다리 전경을 드러내는 도입부.

```
키프레임:
  [0] pos(-300, 8, -500)     lookAt(0, 67, 400)      - 수면 근처, 먼 곳에서
  [1] pos(-200, 40, -200)    lookAt(0, 67, 500)      - 접근하며 상승
  [2] pos(-120, 90, 100)     lookAt(0, 80, 640)      - 다리 옆에서 올려봄
  [3] pos(-80, 150, 400)     lookAt(0, 100, 640)     - 높은 곳에서 전경
```

### Shot 2: Tower Fly-by (10s)

남쪽 타워를 가까이 스쳐 지나가며 위엄을 보여줌.

```
키프레임:
  [0] pos(40, 60, -100)      lookAt(0, 150, 0)       - 타워 앞 접근
  [1] pos(25, 120, -20)      lookAt(0, 200, 0)       - 타워 옆 상승
  [2] pos(-10, 200, 30)      lookAt(0, 227, 0)       - 타워 꼭대기 근처
  [3] pos(-40, 180, 120)     lookAt(0, 150, 300)     - 타워 뒤로 빠지며
```

### Shot 3: Deck Drive-through (14s)

데크 위를 운전자 시점으로 관통하며 다리의 길이감을 체감.

```
키프레임:
  [0] pos(3, 72, -250)       lookAt(3, 70, 200)      - 남쪽 진입부
  [1] pos(3, 72, 200)        lookAt(3, 70, 600)      - 남쪽 타워 통과
  [2] pos(3, 72, 640)        lookAt(3, 70, 1000)     - 중앙부
  [3] pos(3, 72, 1100)       lookAt(3, 70, 1400)     - 북쪽 타워 접근
  [4] pos(3, 72, 1500)       lookAt(3, 70, 1800)     - 북쪽 빠져나감
```

### Shot 4: Cable Ride (12s)

메인 케이블을 따라 올라가는 독특한 시점.

```
키프레임:
  [0] pos(16, 72, -200)      lookAt(16, 100, 0)      - 앵커리지 근처
  [1] pos(16, 110, 100)      lookAt(16, 180, 0)      - 케이블 따라 상승
  [2] pos(16, 200, -20)      lookAt(0, 227, 0)       - 타워 꼭대기 새들 근처
  [3] pos(16, 160, 300)      lookAt(0, 100, 640)     - 케이블 따라 하강
  [4] pos(16, 90, 640)       lookAt(0, 80, 640)      - 중앙 최저점
```

### Shot 5: Under the Bridge (10s)

수면 위에서 다리 하부 구조를 올려다보며 통과.

```
키프레임:
  [0] pos(50, 12, -100)      lookAt(0, 60, 200)      - 수면에서 접근
  [1] pos(30, 15, 200)       lookAt(0, 67, 400)      - 다리 아래 진입
  [2] pos(-10, 18, 640)      lookAt(0, 67, 640)      - 중앙부 올려봄
  [3] pos(-40, 15, 1100)     lookAt(0, 67, 900)      - 빠져나오며 뒤돌아봄
```

### Shot 6: Aerial Panorama (14s)

높은 곳에서 넓은 원호를 그리며 다리와 주변 전경.

```
키프레임:
  [0] pos(-600, 350, -200)   lookAt(0, 50, 640)      - 남서쪽 높은 곳
  [1] pos(-400, 380, 640)    lookAt(0, 50, 640)      - 서쪽
  [2] pos(-100, 360, 1500)   lookAt(0, 50, 640)      - 북서쪽
  [3] pos(300, 340, 1200)    lookAt(0, 50, 640)      - 북동쪽
  [4] pos(400, 320, 400)     lookAt(0, 50, 640)      - 동쪽
```

## 샷 간 전환

- **크로스페이드 시간**: 2초
- **전환 방식**: 현재 샷 마지막 카메라 상태에서 다음 샷 첫 카메라 상태로
  - Position: `Vector3.lerpVectors()`
  - Rotation: `Quaternion.slerpQuaternions()`
  - Easing: smoothstep

## 모드 전환

| 상태 | 전환 조건 |
|------|-----------|
| 시네마틱 루프 (기본) | 페이지 로드 시 자동 시작 |
| 자유 비행 | 캔버스 클릭 → pointer lock 진입 시 |
| 시네마틱 복귀 | Escape(pointer lock 해제) 시 현재 위치에서 다음 샷으로 크로스페이드 |

## 기존 코드 제거 대상

- `FlightCamera`: `VIEWPOINTS` 상수, `Viewpoint` 인터페이스, `goToViewpoint()`, `autoFly`/`autoAngle` 관련 코드
- `InputManager`: 숫자키 1~6 뷰포인트 콜백 (7,8,9 날씨 전환은 유지)
- `main.ts`: `flight.goToViewpoint(n)` 호출부
- `index.html`: viewpoint-label 관련 요소 (있다면)

## UI 변경

- 샷 전환 시 하단에 샷 이름을 2초간 페이드 표시 (기존 viewpoint-label 재활용 가능)
- HUD에 현재 모드 표시: `CINEMATIC` / `FREE FLIGHT`

## 의존성

- `THREE.CatmullRomCurve3` (Three.js 내장)
- 추가 패키지 불필요
