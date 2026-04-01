# Road System 3D Implementation Design Spec

## Overview

금문교 생태관광도시의 도로 시스템을 Three.js로 구현. 마스터플랜 수치 기반(1 unit = 1m), 하이 디테일, 정적 지오메트리만 포함 (동적 요소는 별도 서브프로젝트).

### 핵심 원칙

- 마스터플랜 실제 치수 사용 (금문교 스케일: mainSpan=1280m, towerH=227m과 동일 단위)
- 하이 디테일: 차선 표시, 재질 변화, 트램 레일, 자전거 전용 색상 구분
- 정적 지오메트리만 (트램/자전거 애니메이션은 다음 서브프로젝트)
- 기존 코드 패턴 준수 (build/update 인터페이스, InstancedMesh 활용)

### 산출물

`src/roads/` 디렉토리에 7개 TypeScript 파일

---

## 모듈 아키텍처

### 파일 구조

```
src/roads/
├── RoadSystem.ts       — 엔트리포인트, 모든 모듈 조합
├── CircularRoad.ts     — 외부 링 순환도로
├── RadialRoads.ts      — 8개 방사형 도로
├── PedestrianPaths.ts  — 내부 링 보행자 도로
├── CoastalPath.ts      — 해안 산책로 + 뷰포인트 데크
├── RoadFurniture.ts    — 가로수, 가로등, 트램 레일, 벤치 등
└── config.ts           — 치수, 색상, 재질 상수
```

### 모듈 인터페이스

모든 도로 모듈은 동일한 패턴:

```typescript
class ModuleName {
  build(scene: THREE.Scene): void  // 지오메트리 생성 및 scene에 추가
  update(dt: number): void         // 미래 확장용 (현재는 noop)
}
```

### RoadSystem (엔트리포인트)

```typescript
class RoadSystem {
  private circular: CircularRoad;
  private radials: RadialRoads;
  private pedestrian: PedestrianPaths;
  private coastal: CoastalPath;
  private furniture: RoadFurniture;

  build(scene: THREE.Scene): void   // 모든 모듈의 build 호출
  update(dt: number): void          // 모든 모듈의 update 호출
}
```

### main.ts 통합

```typescript
const roads = new RoadSystem();
roads.build(sm.scene);
loop.register((dt) => roads.update(dt));
```

---

## 도로 치수 상세

### 1. CircularRoad — 외부 링 순환도로

| 항목 | 값 |
|------|-----|
| 반경 | 1,500m (금문교 중심에서) |
| 총 폭 | 22m |
| 차도 | 왕복 4차선 (3.5m × 4 = 14m) |
| 자전거도로 | 양쪽 2m × 2 = 4m (녹색 포장) |
| 보도 | 양쪽 2m × 2 = 4m |
| 둘레 | ~9,420m |
| 포장 재질 | 투수성 아스팔트 (짙은 회색) |
| 형태 | 금문교 중심으로 완전한 원형 |

**단면 (외측 → 내측):**
보도(2m) | 자전거(2m) | 차도(3.5m) | 차도(3.5m) | 중앙분리대 | 차도(3.5m) | 차도(3.5m) | 자전거(2m) | 보도(2m)

**구현 방식:**
- `THREE.RingGeometry` 또는 커스텀 원형 ExtrudeGeometry
- 차도/자전거/보도를 별도 머티리얼로 구분
- 중앙분리대: 노란 실선 (PlaneGeometry, 얇은 스트립)
- 약간의 높이차: 보도 +0.15m, 자전거도로 +0.05m (연석 표현)

### 2. RadialRoads — 방사형 도로

| 항목 | 값 |
|------|-----|
| 개수 | 8개 (45° 간격) |
| 시작점 | R=500m (내부 링 경계) |
| 끝점 | R=1,500m (순환도로 연결) |
| 길이 | 1,000m |
| 총 폭 | 14m |
| 차도 | 왕복 2차선 (3.5m × 2 = 7m) |
| 자전거+보도 | 양쪽 3.5m × 2 = 7m |
| 포장 | 투수성 아스팔트 |

**구현 방식:**
- 8개의 직선 PlaneGeometry (또는 BufferGeometry)
- 금문교 중심에서 45° 간격으로 방사
- 순환도로와의 교차점에서 부드러운 연결 (radius fillet 불필요 — 직선 연결)

### 3. PedestrianPaths — 내부 링 보행자 도로

| 항목 | 값 |
|------|-----|
| 구역 | 내부 링 (R=0 ~ 500m) |
| 주 보행로 폭 | 4m |
| 산책로 폭 | 2.5m |
| 재질 | 투수성 블록, 재활용 목재 데크, 자연석 |
| 색상 | 따뜻한 베이지/테라코타 (차도와 구분) |
| 패턴 | 금문교에서 방사형으로 뻗어나가는 곡선형 경로 |

**구현 방식:**
- 금문교에서 뻗어나가는 6~8개의 곡선형 경로 (CatmullRomCurve3 → TubeGeometry 또는 ExtrudeGeometry)
- 베이지/테라코타 MeshStandardMaterial
- 약간 높이를 올려 지면과 구분 (+0.05m)

