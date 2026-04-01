# Golden Gate Bridge Cinematic Lighting System Design

**Date:** 2026-04-01
**Approach:** Full Cinematic (다수 조명 + 볼류메트릭 + 동적 그림자)

## Overview

금문교 3D 프로젝트에 영화적 수준의 조명시스템을 추가한다. 타워 업라이트, 케이블 장식, 도로 조명, 항공 안전등, 볼류메트릭 안개 산란, God Rays, 렌즈 플레어를 포함하며, 적응형 품질 시스템으로 성능을 자동 관리한다.

## Architecture

### LightingManager (총괄 컨트롤러)

`LightingManager`는 4개 조명 레이어와 `QualityTier`를 소유하며, 매 프레임 `TimeOfDay`와 `WeatherSystem` 상태를 받아 모든 조명을 갱신한다.

```
main.ts → LightingManager
             ├─ StructuralLights   (Layer 1)
             ├─ RoadLights         (Layer 2 - Road)
             ├─ SafetyLights       (Layer 2 - Safety)
             ├─ QualityTier        (Performance guard)
             ├─ TimeOfDay          (읽기 전용)
             └─ WeatherSystem      (읽기 전용)

PostFXPipeline
  ├─ VolumetricFogPass
  ├─ GodRaysPass
  ├─ LensFlarePass
  └─ LightingManager  (광원 위치/색상 참조)
```

### Layer 1: Structural Lighting (구조물 강조)

| 광원 | 수량 | 대상 | Shadow |
|------|------|------|--------|
| SpotLight | 4 | 남/북 타워 각 2개 업라이트 | Budget 시스템에 의해 최대 2개 동시 |
| RectAreaLight | 2 | 교각 하부 → 수면 반사 | 없음 |
| PointLight | 4 | 케이블 새들(saddle) 포인트 | 없음 |

**타워 업라이트 상세:**
- 각 타워 기단부 양쪽에 1개씩 배치 (총 4개)
- 색온도 2700K (amber, `#ffb347`)
- 타워 상부를 향해 약 15° 내향 각도
- 야간 최대 intensity 1.5, 주간 OFF
- Blue Hour(19:00~20:00)에 서서히 점등

**케이블 새들 PointLight:**
- 각 타워 상단 케이블 통과 지점에 1개씩 (4개)
- 케이블의 곡선 시작점을 은은하게 강조
- intensity 0.5, distance 50, decay 2

**교각 RectAreaLight:**
- 각 타워 기단 수면 아래에 배치
- 수면(Water plane)에 따뜻한 반사광 생성
- width 30, height 10, intensity 0.8

### Layer 2: Cable Accent (케이블 장식)

메인 케이블과 서스펜더 접합점에 emissive 효과를 추가한다.

**메인 케이블:**
- 기존 케이블 TubeGeometry의 material에 `emissive` + `emissiveIntensity` 추가
- 야간: emissiveIntensity 0.8 (amber `#ffcc88`)
- 주간: emissiveIntensity 0.0
- Bloom 후처리와 결합하여 자연스러운 광망 효과

**서스펜더 접합점:**
- InstancedMesh로 작은 emissive sphere (radius 0.15) 배치
- 각 서스펜더와 메인 케이블 접합 지점
- 야간 emissiveIntensity 1.0, Bloom으로 확산

**케이블 간접광:**
- PointLight ×6을 메인 케이블 곡선을 따라 등간격 배치
- intensity 0.3, distance 80, castShadow false
- 케이블 주변 공간을 부드럽게 밝힘

### Layer 3: Road & Safety (도로/안전)

**가로등 PointLight (LOD 관리):**
- 기존 가로등 InstancedMesh 위치에 PointLight 배치
- 총 가로등 수: ~80개 (기존), PointLight는 LOD로 관리:
  - 0~300m: PointLight 활성 (최대 10개)
  - 300~1000m: Emissive만
  - 1000m+: Emissive + Bloom만
