# Celestial Sky Environment Design

> 시간에 따른 하늘 환경 — 멀티 레이어 천체 시스템

## 1. 개요

골든 게이트 브릿지 3D 시각화 프로젝트에 **시네마틱(예술적) 밤하늘 시스템**을 구축한다. 기존 단일 셰이더(`NightSky.ts`)를 8개 독립 레이어 + 오케스트레이터 구조로 교체하여, 시간대에 따른 점진적 천체 등장, 실제 날짜 기반 달/행성 위치, 달빛-광해 상호작용을 구현한다.

### 목표
- **시네마틱 경험**: 실제보다 아름답게. 밝기/색상은 예술적으로 강화하되, 천체 배치와 등장 순서는 과학적 근거에 기반
- **매번 다른 밤하늘**: 현실 날짜 동기화(달 월령, 행성 위치) + 시간대별 광해 변화 + 랜덤 이벤트(유성우, 오로라) 조합으로 반복 없는 경험
- **기존 시스템 존중**: `TimeOfDay`, `WeatherSystem`, `MaterialUpdater` 패턴을 따르며, 변경 최소화

### 제거 대상
- `src/atmosphere/NightSky.ts` — 아래 모듈들로 완전 대체

## 2. 아키텍처

### 2.1 디렉토리 구조

```
src/atmosphere/celestial/
├── CelestialSystem.ts        — 오케스트레이터
├── EphemerisCalculator.ts    — 천문 계산 (달/행성 위치)
├── SkyGradient.ts            — 하늘 배경 + 광해 글로우
├── StarField.ts              — 항성 (셰이더)
├── ConstellationMap.ts       — 별자리 별 강조
├── MilkyWay.ts               — 은하수 밴드 (셰이더)
├── PlanetRenderer.ts         — 행성 4개 (3D Billboard)
├── MoonRenderer.ts           — 달 (3D Mesh + 텍스처)
├── MeteorShower.ts           — 유성우 (파티클)
└── AuroraEffect.ts           — 오로라 (셰이더)
```

### 2.2 데이터 흐름

```
TimeOfDay ──→ CelestialSystem.update(nightFactor, hour, elapsed, dt, overcastFactor)
                  │
Date.now() ──→ EphemerisCalculator.calculate(date, hour)
                  │
                  ├── MoonRenderer      → moonlightFactor 산출
                  ├── SkyGradient       → lightPollution 산출
                  ├── PlanetRenderer    ← 행성 위치
                  ├── StarField         ← moonlightFactor, lightPollution
                  ├── ConstellationMap  ← hour (천구 회전)
                  ├── MilkyWay          ← moonlightFactor, lightPollution
                  ├── MeteorShower      ← nightFactor (랜덤 체크)
                  └── AuroraEffect      ← nightFactor (랜덤 체크)

반환: { moonlightFactor, moonDirection } → MaterialUpdater
```

### 2.3 update() 실행 순서

순서가 중요하다. 달과 광해가 먼저 계산되어야 다른 레이어에 감쇄 값을 전달할 수 있다.

1. `ephemeris.calculate(Date.now(), hour)` — 달/행성 위치 계산
2. `moonRenderer.update(moonState, nightFactor)` — 달 렌더링, moonlightFactor 산출
3. `skyGradient.update(hour, nightFactor)` — 광해 + 배경, lightPollution 산출
4. `planetRenderer.update(planets, nightFactor)` — 행성 배치
5. `starField.update(nightFactor, moonlightFactor, lightPollution)` — 별밭
6. `constellationMap.update(hour)` — 별자리 가중치 갱신
7. `milkyWay.update(nightFactor, moonlightFactor, lightPollution)` — 은하수
8. `meteorShower.update(nightFactor, elapsed, dt)` — 유성우 (랜덤 체크)
9. `auroraEffect.update(nightFactor, elapsed, dt)` — 오로라 (랜덤 체크)

## 3. 3단계 등장 시스템

`nightFactor` 값에 따라 천체가 순차적으로 등장한다. 각 레이어는 고유 등장 임계값을 가진다.

| 단계 | nightFactor 범위 | 등장 레이어 |
|------|-----------------|------------|
| **1단계 (초저녁)** | 0.15 ~ 0.50 | MoonRenderer (0.15), PlanetRenderer (0.20), StarField 밝은별 (0.25) |
| **2단계 (완전 야간)** | 0.50 ~ 0.80 | StarField 전체 (0.50), ConstellationMap (0.55), MilkyWay (0.60) |
| **3단계 (특수 이벤트)** | 0.80+ | MeteorShower (0.80 + 랜덤), AuroraEffect (0.80 + 랜덤) |

