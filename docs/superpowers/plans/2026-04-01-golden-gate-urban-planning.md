# Golden Gate Bridge Urban Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a comprehensive urban planning design for an eco-tourism city centered on the Golden Gate Bridge, produced by 5 domain expert sub-agents and unified by an integration coordinator.

**Architecture:** 5 expert sub-agents (politics, economics, society, science, technology) run in parallel, each writing an independent analysis report to `docs/urban-planning/reports/`. An integration coordinator agent then reads all 5 reports, resolves conflicts, and produces the final masterplan, cinematic guide, and conflict resolution document in `docs/urban-planning/integration/`.

**Tech Stack:** Claude Code Agent tool (parallel sub-agent dispatch), Markdown documents

---

## File Structure

```
docs/urban-planning/
├── README.md                       # Project overview and reading guide
├── reports/
│   ├── politics-report.md          # Land use zoning, regulation, governance
│   ├── economics-report.md         # Tourism revenue, commercial, investment
│   ├── society-report.md           # Residential, amenities, culture, welfare
│   ├── science-report.md           # Ecology, energy, climate, beach conservation
│   └── technology-report.md        # Roads, transit, smart city, utilities
└── integration/
    ├── conflict-resolution.md      # Cross-domain conflict analysis and resolution
    ├── masterplan.md               # Unified city masterplan
    └── cinematic-guide.md          # Cinematic viewpoints and scene sequence
```

Each report file is self-contained: a reader should understand the expert's full analysis without needing the other reports. The integration documents reference the reports but stand alone as the final deliverables.

---

### Task 1: Create Output Directory Structure and README

**Files:**
- Create: `docs/urban-planning/README.md`
- Create: `docs/urban-planning/reports/` (directory)
- Create: `docs/urban-planning/integration/` (directory)

- [ ] **Step 1: Create directories**

```bash
mkdir -p docs/urban-planning/reports docs/urban-planning/integration
```

- [ ] **Step 2: Write README.md**

```markdown
# Golden Gate Bridge Eco-Tourism City — Urban Planning

## Overview

금문교를 중심축으로 한 자연 친화형 생태 관광도시 설계 문서.
5개 분야 전문가가 독립 분석한 결과를 통합 조정하여 최종 마스터플랜을 구성.

## 핵심 원칙

- 자연 친화형 생태도시 (싱가포르 가든시티 스타일)
- 시네마틱 관광 쇼케이스 (카메라 비행 시 영화 품질)
- 금문교 중심축 방사형 배치
- 해변 적극 활용
- 샌프란시스코와 무관한 독립 세계관

## 구역 배치

- **내부 링** (~500m): 관광·문화, 해변·수변, 생태공원 — 보행자 우선
- **외부 링** (~1.5km): 주거, 상업, 휴양, 교통 허브 — 순환도로 연결
- **해안축**: 해변~금문교 산책로 + 뷰포인트 체인

## 문서 구조

| 파일 | 내용 |
|------|------|
| `reports/politics-report.md` | 토지구역, 규제, 거버넌스 |
| `reports/economics-report.md` | 관광수익, 상업, 투자 |
| `reports/society-report.md` | 주거, 편의, 문화 |
| `reports/science-report.md` | 생태계, 에너지, 기후 |
| `reports/technology-report.md` | 도로, 교통, 스마트시티 |
| `integration/conflict-resolution.md` | 충돌 해소 보고 |
| `integration/masterplan.md` | 종합 마스터플랜 |
| `integration/cinematic-guide.md` | 시네마틱 가이드 |
```

- [ ] **Step 3: Verify structure**

```bash
find docs/urban-planning -type f -o -type d | sort
```

Expected:
```
docs/urban-planning
docs/urban-planning/README.md
docs/urban-planning/integration
docs/urban-planning/reports
```

- [ ] **Step 4: Commit**

```bash
git add docs/urban-planning/README.md
git commit -m "feat: add urban planning directory structure and README"
```

---

### Task 2: Run Politics Expert Sub-Agent

**Files:**
- Create: `docs/urban-planning/reports/politics-report.md`

**Agent type:** `general-purpose`

- [ ] **Step 1: Dispatch politics expert sub-agent**

Launch an Agent with the following prompt (run in parallel with Tasks 3-6):