- 색온도 3000K (`#ffddaa`), intensity 0.8, distance 30
- 야간 점등, 06:30 소등

**항공 장애등 점멸:**
- 기존 타워 상단 aviation beacon emissive를 점멸 패턴으로 변경
- 패턴: 1초 주기 sin() oscillation (peak emissiveIntensity 3.0, trough 0.5)
- 야간: 빠른 점멸 (0.8초 주기)
- 주간: 느린 점멸 (1.5초 주기)
- 색상: 순적색 `#ff0000` (FAA 규정)

**차량 전조등:**
- 기존 VehicleSystem의 야간 전조등에 선택적 PointLight 추가
- 카메라 300m 이내 차량만 PointLight 활성 (최대 4개)
- 색상: 백색 `#ffffee`, intensity 0.6, distance 40

### Layer 4: Atmospheric FX (대기 효과)

#### Volumetric Fog Pass

깊이 버퍼 기반 레이마칭으로 광원 주변 안개 산란을 계산하는 풀스크린 후처리 셰이더.

**알고리즘:**
1. 카메라에서 픽셀 방향으로 레이 발사
2. depthBuffer까지 16 스텝 마칭 (dithered offset으로 밴딩 방지)
3. 각 스텝에서 활성 광원(최대 8개)까지 거리 계산
4. Henyey-Greenstein 위상 함수로 산란 강도 결정 (anisotropy g=0.7)
5. Beer-Lambert 법칙으로 감쇠 누적
6. 결과를 fogScatterTexture로 출력

**셰이더 Uniforms:**
- `lightPositions[8]`: vec3 — 활성 광원 월드 좌표
- `lightColors[8]`: vec3 — 광원 색상
- `lightIntensities[8]`: float — 광원 강도
- `numActiveLights`: int — 활성 광원 수
- `fogDensity`: float — WeatherSystem 연동 (Clear: 0.0001, Fog: 0.001, Rain: 0.0005)
- `fogColor`: vec3 — TimeOfDay 연동
- `anisotropy`: float — 전방 산란 편향 (0.7)

**성능 최적화:**
- Half-res 렌더링 옵션 (1/2 해상도 계산 → bilinear 업스케일)
- Temporal reprojection: 이전 프레임 결과를 현재 카메라로 재투영, 블렌드 팩터 0.9
- 가장 가까운/밝은 8개 광원만 처리

#### God Rays Pass

밝은 광원 영역에서 방사형 블러를 적용하여 라이트 샤프트를 생성한다.

**방식:**
1. Occlusion mask 생성: 장면의 밝은 영역만 추출 (threshold)
2. 광원의 스크린 좌표를 중심으로 방사형 블러 (6 samples)
3. 결과를 원본에 additive 합성

**대상:**
- 태양 (주간/골든아워): 강한 God Rays
- 타워 SpotLight (야간/안개): 안개 속 광기둥
- 가로등 (야간/안개): 아래로 내리꽂는 빛줄기

#### Lens Flare Pass

스크린 스페이스에서 밝은 광원 위치에 렌즈 플레어를 생성한다.

**타입별 플레어:**
- 항공등: 빨간 hexagonal flare (6각형 고스트)
- 가로등: 따뜻한 star flare (4~6 포인트 스타)
- 태양: 대형 anamorphic streak (수평 줄무늬)

**구현:** 광원의 스크린 좌표 → occlusion test (depthBuffer) → 플레어 스프라이트 렌더링. 광원이 가려지면 페이드아웃.

## Time-of-Day Lighting Scenarios

모든 전환은 lerp 보간으로 부드럽게 처리한다. 갑작스러운 on/off 없음.

### Golden Hour (17:00~19:00)
- 자연광만으로 International Orange 최대 채도
- 구조 조명 OFF
- 태양 저각도로 케이블에 금빛 반사 → Bloom threshold 0.8
- God Rays: 약한 태양 광선