각 레이어는 임계값에서 즉시 100%가 아니라, `smoothstep`으로 부드럽게 페이드인한다.

## 4. 레이어 상세 설계

### 4.1 SkyGradient — 하늘 배경 + 광해

**렌더링**: 스카이 셰이더 (기존 NightSky 구체 활용)

**역할**:
- 밤하늘 그라데이션: 천정 깊은 남색(#0a0a20) → 수평선으로 밝아짐
- 광해 글로우: 도시 방향(남동쪽, SF 다운타운)에 따뜻한 주황~백색 글로우

**광해 감소 곡선** (`hourDecay`):

| 시간 | hourDecay | 설명 |
|------|-----------|------|
| 19:00 | 1.0 | 도시 불빛 최대 |
| 21:00 | 0.85 | 상업시설 마감 시작 |
| 23:00 | 0.65 | 야간 조명 감소 |
| 01:00 | 0.45 | 심야 |
| 03:00 | 0.35 | 가장 어두운 시간 |
| 05:00 | 0.50 | 새벽 활동 시작 |

**광해 고도 감쇄**: `effectivePollution = lightPollution × (1 - altitude / 90°)²`
- 수평선 근처에만 강하고, 천정으로 갈수록 영향 감소

### 4.2 StarField — 항성

**렌더링**: 스카이 셰이더 (SkyGradient와 단일 구체 공유)

**2단 등장**:
- **1단계 밝은 별** (nF 0.25+): ~20개, 1등성급. 크고 밝은 점
- **2단계 전체 별밭** (nF 0.50+): ~3000개, 작고 희미한 별들이 서서히 채워짐

**트윙클링**: 밝은 별은 느린 주기(2~3초), 희미한 별은 빠른 주기(0.5~1초)

**색온도 분포** (별 해시값 기반):
- O/B형 (파란~청백): 10%
- A/F형 (백~황백): 30%
- G형 (황, 태양형): 25%
- K/M형 (주황~적): 35%

**광해/달빛 영향**: 밝기 threshold가 상승하여 희미한 별부터 사라짐

### 4.3 ConstellationMap — 별자리

**렌더링**: StarField에 밝기 가중치 데이터 제공 (독립 드로우콜 없음)

**표현 방식**: 연결선 없음. 별자리에 속한 별의 밝기/크기를 1.3~1.5배 강조하여 패턴이 자연스럽게 드러남

**데이터**: SF 위도(37.8°N)에서 관측 가능한 주요 15개 별자리의 핵심 별 좌표(적경/적위)와 실제 겉보기 등급
- 겨울: 오리온, 큰개, 쌍둥이, 황소, 마차부
- 봄: 사자, 처녀, 목동
- 여름: 백조, 거문고, 독수리 (여름 대삼각형), 전갈
- 가을: 페가수스, 안드로메다, 카시오페이아
- 연중: 큰곰

**천구 회전**: 항성시 기반, 1시간에 15도씩 회전. `hour` 값으로 계산.

### 4.4 MilkyWay — 은하수

**렌더링**: 스카이 셰이더 (StarField와 단일 구체 공유)

**형태**: FBM 노이즈 기반 밴드 (기존 로직 유지, 개선)
- **은하 좌표계 기반 위치 고정**: 현재 임의 위치 → 실제 은하면(b=0°) 기준
- 시간에 따른 천구 회전 반영

**감쇄**:
- 달빛: `brightness × (1 - moonlightFactor × 0.8)` — 보름달이면 거의 안 보임
- 광해: 가장 민감. `lightPollution > 0.5`이면 거의 보이지 않음
- 등장 임계값 가장 높음 (nF 0.60+)

### 4.5 PlanetRenderer — 행성

**렌더링**: 3D Billboard Sprite (개별 `THREE.Sprite` 4개)

**대상 행성과 특성**:

| 행성 | 겉보기 등급 | 색상 | 트윙클링 |
|------|-----------|------|---------|
| 금성 | -4.6 (최대) | 순백 #FFFFF0 | 없음 |
| 목성 | -2.5 | 크림 #FFEECC | 없음 |
| 화성 | +1.0 (가변) | 적색 #FF6644 | 없음 |
| 토성 | +0.5 | 금색 #FFE8AA | 없음 |

**핵심 차이점**: 별과 달리 **트윙클링 없음** (면광원이므로 대기 산란에 덜 민감)

**위치**: `EphemerisCalculator`에서 실제 날짜 기반 계산. 고도각 < 0이면 숨김.

**등장**: nF 0.20+ — 별보다 먼저 등장 (초저녁의 첫 번째 빛)

### 4.6 MoonRenderer — 달

**렌더링**: `THREE.SphereGeometry` + NASA 달 텍스처 매핑

**월상 구현**: 태양 방향 벡터로 `DirectionalLight`를 달 메시에 비춰 자연스러운 그림자 → 초승달~보름달 표현

**실시간 월령**: `Date.now()` 기준. 기준 삭(2000-01-06)으로부터 경과일 ÷ 29.53059일 = phase (0=삭, 0.5=보름)

**시각적 과장**: 실제 시야각(~0.5°)보다 2~3배 크게 렌더링 (시네마틱)

**글로우**: UnrealBloomPass와 연동되는 외곽 글로우

**조명 영향 출력**:
```
moonlightFactor = phase에서_파생된_illumination × (altitude > 0 ? smoothstep(0, 0.3, altitude) : 0)
```
이 값을 `CelestialSystem`이 다른 레이어들에 전달

**등장**: nF 0.15+ — 전체 레이어 중 가장 먼저

### 4.7 MeteorShower — 유성우

**렌더링**: `THREE.Line` 기반 파티클 시스템

**두 가지 모드**:
- **산발 유성**: nF 0.80+ 상태에서 30초~2분 랜덤 간격으로 1개. 하늘 임의 위치에서 빠르게 스침
- **유성우 이벤트**: nF 0.80+ 상태에서 매 분 5~10% 확률 체크. 발생 시 하나의 복사점에서 3~8개가 10~30초간 연속

**유성 개별 특성**:
- 수명: 0.5~1.5초
- 색상: 흰색 → 주황 → 소멸
- 꼬리: 시작점 밝고 끝으로 페이드아웃
- 최대 동시 10개 제한

### 4.8 AuroraEffect — 오로라

**렌더링**: 스카이 셰이더 (StarField와 단일 구체 공유)

**발생 조건**: nF 0.80+ 상태에서 낮은 확률(~3%/분). SF 위도에서는 예술적 허용.

**형태**: 북쪽 하늘 한정, 초록(#1ACC4D)/보라(#6619CC) 커튼형 물결

**생애주기**:
1. 서서히 밝아짐 (5~10초)
2. 활성 상태 (30~120초, 물결 애니메이션)
3. 서서히 소멸 (10~15초)

## 5. 상호작용 시스템

### 5.1 달빛 감쇄 (moonlightFactor)

`MoonRenderer`가 산출한 `moonlightFactor` (0~1)에 따라 다른 레이어 밝기를 감쇄.

| 대상 | 감쇄 공식 | 보름달 효과 |
|------|----------|------------|
| StarField (희미한 별) | `× (1 - moonlightFactor × 0.6)` | 60% 감소 |
| MilkyWay | `× (1 - moonlightFactor × 0.8)` | 80% 감소 (거의 안 보임) |
| AuroraEffect | 영향 없음 | — |
| PlanetRenderer | 영향 없음 | — |

### 5.2 광해 감쇄 (lightPollution)

`SkyGradient`가 산출한 `lightPollution` (0~1)에 따라 감쇄.

```
lightPollution = basePollution(0.8) × hourDecay(시간대)
effectivePollution = lightPollution × (1 - altitude/90°)²
```

| 대상 | 감쇄 방식 |
|------|----------|
| StarField | 밝기 threshold 상승 (희미한 별 사라짐) |
| MilkyWay | 직접 밝기 감소 (가장 민감) |
| ConstellationMap | StarField 경유 간접 영향 |
| PlanetRenderer | 영향 미미 |

### 5.3 날씨 연동

`WeatherSystem`의 `overcastFactor`를 전달받아 전체 천체 가시성 조절.

| overcastFactor | 상태 | 천체 가시성 |
|---------------|------|-----------|
| 0 | 맑음 | 100% |
| 0.7 | 안개 | 30% (달만 희미하게) |
| 0.9 | 비 | 거의 안 보임 (달 글로우만 약간) |

## 6. EphemerisCalculator 상세

### 6.1 인터페이스

```typescript
interface CelestialPosition {
  azimuth: number;     // 방위각 (라디안, 북=0, 시계방향)
  altitude: number;    // 고도각 (라디안, 수평선=0)
}

interface MoonState extends CelestialPosition {
  phase: number;       // 0~1 (0=삭, 0.5=보름)
  illumination: number; // 0~1 조명 비율
}

interface PlanetState extends CelestialPosition {
  name: 'venus' | 'mars' | 'jupiter' | 'saturn';
  magnitude: number;   // 겉보기 등급
  color: THREE.Color;
}

class EphemerisCalculator {
  calculate(date: Date, hour: number): {
    moon: MoonState;
    planets: PlanetState[];
  };
}
```

### 6.2 달 계산

- **월령**: 기준 삭 2000-01-06, 삭망월 29.53059일. `phase = ((julianDays - epoch) % 29.53059) / 29.53059`
- **위치**: 평균 황경 계산 후 적경/적위 → 방위각/고도각 변환
- **출몰**: `altitude > 0`이면 수평선 위

### 6.3 행성 계산

- J2000.0 기준 궤도 요소(상수) 보유
- Julian Date → 평균근점이각 → 케플러 방정식(5회 반복) → 진근점이각 → 황경/황위 → 적경/적위 → 방위각/고도각
- 정밀도 ±1도 (시각적 용도 충분)

### 6.4 좌표 변환

- 관측 위치: 샌프란시스코 (위도 37.8°N, 경도 122.4°W) 고정
- 적경/적위 → 시간각 → 방위각/고도각

### 6.5 캐싱

천체 위치는 분 단위로 변화하므로 매 프레임 계산 불필요. **30초 간격으로 재계산**, 결과 캐시.

## 7. 성능 최적화

| 항목 | 전략 |
|------|------|
| 셰이더 통합 | StarField, MilkyWay, SkyGradient, AuroraEffect는 **단일 스카이 구체** 공유. GLSL 함수별 분리, uniform으로 on/off |
| 천문 계산 캐시 | EphemerisCalculator 30초 간격 재계산 |
| 낮 비용 제로 | `nightFactor < 0.01`이면 `CelestialSystem` 전체 `visible = false` |
| 유성 제한 | 최대 동시 10개 파티클 |
| 달/행성 LOD | 카메라 거리와 무관 (항상 먼 거리, 고정 크기) |

### 셰이더 모듈 구조

파일은 모듈별로 분리하되, 빌드 시 GLSL import로 하나의 셰이더에 합친다:

```
sky-layers.frag
├── #include <sky-gradient.glsl>
├── #include <starfield.glsl>
├── #include <milkyway.glsl>
└── #include <aurora.glsl>

uniforms:
  uStarFieldIntensity, uMilkyWayIntensity, uAuroraIntensity,
  uLightPollution, uMoonlightFactor, uNightFactor, uTime, uHour
```

## 8. 기존 시스템 통합

변경을 최소화한다.

| 파일 | 변경 내용 |
|------|----------|
| `src/main.ts` | `NightSky` 임포트/생성 → `CelestialSystem` 교체. update 호출부 변경 |
| `src/atmosphere/MaterialUpdater.ts` | `nightSky.update()` 제거. `celestialSystem.update()` 호출, 반환된 `moonlightFactor` 조명 반영 |
| `src/atmosphere/NightSky.ts` | 삭제 |
| `src/atmosphere/TimeOfDay.ts` | 변경 없음 |
| `src/atmosphere/WeatherSystem.ts` | 변경 없음 |
| `src/world/Lighting.ts` | 변경 없음 |

### main.ts 통합 예시

```typescript
// Before
const nightSky = new NightSky();
scene.add(nightSky.mesh);
// in loop:
nightSky.update(nightFactor, elapsed);

// After
const celestialSystem = new CelestialSystem(scene);
// in loop:
const { moonlightFactor, moonDirection } = celestialSystem.update(
  nightFactor, hour, elapsed, dt, weatherState.overcastFactor
);
```

## 9. 에셋 요구사항

| 에셋 | 용도 | 소스 |
|------|------|------|
| 달 텍스처 (diffuse) | MoonRenderer | NASA CGI Moon Kit (공개 도메인) |
| 달 텍스처 (normal, optional) | 크레이터 입체감 | NASA CGI Moon Kit |

별자리 데이터(적경/적위/등급)는 코드 내 상수로 정의. 외부 파일 불필요.