```
You are a political science and urban governance expert analyzing land use for a new eco-tourism city.

## Context
- An eco-tourism city is being built from scratch around the Golden Gate Bridge
- The bridge is the central axis; all zones radiate outward from it
- The city is nature-friendly (Singapore Garden City style)
- Everything must look cinematic — this is a tourism showcase
- The city has NO connection to San Francisco — it's an independent world
- Beaches along the coastline must be actively utilized

## City Layout
- Inner Ring (~500m from bridge): Tourism/culture, beach/waterfront, eco-park zones — pedestrian priority, no vehicles
- Outer Ring (~1.5km): Residential, commercial, recreation, transit hub — connected by circular road
- Coastal Axis: Beach-to-bridge promenade with viewpoint chain

## Your Analysis Scope
1. **Land Use Zoning**: Define zone boundaries for each district. Specify permitted/prohibited uses per zone. Consider the radial layout — zones should fan out from the bridge.
2. **Regulatory Framework**: Environmental protection vs development balance. Building height limits (must not obstruct bridge views from key viewpoints). Green building requirements. Beach access and conservation regulations.
3. **Governance Model**: Public-private partnership structure for operating the tourism city. Park/beach management authority. Community governance for the residential zone.
4. **Tourism Operations Policy**: Visitor capacity limits per zone. Seasonal management. Entry/access policies for inner ring.
5. **Cinematic Recommendation**: Propose 2-3 public buildings with iconic, photogenic architectural forms that would look stunning from aerial camera flyovers. Describe their appearance, location, and symbolic meaning.

## Output Format
Write a complete report in Korean to: docs/urban-planning/reports/politics-report.md

Structure:
# 정치 전문가 분석 보고서

## 1. 토지 용도 구역 설정
(zone map with boundaries, permitted uses per zone)

## 2. 규제 프레임워크
(environmental protection, building codes, height limits, beach regulations)

## 3. 거버넌스 모델
(public-private structure, management authorities)

## 4. 관광지 운영 정책
(capacity, seasonal, access policies)

## 5. 공공기관 배치 제안
(locations and functions of public buildings)

## 6. 시네마틱 추천
(2-3 iconic public buildings for aerial cinematics)

Be specific and detailed. Use tables where appropriate. All content in Korean.
```

- [ ] **Step 2: Verify output exists and is substantive**

```bash
wc -l docs/urban-planning/reports/politics-report.md
```

Expected: 100+ lines of content.

- [ ] **Step 3: Commit**

```bash
git add docs/urban-planning/reports/politics-report.md
git commit -m "feat: add politics expert analysis report"
```

---

### Task 3: Run Economics Expert Sub-Agent

**Files:**
- Create: `docs/urban-planning/reports/economics-report.md`

**Agent type:** `general-purpose`

- [ ] **Step 1: Dispatch economics expert sub-agent**

Launch an Agent with the following prompt (run in parallel with Tasks 2, 4-6):

```
You are an urban economics and tourism industry expert analyzing the commercial viability of a new eco-tourism city.

## Context
- An eco-tourism city is being built from scratch around the Golden Gate Bridge
- The bridge is the central axis; all zones radiate outward from it
- Nature-friendly (Singapore Garden City style), cinematic tourism showcase
- Independent world — no connection to San Francisco
- Beaches actively utilized for tourism

## City Layout
- Inner Ring (~500m): Tourism/culture, beach/waterfront, eco-park — pedestrian only
- Outer Ring (~1.5km): Residential, commercial, recreation, transit hub — circular road
- Coastal Axis: Beach-to-bridge promenade with viewpoints

## Your Analysis Scope
1. **Tourism Revenue Model**: Categorize revenue sources (admission fees, experiences, lodging, dining, retail). Estimate relative importance of each. Propose pricing strategy aligned with eco-tourism positioning.
2. **Commercial Facility Planning**: Types of commercial facilities for each zone. Size and density recommendations. Mix of local/artisan vs chain establishments. Beach-specific commercial (surf shops, beach bars, seafood restaurants).
3. **Real Estate Value Analysis**: Value gradient from bridge (highest) to outer ring. Premium locations and why. Beach-front vs bridge-view value comparison.
4. **Infrastructure Investment Priority**: Phase 1 (essential), Phase 2 (growth), Phase 3 (optimization). Cost-benefit reasoning for prioritization.
5. **Tourism Flow Revenue Points**: Map the visitor journey through the city. Identify spending opportunities at each stage. Optimize the flow for both visitor experience and revenue.
6. **Cinematic Recommendation**: Propose 2-3 bustling commercial street scenes that would look vibrant and alive from aerial cameras. Describe the activity, lighting, and atmosphere.

## Output Format
Write a complete report in Korean to: docs/urban-planning/reports/economics-report.md

Structure:
# 경제 전문가 분석 보고서

## 1. 관광 수익 모델
(revenue categories, pricing, strategy)

## 2. 상업시설 배치안
(facility types per zone, density, beach commercial)

## 3. 부동산 가치 분석
(value gradient, premium locations)

## 4. 인프라 투자 우선순위
(phased investment roadmap)

## 5. 관광 동선별 수익 포인트
(visitor journey with spending opportunities)

## 6. 시네마틱 추천
(2-3 vibrant commercial scenes for aerial cinematics)

Be specific with numbers where possible. Use tables. All content in Korean.
```