### 4. CoastalPath — 해안 산책로

| 항목 | 값 |
|------|-----|
| 길이 | 6,500m |
| 폭 | 6m (재활용 HDPE 보드워크) |
| 뷰포인트 데크 | 8개소, ~800m 간격, 10m × 8m |
| 난간 | 스테인리스 와이어 + 목재 핸드레일 |
| 조명 | 앰버 LED 볼라드, 15m 간격 |
| 색상 | 목재 톤 (따뜻한 갈색) |

**구현 방식:**
- 해안선을 따르는 CatmullRomCurve3 경로
- ExtrudeGeometry로 보드워크 표면 생성
- 8개 뷰포인트: BoxGeometry 확장 플랫폼 (10m × 8m)
- 난간: 얇은 실린더 지오메트리 (InstancedMesh)

---

## RoadFurniture — 도로 장식

### 가로수

| 위치 | 간격 | 수종 표현 |
|------|------|----------|
| 순환도로 보도 외측 | 15m | 12m 높이 활엽수 (구형 캐노피) |
| 방사형 도로 보도 | 20m | 10m 높이 활엽수 |

- InstancedMesh 사용 (수백 개 효율적 렌더링)
- 트렁크: CylinderGeometry (갈색)
- 캐노피: SphereGeometry 또는 IcosahedronGeometry (녹색, 약간 불규칙)

### 가로등

| 위치 | 간격 | 높이 |
|------|------|------|
| 순환도로 | 25m | 6m |
| 해안 산책로 | 15m | 1m (볼라드) |

- InstancedMesh 사용
- 순환도로: CylinderGeometry 기둥 + SphereGeometry 등갓
- 산책로: 짧은 볼라드형
- PointLight는 성능상 생략, emissive material로 발광 표현

### 트램 레일

| 위치 | 규격 |
|------|------|
| 순환도로 외측 차선 | 표준궤 1.435m 간격, 표면 +0.02m |

- 순환도로를 따르는 두 줄의 얇은 ExtrudeGeometry (은색 메탈릭)

### 차선 표시

| 유형 | 색상 | 규격 |
|------|------|------|
| 중앙분리선 | 노란색 | 실선, 폭 0.15m |
| 차선 구분 | 흰색 | 점선 (3m 표시, 5m 간격), 폭 0.1m |
| 자전거도로 | 녹색 | 전체 면 포장 |

- PlaneGeometry 스트립, 도로 표면에서 +0.01m

### 벤치

| 위치 | 간격 | 규격 |
|------|------|------|
| 해안 산책로 | 50m | 1.5m × 0.5m × 0.45m |
| 뷰포인트 데크 | 데크당 4개 | 동일 |

- InstancedMesh, 재활용 목재 색상

### 볼라드

| 위치 | 간격 | 규격 |
|------|------|------|
| 내부 링 진입점 (8개소) | 1.5m | 높이 1m, 직경 0.15m |

- CylinderGeometry, 스테인리스 스틸 색상

---

## config.ts — 상수 정의

```typescript
export const ROAD = {
  circularRadius: 1500,
  circularWidth: 22,
  laneWidth: 3.5,
  bikeLaneWidth: 2,
  sidewalkWidth: 2,
  radialCount: 8,
  radialWidth: 14,
  radialInnerR: 500,
  radialOuterR: 1500,
  pedestrianMainWidth: 4,
  pedestrianTrailWidth: 2.5,
  coastalLength: 6500,
  coastalWidth: 6,
  viewpointCount: 8,
  viewpointSize: { w: 10, d: 8 },
} as const;

export const ROAD_COLORS = {
  asphalt: 0x333333,
  bikeLane: 0x2d6a4f,
  sidewalk: 0x888888,
  pedestrian: 0xc4a882,    // 베이지/테라코타
  boardwalk: 0x8b6914,     // 목재 톤
  centerLine: 0xffd700,    // 노란색
  laneLine: 0xffffff,      // 흰색
  tramRail: 0xaaaaaa,      // 은색
  bollard: 0xcccccc,       // 스테인리스
} as const;

export const FURNITURE = {
  treeSpacingCircular: 15,
  treeSpacingRadial: 20,
  treeHeight: 12,
  treeTrunkH: 4,
  treeCanopyR: 4,
  lightSpacingCircular: 25,
  lightHeight: 6,
  bollardSpacingCoastal: 15,
  bollardHeight: 1,
  benchSpacing: 50,
  benchesPerViewpoint: 4,
  tramGauge: 1.435,
} as const;
```

---

## 성능 고려사항

- **InstancedMesh**: 가로수, 가로등, 벤치, 볼라드 등 반복 오브젝트는 모두 InstancedMesh로 렌더링
- **LOD 불필요**: 현재 스코프에서는 단일 디테일 레벨 사용
- **머티리얼 공유**: 동일 재질의 오브젝트는 머티리얼 인스턴스 공유
- **지오메트리 병합**: 차선 표시 등 작은 오브젝트는 가능한 경우 BufferGeometry로 병합