### Blue Hour (19:00~20:00)
- 타워 SpotLight 서서히 점등 (0 → 1.0 intensity, 2분 전환)
- 2700K amber vs 짙은 파랑 하늘 보색 대비
- 가로등 순차 점등 (3000K)
- 항공등 점멸 시작
- 케이블 emissive 점등
- Bloom threshold 0.6

### Night (20:00~22:00)
- 모든 인공 조명 최대 강도
- 타워 SpotLight intensity 1.5
- 가로등 PointLight 활성
- Bloom threshold 0.4
- Lens Flare 활성

### Night + Fog (22:00~04:00, 안개 시)
- Volumetric Fog 최대 밀도
- 모든 광원 주변 산란 halo 극대화
- 타워 SpotLight → 안개 속 광기둥(light pillar)
- God Rays: 가로등 아래 빛줄기
- Bloom threshold 0.2~0.3, strength 1.2
- 금문교의 시그니처 야경

### Dawn Transition (05:00~07:00)
- 인공광 → 자연광 크로스페이드 (2분 전환)
- 구조등 서서히 페이드아웃
- 가로등 06:30 소등
- 동쪽에서 태양 God Rays
- Bloom threshold 0.5 → 0.9

### Day (08:00~16:00)
- 인공 조명 OFF (항공등 제외)
- 항공등: 느린 점멸 유지 (1.5초 주기)
- 자연광(DirectionalLight + HemisphereLight + AmbientLight)만
- Bloom threshold 0.9, strength 0.3

## Parameter Table

| Parameter | Golden | Blue | Night | Night+Fog | Dawn | Day |
|-----------|--------|------|-------|-----------|------|-----|
| Tower SpotLight intensity | OFF | 0→1.0 | 1.5 | 1.5 | 1.0→0 | OFF |
| Cable emissiveIntensity | 0.0 | 0→0.8 | 1.0 | 1.0 | 0.8→0 | 0.0 |
| Street PointLight intensity | OFF | 0→0.8 | 0.8 | 0.8 | 0.8→0 | OFF |
| Aviation strobe period | 1.5s | 1.2s | 0.8s | 0.8s | 1.0s | 1.5s |
| Bloom threshold | 0.8 | 0.6 | 0.4 | 0.2 | 0.5 | 0.9 |
| Bloom strength | 0.3 | 0.5 | 0.8 | 1.2 | 0.5 | 0.3 |
| God Rays intensity | 0.3 | OFF | OFF | 0.8 | 0.5 | OFF |
| Volumetric Fog density | OFF | 0.0002 | 0.0003 | 0.001 | 0.0004 | OFF |

## Performance Optimization

### Adaptive Quality Controller

`QualityTier` 모듈이 FPS를 60프레임 롤링 평균으로 모니터링하고, 2초 쿨다운 후 Tier를 전환한다.

| Tier | 조건 | SpotLight Shadow | Volumetric | God Rays | PointLight | Shadow Map |
|------|------|-----------------|------------|----------|-----------|-----------|
| HIGH | FPS ≥ 50 | ×3 (Sun + 2 Spot) | Full-res | 6 samples | ×20 (LOD) | 2048² |
| MEDIUM | FPS 30~49 | ×1 (Sun only) | Half-res | OFF | ×8 | 1024² |
| LOW | FPS < 30 | OFF | OFF | OFF | ×4 | OFF |

### LOD Light Management

카메라 거리 기반 3단계:
- **Near (0~300m):** PointLight + Shadow + Flare — 최대 품질
- **Mid (300~1000m):** PointLight (no shadow) + Emissive
- **Far (1000m+):** Emissive + Bloom만

매 프레임 카메라 위치에서 각 가로등까지 거리를 계산하고, 가장 가까운 N개만 PointLight 활성화. N은 QualityTier에 의해 결정 (HIGH: 20, MEDIUM: 8, LOW: 4).

### Shadow Budget System

동시 활성 그림자맵을 제한하여 VRAM과 GPU 부하를 관리한다.