- [ ] **Step 2: Verify output exists and is substantive**

```bash
wc -l docs/urban-planning/reports/economics-report.md
```

Expected: 100+ lines of content.

- [ ] **Step 3: Commit**

```bash
git add docs/urban-planning/reports/economics-report.md
git commit -m "feat: add economics expert analysis report"
```

---

### Task 4: Run Society Expert Sub-Agent

**Files:**
- Create: `docs/urban-planning/reports/society-report.md`

**Agent type:** `general-purpose`

- [ ] **Step 1: Dispatch society expert sub-agent**

Launch an Agent with the following prompt (run in parallel with Tasks 2-3, 5-6):

```
You are a social planning and community design expert analyzing residential and social infrastructure for a new eco-tourism city.

## Context
- An eco-tourism city is being built from scratch around the Golden Gate Bridge
- The bridge is the central axis; all zones radiate outward from it
- Nature-friendly (Singapore Garden City style), cinematic tourism showcase
- Independent world — no connection to San Francisco
- Beaches actively utilized

## City Layout
- Inner Ring (~500m): Tourism/culture, beach/waterfront, eco-park — pedestrian only
- Outer Ring (~1.5km): Residential, commercial, recreation, transit hub — circular road
- Coastal Axis: Beach-to-bridge promenade with viewpoints

## Your Analysis Scope
1. **Residential Community Design**: Eco-house types (green roofs, solar integration, natural materials). Community layout — clusters vs linear vs radial arrangement. Community gardens, shared spaces, neighborhood identity. How residential areas integrate with surrounding nature.
2. **Amenity Accessibility**: Healthcare facilities (clinic, pharmacy, emergency). Education (school, library, learning center). Daily needs (grocery, laundry, postal). Accessibility standards — every resident within 10-min walk of essentials.
3. **Cultural and Leisure Spaces**: Outdoor amphitheater, art installations along trails. Beach cultural programming (bonfires, festivals, markets). Gallery spaces integrated with nature. Community center and event spaces.
4. **Resident-Tourist Separation**: Design patterns that let residents live peacefully while tourists enjoy the city. Buffer zones, separate pathways, time-based access. Residential privacy without walled-off exclusion.
5. **Welfare Infrastructure**: Elderly care, childcare, community support. Emergency services. Accessibility for disabled visitors and residents.
6. **Cinematic Recommendation**: Propose 2-3 community life scenes that would feel warm and human from aerial cameras. Children playing in community gardens, neighbors on green-roof terraces, beach evening gatherings.

## Output Format
Write a complete report in Korean to: docs/urban-planning/reports/society-report.md

Structure:
# 사회 전문가 분석 보고서

## 1. 주거 커뮤니티 설계안
(eco-house types, layout, community spaces)

## 2. 편의시설 접근성
(healthcare, education, daily needs, accessibility)

## 3. 문화·여가 공간 설계
(amphitheater, art, beach culture, galleries)

## 4. 주민-관광객 동선 분리
(buffer zones, pathways, privacy design)

## 5. 복지 인프라
(elderly, childcare, emergency, accessibility)

## 6. 시네마틱 추천
(2-3 warm community life scenes for aerial cinematics)

Be specific about locations within the radial layout. All content in Korean.
```

- [ ] **Step 2: Verify output exists and is substantive**

```bash
wc -l docs/urban-planning/reports/society-report.md
```

Expected: 100+ lines of content.

- [ ] **Step 3: Commit**

```bash
git add docs/urban-planning/reports/society-report.md
git commit -m "feat: add society expert analysis report"
```

---

### Task 5: Run Science Expert Sub-Agent

**Files:**
- Create: `docs/urban-planning/reports/science-report.md`

**Agent type:** `general-purpose`

- [ ] **Step 1: Dispatch science expert sub-agent**

Launch an Agent with the following prompt (run in parallel with Tasks 2-4, 6):

```
You are an environmental scientist and ecological planner analyzing the natural systems for a new eco-tourism city.

## Context
- An eco-tourism city is being built from scratch around the Golden Gate Bridge
- The bridge is the central axis; all zones radiate outward from it
- Nature-friendly (Singapore Garden City style), cinematic tourism showcase
- Independent world — no connection to San Francisco
- Beaches and coastline are key assets to be actively utilized while preserved

## City Layout
- Inner Ring (~500m): Tourism/culture, beach/waterfront, eco-park — pedestrian only
- Outer Ring (~1.5km): Residential, commercial, recreation, transit hub — circular road
- Coastal Axis: Beach-to-bridge promenade with viewpoints

## Your Analysis Scope
1. **Coastal and Forest Ecosystem Conservation**: Identify ecosystem types around the bridge (coastal cliffs, tidal zones, fog forest, grassland). Define protection levels per area (strict preserve, managed recreation, developed). Wildlife corridors connecting green spaces. Beach ecosystem: dune preservation, tidal pool protection, marine life.
2. **Renewable Energy Plan**: Solar panel integration (building-integrated, solar roads, canopy arrays). Wind energy (coastal wind patterns, micro-turbines on buildings). Tidal/wave energy from the coastline. Energy self-sufficiency target and strategy.
3. **Terrain and Climate Analysis**: Fog patterns around the bridge (cinematic asset!). Wind corridors and their effect on building placement. Sun exposure mapping for solar optimization and comfortable outdoor spaces. Rainfall management and natural drainage.
4. **Beach Environment Management**: Beach zoning (swimming, surfing, conservation, events). Erosion prevention and sand management. Water quality monitoring. Seasonal beach conditions and programming.
5. **Green Infrastructure**: Living walls, green roofs, bioswales, rain gardens. Urban forest canopy coverage targets. Pollinator gardens and biodiversity corridors. Natural stormwater management system.
6. **Cinematic Recommendation**: Propose 2-3 nature-architecture harmony scenes. Examples: fog rolling through green-roofed buildings at dawn, sunlight filtering through forest canopy onto a trail, waves crashing against eco-designed seawalls with the bridge in background.

## Output Format
Write a complete report in Korean to: docs/urban-planning/reports/science-report.md

Structure:
# 과학 전문가 분석 보고서

## 1. 해안·산림 생태계 보전 전략
(ecosystem types, protection levels, wildlife corridors, beach ecosystem)

## 2. 재생에너지 계획
(solar, wind, tidal, self-sufficiency target)

## 3. 지형·기후 분석
(fog, wind, sun, rainfall)

## 4. 해변 환경관리
(beach zoning, erosion, water quality, seasonal)

## 5. 그린 인프라
(living walls, urban forest, bioswales, biodiversity)

## 6. 시네마틱 추천
(2-3 nature-architecture harmony scenes)

Use scientific reasoning. Be specific about locations in the radial layout. All content in Korean.
```

- [ ] **Step 2: Verify output exists and is substantive**

```bash
wc -l docs/urban-planning/reports/science-report.md
```

Expected: 100+ lines of content.

- [ ] **Step 3: Commit**

```bash
git add docs/urban-planning/reports/science-report.md
git commit -m "feat: add science expert analysis report"
```

---

### Task 6: Run Technology Expert Sub-Agent

**Files:**
- Create: `docs/urban-planning/reports/technology-report.md`

**Agent type:** `general-purpose`

- [ ] **Step 1: Dispatch technology expert sub-agent**

Launch an Agent with the following prompt (run in parallel with Tasks 2-5):