- Sun DirectionalLight: 항상 활성 (2048², 16MB) — 1 슬롯 고정
- SpotLight 슬롯: 최대 2개 (각 1024², 4MB)
- 매 프레임 카메라 거리순 정렬 → 가장 가까운 SpotLight 2개에 그림자 할당
- 그림자 전환 시 1초 페이드 (shadow opacity를 lerp하여 pop 방지)
- 총 VRAM 예산: ~24MB

## File Structure

### New Files (8)

```
src/lighting/
  LightingManager.ts      — 총괄 컨트롤러
  StructuralLights.ts     — 타워/교각/케이블 조명
  RoadLights.ts           — 가로등 PointLight LOD
  SafetyLights.ts         — 항공등 점멸, 차량 전조등
  QualityTier.ts          — FPS 모니터링 & Tier 자동 조절

src/postfx/
  VolumetricFogPass.ts    — 레이마칭 안개 셰이더
  GodRaysPass.ts          — 라이트 샤프트 후처리
  LensFlarePass.ts        — 스크린 스페이스 플레어
```

### Modified Files (6)

| File | Change |
|------|--------|
| `src/main.ts` | LightingManager 생성, 게임 루프에 update 등록 |
| `src/world/Lighting.ts` | 기존 DirectionalLight/HemisphereLight/AmbientLight 생성 로직 유지, LightingManager에서 참조 |
| `src/postfx/PostFXPipeline.ts` | VolumetricFogPass, GodRaysPass, LensFlarePass 추가, LightingManager에서 광원 위치 수신 |
| `src/atmosphere/MaterialUpdater.ts` | LightingManager 연동 — emissive intensity 갱신을 LightingManager에 위임 |
| `src/engine/InputManager.ts` | L (Quality Tier 전환), V (Volumetric 토글), G (God Rays 토글) 키 바인딩 추가 |
| `src/ui/HUD.ts` | 현재 Quality Tier 표시 (HIGH/MEDIUM/LOW/AUTO), FPS 카운터 |

### Module Interfaces

```typescript
// LightingManager
constructor(scene: Scene, camera: Camera)
update(dt: number, timeState: TimeState, weatherState: WeatherState): void
setQualityTier(tier: 'low' | 'medium' | 'high' | 'auto'): void
getLightPositions(): Vector3[]   // PostFX passes에서 참조
getLightColors(): Color[]        // PostFX passes에서 참조
dispose(): void

// QualityTier
constructor(targetFPS: number)
sample(dt: number): void         // 매 프레임 호출
getCurrentTier(): Tier
onTierChange(callback: (tier: Tier) => void): void
setMode(mode: 'auto' | 'manual'): void
setManualTier(tier: Tier): void

// VolumetricFogPass (extends Pass)
constructor(resolution: 'full' | 'half')
setLights(positions: Vector3[], colors: Color[], intensities: number[]): void
setFogParams(density: number, color: Color, anisotropy: number): void
setEnabled(enabled: boolean): void

// StructuralLights
constructor(scene: Scene, bridgeGroup: Group)
update(dt: number, timeState: TimeState, tier: Tier): void
setShadowEnabled(slot: number, enabled: boolean): void
getTowerLightPositions(): Vector3[]
dispose(): void
```

## User Controls

| Key | Action |
|-----|--------|
| `L` | Quality Tier 수동 전환 (Low → Medium → High → Auto) |
| `V` | Volumetric Fog 토글 (on/off) |
| `G` | God Rays 토글 (on/off) |

## Testing Strategy

- 각 모듈 독립 생성 후 scene에 추가하여 시각 확인
- QualityTier: 인위적 부하(많은 메시 추가)로 Tier 전환 확인
- 시간대 전환: TimeOfDay 키프레임별 조명 상태 스크린샷 비교
- 성능: Chrome DevTools Performance 탭으로 GPU 시간 측정
- 안개 + 조명: WeatherSystem fog 상태에서 Volumetric 효과 확인