```
You are an urban technology and infrastructure engineer designing the road network and smart city systems for a new eco-tourism city.

## Context
- An eco-tourism city is being built from scratch around the Golden Gate Bridge
- The bridge is the central axis; all zones radiate outward from it
- Nature-friendly (Singapore Garden City style), cinematic tourism showcase
- Independent world — no connection to San Francisco
- Beaches actively utilized

## City Layout
- Inner Ring (~500m): Tourism/culture, beach/waterfront, eco-park — pedestrian only, NO vehicles
- Outer Ring (~1.5km): Residential, commercial, recreation, transit hub — circular road connects all
- Coastal Axis: Beach-to-bridge promenade with viewpoints

## Your Analysis Scope
1. **Radial Road Network**: Primary circular road connecting outer ring zones. Radial spoke roads from circular road toward bridge (ending at inner ring boundary). Pedestrian-only paths within inner ring. Beach access roads and coastal path. Road materials (permeable surfaces, solar roads where viable).
2. **Green Transit System**: Tram/light rail route along the circular road. Electric shuttle from transit hub to inner ring drop-off points. Bicycle network (dedicated lanes, bike-share stations). EV charging infrastructure. Water taxi / ferry service along coastline.
3. **Smart City Infrastructure**: IoT sensor network (air quality, noise, crowd density, weather). Smart lighting (adaptive, warm tone, dark-sky compliant). Digital wayfinding and AR tourist guides. Real-time visitor flow management. Emergency alert system.
4. **Utility Networks**: Water supply and treatment (rainwater harvesting integration). Power grid (connection to renewable sources from science report). Telecommunications (fiber, 5G coverage). Waste management (underground pneumatic collection, composting).
5. **Beach Infrastructure**: Boardwalks and access points. Lifeguard stations. Shower/changing facilities. Lighting for evening beach use (turtle-safe, warm tone).
6. **Cinematic Recommendation**: Propose 2-3 transportation scenes that convey eco-modernity. Examples: a sleek tram gliding along the tree-lined circular road, cyclists on a coastal bike path with the bridge behind them, an electric ferry approaching a waterfront dock at sunset.

## Output Format
Write a complete report in Korean to: docs/urban-planning/reports/technology-report.md

Structure:
# 기술 전문가 분석 보고서

## 1. 방사형 도로망 설계
(circular road, radial spokes, pedestrian paths, materials)

## 2. 친환경 교통 시스템
(tram, shuttle, bicycle, EV, ferry)

## 3. 스마트시티 인프라
(IoT, lighting, wayfinding, crowd management)

## 4. 유틸리티 네트워크
(water, power, telecom, waste)

## 5. 해변 인프라
(boardwalks, lifeguard, facilities, lighting)

## 6. 시네마틱 추천
(2-3 eco-modern transportation scenes)

Be specific about dimensions, materials, and locations. Use tables. All content in Korean.
```

- [ ] **Step 2: Verify output exists and is substantive**

```bash
wc -l docs/urban-planning/reports/technology-report.md
```

Expected: 100+ lines of content.

- [ ] **Step 3: Commit**

```bash
git add docs/urban-planning/reports/technology-report.md
git commit -m "feat: add technology expert analysis report"
```

---

### Task 7: Run Integration Coordinator Agent

**Files:**
- Create: `docs/urban-planning/integration/conflict-resolution.md`
- Create: `docs/urban-planning/integration/masterplan.md`
- Create: `docs/urban-planning/integration/cinematic-guide.md`

**Agent type:** `general-purpose`

**Depends on:** Tasks 2-6 must be complete before this task starts.

- [ ] **Step 1: Dispatch integration coordinator agent**

Launch an Agent with the following prompt:

```
You are the integration coordinator for an eco-tourism city urban planning project. 5 domain experts have completed their independent analyses. Your job is to read all 5 reports, resolve conflicts, and produce 3 integration documents.

## Read These Reports First
1. docs/urban-planning/reports/politics-report.md
2. docs/urban-planning/reports/economics-report.md
3. docs/urban-planning/reports/society-report.md
4. docs/urban-planning/reports/science-report.md
5. docs/urban-planning/reports/technology-report.md

## City Context
- Golden Gate Bridge is the central axis of a radial eco-tourism city
- Nature-friendly (Singapore Garden City style)
- Cinematic tourism showcase — everything must look like a movie from aerial cameras
- Beaches are a key asset
- Independent world, no connection to San Francisco

## Conflict Resolution Priority (highest first)
1. Cinematic tourism value (top priority)
2. Ecological conservation
3. Resident quality of life
4. Economic efficiency
5. Technical feasibility

## Document 1: Conflict Resolution Report
Write to: docs/urban-planning/integration/conflict-resolution.md

Structure:
# 충돌 해소 보고서

## 발견된 충돌 목록
(list each conflict between expert reports)

For each conflict:
### 충돌 N: [Title]
- **관련 분야**: (which experts conflict)
- **충돌 내용**: (what they disagree on)
- **해소 방안**: (how to resolve, citing priority order)
- **최종 결정**: (the decision made)

## Document 2: Unified Masterplan
Write to: docs/urban-planning/integration/masterplan.md

Structure:
# 금문교 생태관광도시 종합 마스터플랜

## 도시 비전
(one paragraph synthesizing the city's identity)

## 구역별 최종 설계
For each zone (tourism/culture, beach/waterfront, eco-park, residential, commercial, recreation, transit hub):
### [Zone Name]
- **위치**: (location in radial layout)
- **핵심 시설**: (key facilities — synthesized from all experts)
- **규제 사항**: (from politics)
- **경제 모델**: (from economics)
- **생태 고려**: (from science)
- **인프라**: (from technology)
- **주민/관광객 동선**: (from society)

## 도로 및 교통 종합
(unified road and transit map synthesizing technology + politics + society)

## 해변 종합 활용 계획
(synthesize beach plans from all 5 experts into one coherent beach strategy)

## 에너지 및 유틸리티
(from science + technology)

## Document 3: Cinematic Guide
Write to: docs/urban-planning/integration/cinematic-guide.md

Structure:
# 시네마틱 관광 가이드

## 7대 장면 시퀀스
For each scene:
### Scene N: [Title]
- **카메라 위치/경로**: (where the camera is, how it moves)
- **주요 피사체**: (what's in frame)
- **시간대**: (time of day for best light)
- **날씨 조건**: (weather for mood — fog, clear, golden hour)
- **관련 구역**: (which zones are visible)
- **경관 요소**: (natural + artificial elements in the shot)

Scenes:
1. 금문교 전경 — 해변 일출
2. 다리 위 비행 — 도시 진입
3. 생태공원 저공비행
4. 해변 스위프
5. 주거 커뮤니티 전경
6. 상업거리 활기
7. 금문교 석양 피날레

## 핵심 경관 요소 카탈로그
(consolidated list of all cinematic recommendations from the 5 experts, organized by natural vs artificial)

## 시간대별 촬영 가이드
(best times for each type of shot: dawn, morning, noon, golden hour, sunset, night)

All content in Korean. Be specific and vivid in descriptions — this guides 3D scene creation.
```

- [ ] **Step 2: Verify all 3 integration documents exist**

```bash
wc -l docs/urban-planning/integration/conflict-resolution.md
wc -l docs/urban-planning/integration/masterplan.md
wc -l docs/urban-planning/integration/cinematic-guide.md
```

Expected: Each file 80+ lines.

- [ ] **Step 3: Commit**

```bash
git add docs/urban-planning/integration/
git commit -m "feat: add integration documents — masterplan, conflict resolution, cinematic guide"
```

---

### Task 8: Final Review and Quality Check

**Files:**
- Read: All files in `docs/urban-planning/`

- [ ] **Step 1: Verify all 8 documents exist**

```bash
find docs/urban-planning -name "*.md" | sort
```

Expected:
```
docs/urban-planning/README.md
docs/urban-planning/integration/cinematic-guide.md
docs/urban-planning/integration/conflict-resolution.md
docs/urban-planning/integration/masterplan.md
docs/urban-planning/reports/economics-report.md
docs/urban-planning/reports/politics-report.md
docs/urban-planning/reports/science-report.md
docs/urban-planning/reports/society-report.md
docs/urban-planning/reports/technology-report.md
```

- [ ] **Step 2: Check for consistency across documents**

Read each integration document and verify:
- Masterplan references all 5 expert reports
- Conflict resolution identifies real conflicts (not fabricated ones)
- Cinematic guide covers all 7 scenes with specific details
- Beach is prominently featured across documents
- All zones from the radial layout are covered

- [ ] **Step 3: Check for completeness**

Each expert report should have:
- All 6 sections as specified
- Tables where appropriate
- Specific locations referencing the radial layout
- A cinematic recommendation section

- [ ] **Step 4: Final commit if any fixes were made**

```bash
git add docs/urban-planning/
git commit -m "fix: address review feedback in urban planning documents"
```

---

## Execution Notes

### Parallelism

Tasks 2-6 (the 5 expert sub-agents) MUST be launched in parallel — dispatch all 5 Agent calls in a single message. This is the core architectural decision: independent parallel analysis.

Task 7 (integration) MUST wait for all 5 to complete before starting.

Task 8 (review) MUST wait for Task 7 to complete.

### Agent Configuration

All expert sub-agents use `general-purpose` agent type. Each agent writes its report directly to the specified file path using the Write tool. The integration agent reads all 5 reports using the Read tool before writing its documents.
